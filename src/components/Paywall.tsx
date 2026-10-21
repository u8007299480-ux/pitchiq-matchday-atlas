import { useState } from "react";
import { Check, Lock } from "lucide-react";
import { signInWithGoogle } from "@/hooks/useSession";
import { startCheckout } from "@/lib/billing.functions";

export function Paywall({ signedIn, returnTo }: { signedIn: boolean; returnTo: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subscribe() {
    setBusy(true);
    setError(null);
    try {
      const r = await startCheckout();
      if (r.url) window.location.href = r.url;
      else setError(r.error ?? "Checkout is unavailable right now.");
    } catch (e) {
      setError((e as Error).message || "Checkout is unavailable right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="py-4 text-center">
      <Lock className="mx-auto h-10 w-10 text-primary" />
      <p className="eyebrow mt-4 text-[10px]">PitchIQ Premium</p>
      <h2 className="display mt-2 text-3xl">Unlock every match analysis</h2>
      <p className="mt-3 font-display text-4xl font-extrabold">
        $9.99<span className="text-base font-medium text-muted-foreground"> / month</span>
      </p>
      <ul className="mx-auto mt-6 max-w-sm space-y-2 text-left text-sm">
        {["Win / draw / loss probabilities", "Next official meeting with kickoff time", "Recent form and head-to-head history", "Cancel anytime"].map((t) => (
          <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> {t}</li>
        ))}
      </ul>
      {signedIn ? (
        <button className="btn-primary mx-auto mt-6 w-full max-w-sm" onClick={subscribe} disabled={busy}>
          {busy ? "Opening checkout…" : "Subscribe to Premium"}
        </button>
      ) : (
        <button className="btn-primary mx-auto mt-6 w-full max-w-sm" onClick={() => void signInWithGoogle(returnTo)}>
          Sign in with Google to subscribe
        </button>
      )}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <p className="mt-4 text-xs text-muted-foreground">Secure payment by Stripe. Predictions are estimates, not guaranteed outcomes.</p>
    </div>
  );
}
