import { Suspense, lazy } from "react";
import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";

const WhopCheckoutEmbed = lazy(() =>
  import("@whop/checkout/react").then((m) => ({ default: m.WhopCheckoutEmbed })),
);

export const Route = createFileRoute("/abonnement")({
  head: () => ({
    meta: [
      { title: "PitchIQ Premium — Subscribe" },
      { name: "description", content: "Subscribe to PitchIQ Premium: unlimited AI match analyses for $9.99/month." },
      { property: "og:title", content: "PitchIQ Premium — Subscribe" },
      { property: "og:description", content: "Unlimited AI match analyses for $9.99/month." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Abonnement,
});

function CheckoutFallback() {
  return (
    <div className="flex h-96 w-full items-center justify-center rounded-2xl bg-card font-mono text-xs tracking-[0.25em] text-muted-foreground">
      LOADING SECURE CHECKOUT…
    </div>
  );
}

function Abonnement() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader live={null} />
      <main className="mx-auto flex max-w-3xl flex-col items-center px-6 py-16 text-center">
        <p className="eyebrow text-[10px]">PitchIQ Premium</p>
        <h1 className="display mt-3 text-4xl md:text-5xl">
          Premium — $9.99<span className="text-xl text-muted-foreground">/month</span>
        </h1>
        <p className="mt-3 text-muted-foreground">Unlimited match analyses • Cancel anytime</p>
        <div className="mt-10 w-full max-w-md rounded-2xl bg-card p-2">
          <ClientOnly fallback={<CheckoutFallback />}>
            <Suspense fallback={<CheckoutFallback />}>
              <WhopCheckoutEmbed
                planId="plan_H0nj57WQCkVEk"
                returnUrl="https://pitchiq-matchday-atlas.lovable.app/success"
                theme="light"
              />
            </Suspense>
          </ClientOnly>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Secure payment. Predictions are estimates, not guaranteed outcomes.
        </p>
      </main>
    </div>
  );
}
