import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";

const WHOP_CHECKOUT_URL =
  "https://whop.com/checkout/plan_H0nj57WQCkVEk?returnUrl=https://pitchiq-matchday-atlas.lovable.app/success";

export const Route = createFileRoute("/abonnement")({
  head: () => ({
    meta: [
      { title: "PitchIQ Premium — Subscribe" },
      {
        name: "description",
        content: "Subscribe to PitchIQ Premium: unlimited AI match analyses for $9.99/month.",
      },
      { property: "og:title", content: "PitchIQ Premium — Subscribe" },
      {
        property: "og:description",
        content: "Unlimited AI match analyses for $9.99/month.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Abonnement,
});

function Abonnement() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader live={null} />
      <main className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
        <p className="eyebrow text-[10px]">PitchIQ Premium</p>
        <h1 className="display mt-3 text-4xl md:text-5xl">
          Premium — $9.99<span className="text-xl text-muted-foreground">/month</span>
        </h1>
        <p className="mt-3 text-muted-foreground">
          Unlimited match analyses • Cancel anytime
        </p>

        <div className="mt-10 w-full rounded-2xl border border-border bg-card p-8">
          <ul className="space-y-3 text-left text-sm text-muted-foreground">
            <li className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              Unlimited AI match analyses
            </li>
            <li className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              Fixture calendar with kickoff times in your timezone
            </li>
            <li className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              Historical results and head-to-head comparisons
            </li>
          </ul>

          <button
            type="button"
            onClick={() => {
              window.location.href = WHOP_CHECKOUT_URL;
            }}
            className="btn-primary mt-8 w-full"
          >
            S'abonner - 9,99$/mois
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Secure payment via Whop. Predictions are estimates, not guaranteed outcomes.
        </p>
      </main>
    </div>
  );
}
