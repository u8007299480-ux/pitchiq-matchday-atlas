import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Logo } from "@/components/Logo";
import { signInWithGoogle, useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — PitchIQ" },
      { name: "description", content: "Sign in to PitchIQ to manage your Premium match analysis subscription." },
      { property: "og:title", content: "Sign in — PitchIQ" },
      { property: "og:description", content: "Access your PitchIQ account and Premium analyses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session, ready } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (!ready || !session) return;
    const back = sessionStorage.getItem("pitchiq_return") ?? "/app";
    sessionStorage.removeItem("pitchiq_return");
    navigate({ href: back.startsWith("/") && !back.startsWith("//") ? back : "/app", replace: true });
  }, [ready, session, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center">
        <Logo />
        <h1 className="display mt-6 text-2xl">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">Use your Google account to access PitchIQ.</p>
        <button className="btn-primary mt-6 w-full" onClick={() => void signInWithGoogle(sessionStorage.getItem("pitchiq_return") ?? "/app")}>
          Continue with Google
        </button>
      </div>
    </div>
  );
}
