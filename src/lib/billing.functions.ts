import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BillingStatus = {
  premium: boolean;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasCustomer: boolean;
  configured: boolean;
};

function appOrigin() {
  const req = getRequest();
  const origin = req.headers.get("origin");
  return origin ?? new URL(req.url).origin;
}

export const getBillingStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BillingStatus> => {
    const { data } = await context.supabase.from("subscriptions").select("*").eq("user_id", context.userId).maybeSingle();
    const { data: premium } = await context.supabase.rpc("is_premium", { _user_id: context.userId });
    return {
      premium: !!premium,
      status: data?.status ?? "none",
      currentPeriodEnd: data?.current_period_end ?? null,
      cancelAtPeriodEnd: data?.cancel_at_period_end ?? false,
      hasCustomer: !!data?.stripe_customer_id,
      configured: !!process.env["STRIPE_SECRET_KEY"],
    };
  });

export const startCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { stripe, premiumPriceId } = await import("./stripe.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: premium } = await context.supabase.rpc("is_premium", { _user_id: context.userId });
    if (premium) return { url: null, error: "You already have Premium." };

    const { data: row } = await supabaseAdmin.from("subscriptions").select("stripe_customer_id").eq("user_id", context.userId).maybeSingle();
    let customer = row?.stripe_customer_id ?? null;
    if (!customer) {
      const email = (context.claims as { email?: string }).email;
      const c = await stripe<{ id: string }>("POST", "/customers", { email, "metadata[user_id]": context.userId }, `customer-${context.userId}`);
      customer = c.id;
      await supabaseAdmin.from("subscriptions").upsert({ user_id: context.userId, stripe_customer_id: customer, updated_at: new Date().toISOString() });
    }

    const origin = appOrigin();
    const price = await premiumPriceId();
    const session = await stripe<{ url: string }>("POST", "/checkout/sessions", {
      mode: "subscription",
      customer,
      client_reference_id: context.userId,
      "line_items[0][price]": price,
      "line_items[0][quantity]": 1,
      "subscription_data[metadata][user_id]": context.userId,
      success_url: `${origin}/app?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/app?checkout=cancelled`,
    });
    return { url: session.url, error: null as string | null };
  });

/** Confirms a returning checkout by asking Stripe directly — never trusts the URL alone. */
export const confirmCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string }) => z.object({ sessionId: z.string().regex(/^cs_(test|live)_[A-Za-z0-9]+$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const { stripe, saveSubscription } = await import("./stripe.server");
    type Sess = { client_reference_id: string | null; status: string; subscription: import("./stripe.server").StripeSubscription | null };
    const s = await stripe<Sess>("GET", `/checkout/sessions/${data.sessionId}`, { "expand[]": "subscription" });
    if (s.client_reference_id !== context.userId) return { premium: false };
    if (s.status === "complete" && s.subscription) await saveSubscription(context.userId, s.subscription);
    const { data: premium } = await context.supabase.rpc("is_premium", { _user_id: context.userId });
    return { premium: !!premium };
  });

export const openBillingPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { stripe } = await import("./stripe.server");
    const { data } = await context.supabase.from("subscriptions").select("stripe_customer_id").eq("user_id", context.userId).maybeSingle();
    if (!data?.stripe_customer_id) return { url: null, error: "No billing account yet." };
    const s = await stripe<{ url: string }>("POST", "/billing_portal/sessions", {
      customer: data.stripe_customer_id,
      return_url: `${appOrigin()}/account`,
    });
    return { url: s.url, error: null as string | null };
  });
