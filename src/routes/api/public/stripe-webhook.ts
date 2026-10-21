import { createFileRoute } from "@tanstack/react-router";

const SUB_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
]);

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        if (!secret) return new Response("Webhook not configured", { status: 503 });
        const payload = await request.text();
        const { verifyStripeSignature, saveSubscription, stripe } = await import("@/lib/stripe.server");
        if (!(await verifyStripeSignature(payload, request.headers.get("stripe-signature"), secret))) {
          return new Response("Invalid signature", { status: 400 });
        }
        let event: { id: string; type: string; data: { object: Record<string, unknown> } };
        try {
          event = JSON.parse(payload) as typeof event;
          if (!event.id || !event.type || !event.data?.object) throw new Error("Invalid event payload");
        } catch {
          return new Response("Invalid event payload", { status: 400 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Idempotency: skip events already processed.
        const { error: insertError } = await supabaseAdmin.from("stripe_events").insert({ id: event.id, type: event.type });
        if (insertError?.code === "23505") return new Response("ok (duplicate)");
        if (insertError) {
          console.error("stripe webhook event could not be recorded", insertError.message);
          return new Response("Event could not be recorded", { status: 500 });
        }

        try {
          let subId: string | null = null;
          if (SUB_EVENTS.has(event.type)) subId = event.data.object["id"] as string;
          else if (event.type === "checkout.session.completed" || event.type.startsWith("invoice.")) {
            subId = (event.data.object["subscription"] as string | null) ?? null;
          }
          if (subId) {
            // Re-fetch the subscription so we always store Stripe's current state.
            const sub = await stripe<import("@/lib/stripe.server").StripeSubscription>("GET", `/subscriptions/${subId}`);
            let userId = sub.metadata?.["user_id"];
            if (!userId) {
              const { data } = await supabaseAdmin.from("subscriptions").select("user_id").eq("stripe_customer_id", sub.customer).maybeSingle();
              userId = data?.user_id;
            }
            if (userId) await saveSubscription(userId, sub);
          }
        } catch (e) {
          await supabaseAdmin.from("stripe_events").delete().eq("id", event.id);
          console.error("stripe webhook failed", e);
          return new Response("Processing failed", { status: 500 });
        }
        return new Response("ok");
      },
    },
  },
});
