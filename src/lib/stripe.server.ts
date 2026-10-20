// Server-only Stripe helpers. Uses the Stripe REST API with fetch (Worker-safe).
export const PREMIUM_LOOKUP_KEY = "pitchiq_premium_monthly";
export const PREMIUM_AMOUNT_CENTS = 999;
export const ACTIVE_STATUSES = ["active", "trialing"];

function key() {
  const k = process.env["STRIPE_SECRET_KEY"];
  if (!k) throw new Error("Payments are not configured yet.");
  if (k.startsWith("sk_live_") || k.startsWith("rk_live_")) {
    throw new Error("Live Stripe keys are disabled until the test flow is approved.");
  }
  return k;
}

function encode(params: Record<string, string | number | boolean | undefined>) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) body.append(k, String(v));
  return body;
}

export async function stripe<T = Record<string, unknown>>(
  method: "GET" | "POST",
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
  idempotencyKey?: string,
): Promise<T> {
  const qs = method === "GET" ? `?${encode(params).toString()}` : "";
  const headers: Record<string, string> = { Authorization: `Bearer ${key()}` };
  if (method === "POST") headers["Content-Type"] = "application/x-www-form-urlencoded";
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const res = await fetch(`https://api.stripe.com/v1${path}${qs}`, {
    method,
    headers,
    body: method === "POST" ? encode(params) : undefined,
  });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `Stripe error (${res.status})`);
  return json;
}

let cachedPrice: string | null = null;

/** Finds the $9.99/month Premium price by lookup key, creating it once if missing. */
export async function premiumPriceId(): Promise<string> {
  if (cachedPrice) return cachedPrice;
  const list = await stripe<{ data: { id: string; unit_amount: number; recurring: { interval: string } | null }[] }>(
    "GET",
    "/prices",
    { "lookup_keys[]": PREMIUM_LOOKUP_KEY, active: true, limit: 1 },
  );
  const found = list.data.find((p) => p.unit_amount === PREMIUM_AMOUNT_CENTS && p.recurring?.interval === "month");
  if (found) return (cachedPrice = found.id);
  const product = await stripe<{ id: string }>("POST", "/products", { name: "PitchIQ Premium" }, "pitchiq-premium-product-v1");
  const price = await stripe<{ id: string }>(
    "POST",
    "/prices",
    {
      product: product.id,
      currency: "usd",
      unit_amount: PREMIUM_AMOUNT_CENTS,
      "recurring[interval]": "month",
      lookup_key: PREMIUM_LOOKUP_KEY,
    },
    "pitchiq-premium-price-v1",
  );
  return (cachedPrice = price.id);
}

export type StripeSubscription = {
  id: string;
  customer: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_end?: number;
  metadata?: Record<string, string>;
  items?: { data: { current_period_end?: number }[] };
};

/** Writes the verified Stripe subscription state for a user. */
export async function saveSubscription(userId: string, sub: StripeSubscription) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const end = sub.current_period_end ?? sub.items?.data[0]?.current_period_end;
  const { error } = await supabaseAdmin.from("subscriptions").upsert({
    user_id: userId,
    stripe_customer_id: sub.customer,
    stripe_subscription_id: sub.id,
    status: sub.status,
    cancel_at_period_end: sub.cancel_at_period_end,
    current_period_end: end ? new Date(end * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

/** Verifies a Stripe-Signature header (v1 HMAC-SHA256, 5 min tolerance). */
export async function verifyStripeSignature(payload: string, header: string | null, secret: string) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = Number(parts["t"]);
  const sigs = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!t || !sigs.length || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = hex(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(`${t}.${payload}`)));
  return sigs.some((s) => s.length === expected.length && timingSafe(s, expected));
}

function timingSafe(a: string, b: string) {
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
