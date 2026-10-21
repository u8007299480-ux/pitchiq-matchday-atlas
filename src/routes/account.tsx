import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { Paywall } from "@/components/Paywall";
import { signInWithGoogle, useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { getBillingStatus, openBillingPortal, type BillingStatus } from "@/lib/billing.functions";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Account & Billing — PitchIQ" },
      { name: "description", content: "See your PitchIQ plan and manage your Premium subscription." },
      { property: "og:title", content: "Account & Billing — PitchIQ" },
      { property: "og:description", content: "Your PitchIQ plan, billing and cancellation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { session, ready } = useSession();
  const navigate = useNavigate();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session) return;
    getBillingStatus().then(setStatus).catch(() => setError("Could not load your subscription."));
  }, [session]);

  async function portal() {
    setBusy(true);
    setError(null);
    try {
      const r = await openBillingPortal();
      if (r.url) window.location.href = r.url;
      else setError(r.error);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-xl">
        <Link to="/"><Logo /></Link>
        <h1 className="mt-10 text-4xl font-extrabold">Account</h1>
        {!ready ? (
          <p className="mt-6 text-muted-foreground">Loading…</p>
        ) : !session ? (
          <div className="mt-6 rounded-2xl border border-border bg-card p-8 text-center">
            <p>Sign in to see your plan.</p>
            <button className="btn-primary mt-4 w-full" onClick={() => void signInWithGoogle("/account")}>Continue with Google</button>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="rounded-2xl border border-border bg-card p-8">
              <p className="eyebrow text-[10px] text-muted-foreground">Signed in as</p>
              <p className="mt-1">{session.user.email}</p>
              <p className="eyebrow mt-6 text-[10px] text-muted-foreground">Plan</p>
              {status ? (
                <>
                  <p className="mt-1 font-display text-2xl font-extrabold">
                    {status.premium ? <span className="text-primary">Premium</span> : "Free"}
                  </p>
                  {status.premium && status.currentPeriodEnd && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {status.cancelAtPeriodEnd ? "Ends" : "Renews"} on {new Date(status.currentPeriodEnd).toLocaleDateString("en-US", { dateStyle: "long" })}
                    </p>
                  )}
                  {status.hasCustomer && (
                    <button className="btn-primary mt-6 w-full" onClick={portal} disabled={busy}>
                      {busy ? "Opening…" : "Manage billing or cancel"}
                    </button>
                  )}
                </>
              ) : (
                <p className="mt-1 text-muted-foreground">Loading…</p>
              )}
              {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            </div>
            {status && !status.premium && (
              <div className="rounded-2xl border border-border bg-card p-8"><Paywall signedIn returnTo="/account" /></div>
            )}
            <button className="text-sm text-muted-foreground hover:text-foreground" onClick={signOut}>Sign out</button>
          </div>
        )}
      </div>
    </div>
  );
}
