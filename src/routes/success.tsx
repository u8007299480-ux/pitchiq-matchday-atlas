import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/success")({
  head: () => ({
    meta: [
      { title: "Welcome to PitchIQ Premium" },
      { name: "description", content: "Your PitchIQ Premium subscription is active." },
      { property: "og:title", content: "Welcome to PitchIQ Premium" },
      { property: "og:description", content: "Your PitchIQ Premium subscription is active." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Success,
});

function Success() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader live={null} />
      <main className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
        <CheckCircle2 className="h-14 w-14 text-primary" />
        <h1 className="display mt-6 text-4xl">You're Premium</h1>
        <p className="mt-3 text-muted-foreground">
          Your subscription is active. Every match analysis is now unlocked.
        </p>
        <Link to="/app" className="btn-primary mt-8">
          Start analyzing
        </Link>
      </main>
    </div>
  );
}
