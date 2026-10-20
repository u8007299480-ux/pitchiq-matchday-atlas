import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { FixtureRow } from "@/components/FixtureRow";
import { upcomingQuery } from "@/lib/football.queries";

export const Route = createFileRoute("/fixtures")({
  head: () => ({
    meta: [
      { title: "Football Fixtures Calendar — PitchIQ" },
      { name: "description", content: "Upcoming Premier League, Champions League and top European fixtures with kickoff times in ET." },
      { property: "og:title", content: "Football Fixtures Calendar — PitchIQ" },
      { property: "og:description", content: "Official upcoming fixtures and kickoff times in US Eastern time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(upcomingQuery),
  component: FixturesPage,
});

function FixturesPage() {
  const { data } = useSuspenseQuery(upcomingQuery);
  const comps = [...new Map(data.fixtures.map((f) => [f.competition.code, f.competition.name])).entries()];
  const [comp, setComp] = useState<string | null>(null);
  const list = data.fixtures.filter((f) => !comp || f.competition.code === comp);
  return (
    <div className="min-h-screen">
      <SiteHeader live={!data.error} />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <p className="eyebrow">Official fixtures</p>
        <h1 className="display mt-3 text-5xl">Full calendar</h1>
        <p className="mt-3 text-sm text-muted-foreground">Next 9 days · US Eastern time</p>
        <div className="mt-8 flex flex-wrap gap-2">
          {[[null, "All"] as const, ...comps].map(([code, name]) => (
            <button
              key={code ?? "all"}
              onClick={() => setComp(code)}
              className={`rounded-full border px-4 py-1.5 text-sm ${comp === code ? "border-primary bg-accent text-primary" : "border-border text-muted-foreground"}`}
            >
              {name}
            </button>
          ))}
        </div>
        {data.error ? (
          <p className="mt-8 text-sm text-destructive">Fixtures could not be loaded: {data.error}</p>
        ) : (
          <ul className="mt-8 space-y-3">{list.map((f) => <FixtureRow key={f.id} f={f} />)}</ul>
        )}
      </main>
    </div>
  );
}
