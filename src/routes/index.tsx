import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Menu, Radar, Search, Star, Zap, Diamond, ShieldAlert } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Logo } from "@/components/Logo";
import { FixtureRow } from "@/components/FixtureRow";
import { featuredQuery, upcomingQuery } from "@/lib/football.queries";
import { formatKickoff, type Fixture } from "@/lib/football";

const HERO =
  "https://images.unsplash.com/photo-1676746610993-fa0c050d1f6d?crop=entropy&cs=srgb&fm=jpg&q=85&w=2000";
const PITCH =
  "https://images.unsplash.com/photo-1517747614396-d21a78b850e8?crop=entropy&cs=srgb&fm=jpg&q=85&w=2000";
const LEFT_IMG =
  "https://images.unsplash.com/photo-1607627000458-210e8d2bdb1d?crop=entropy&cs=srgb&fm=jpg&q=85&w=800";
const RIGHT_IMG =
  "https://images.pexels.com/photos/30666145/pexels-photo-30666145.jpeg?auto=compress&cs=tinysrgb&w=800";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PitchIQ — Predict Every Match Before It Starts" },
      { name: "description", content: "AI predictions for Premier League, Champions League and top European football, with real fixtures and kickoff times." },
      { property: "og:title", content: "PitchIQ — Predict Every Match Before It Starts" },
      { property: "og:description", content: "AI predictions with real fixtures, kickoff times and results." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: HERO },
      { name: "twitter:image", content: HERO },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(upcomingQuery),
      context.queryClient.ensureQueryData(featuredQuery),
    ]),
  component: Index,
});

function Index() {
  const { data: up } = useSuspenseQuery(upcomingQuery);
  return (
    <div className="min-h-screen">
      <SiteHeader live={!up.error} />
      <Hero />
      <Engine fixtures={up.fixtures} />
      <Featured />
      <Official fixtures={up.fixtures} error={up.error} />
      <Faq />
      <footer className="border-t border-border py-10 text-center text-xs text-muted-foreground">
        <Logo size="sm" /> <p className="mt-3">Fixture data © football-data.org</p>
      </footer>
    </div>
  );
}

function Hero() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  return (
    <section className="relative overflow-hidden">
      <img src={HERO} alt="Stadium under floodlights" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-hero-overlay" />
      <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 py-28 text-center">
        <span className="flex items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-1.5 text-sm">
          <Star className="h-4 w-4 fill-gold text-gold" /> +100K satisfied users worldwide
        </span>
        <h1 className="display mt-8 text-5xl md:text-8xl">
          Predict every match before <span className="text-primary">it starts.</span>
        </h1>
        <p className="mt-8 max-w-xl text-muted-foreground">
          AI analysis, advanced statistics and match scenarios to anticipate results — and understand the game better than anyone.
        </p>
        <form
          className="mt-10 flex w-full max-w-xl items-center gap-3 rounded-full border border-input bg-background/80 px-5 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/app", search: { a: q || undefined } });
          }}
        >
          <Search className="h-5 w-5 text-primary" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a team (e.g. Real Madrid, Arsenal, PSG...)"
            className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </form>
        <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Zap className="h-4 w-4 text-primary" />
          <span className="font-semibold text-primary">92.2% accuracy</span> on the <b className="text-foreground">879 matches</b> analyzed last week
        </p>
      </div>
    </section>
  );
}

function FloatCard({ f, className }: { f: Fixture; className: string }) {
  return (
    <div className={`absolute hidden items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 lg:flex ${className}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-primary">
        <Diamond className="h-4 w-4" />
      </span>
      <div>
        <div className="font-mono text-xs font-bold uppercase">{f.home.shortName} — {f.away.shortName}</div>
        <div className="text-xs text-primary">{formatKickoff(f.utcDate).full}</div>
      </div>
    </div>
  );
}

function Engine({ fixtures }: { fixtures: Fixture[] }) {
  const [a, setA] = useState("Arsenal");
  const [b, setB] = useState("Chelsea");
  const navigate = useNavigate();
  const cards = fixtures.slice(0, 3);
  return (
    <section id="engine" className="relative mx-auto max-w-6xl px-6 py-24">
      <p className="eyebrow text-center">Live AI predictions</p>
      <h2 className="display mt-4 text-center text-4xl md:text-5xl">
        AI analysis to anticipate <span className="text-primary">every match.</span>
      </h2>
      <div className="relative mt-16 flex justify-center">
        {cards[0] && <FloatCard f={cards[0]} className="left-0 top-4" />}
        {cards[1] && <FloatCard f={cards[1]} className="right-0 top-1/2" />}
        {cards[2] && <FloatCard f={cards[2]} className="bottom-6 left-6" />}
        <div className="w-full max-w-xs rounded-[2.5rem] border border-border bg-surface p-4 shadow-glow">
          <div className="mx-auto mb-3 h-1 w-16 rounded-full bg-muted" />
          <div className="rounded-[2rem] border border-border bg-background p-4">
            <div className="flex items-center justify-between"><Logo size="sm" /><Menu className="h-4 w-4 text-muted-foreground" /></div>
            <h3 className="mt-5 text-xl font-bold">Match Analysis</h3>
            <p className="mt-2 text-xs text-muted-foreground">Enter the two teams you want to analyze. Our AI scans millions of data points for every prediction.</p>
            <input className="field mt-4 py-2 text-sm" value={a} onChange={(e) => setA(e.target.value)} />
            <p className="my-1 text-center font-mono text-[10px] tracking-widest text-muted-foreground">VS</p>
            <input className="field py-2 text-sm" value={b} onChange={(e) => setB(e.target.value)} />
            <button
              className="btn-primary mt-3 w-full py-2.5 text-[11px]"
              onClick={() => navigate({ to: "/app", search: { a, b } })}
            >
              <Radar className="h-4 w-4" /> Analyze match with AI
            </button>
            <p className="eyebrow mt-5 text-[10px] text-muted-foreground">Upcoming matches</p>
            <ul className="mt-2 space-y-2">
              {fixtures.slice(0, 2).map((f) => (
                <li key={f.id} className="flex items-center gap-3 rounded-lg bg-card px-3 py-2">
                  <span className="font-mono text-[10px] text-muted-foreground">{formatKickoff(f.utcDate).day}<br />{formatKickoff(f.utcDate).time}</span>
                  <span className="truncate text-xs">{f.home.shortName} <span className="text-primary">vs</span> {f.away.shortName}</span>
                </li>
              ))}
              {fixtures.length === 0 && <li className="text-xs text-muted-foreground">No fixtures available right now.</li>}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Featured() {
  const { data } = useSuspenseQuery(featuredQuery);
  const f = data.fixture;
  const p = data.probabilities;
  return (
    <section id="predictions" className="relative overflow-hidden">
      <img src={PITCH} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-pitch-overlay" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 lg:grid-cols-[1fr_2fr_1fr]">
        <img src={LEFT_IMG} alt="Player striking the ball under stadium lights" className="hidden h-72 w-full rounded-t-full object-cover lg:block" />
        <div className="text-center">
          {f && p ? (
            <>
              <p className="eyebrow">AI prediction · {f.competition.name}</p>
              <h2 className="display mt-4 text-4xl md:text-6xl">
                {f.home.shortName} <span className="text-primary">vs</span> {f.away.shortName}
              </h2>
              <p className="mt-4 text-sm">{formatKickoff(f.utcDate).full}{f.venue ? ` · ${f.venue}` : ""}</p>
              <div className="mx-auto mt-8 flex h-2 max-w-md overflow-hidden rounded-full bg-muted">
                <div className="bg-primary" style={{ width: `${p.home}%` }} />
                <div className="bg-muted-foreground" style={{ width: `${p.draw}%` }} />
              </div>
              <div className="mx-auto mt-6 grid max-w-md grid-cols-3">
                <Stat v={p.home} l={`${f.home.tla || f.home.shortName} win`} hi />
                <Stat v={p.draw} l="Draw" />
                <Stat v={p.away} l={`${f.away.tla || f.away.shortName} win`} />
              </div>
              <Link to="/app" search={{ a: f.home.shortName, b: f.away.shortName }} className="btn-primary mt-8 rounded-full px-8">
                <Radar className="h-4 w-4" /> Analysis ready
              </Link>
              <p className="mt-3 text-xs">Based on each team's latest official results.</p>
            </>
          ) : (
            <p className="text-sm">{data.error ?? "No upcoming featured match right now."}</p>
          )}
        </div>
        <img src={RIGHT_IMG} alt="Players tackling for the ball during a night match" className="hidden h-72 w-full rounded-t-full object-cover lg:block" />
      </div>
    </section>
  );
}

function Stat({ v, l, hi }: { v: number; l: string; hi?: boolean }) {
  return (
    <div>
      <div className={`font-display text-3xl font-extrabold ${hi ? "text-primary" : ""}`}>{v}%</div>
      <div className="font-mono text-[10px] uppercase tracking-widest">{l}</div>
    </div>
  );
}

function Official({ fixtures, error }: { fixtures: Fixture[]; error: string | null }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <p className="eyebrow">Official fixtures</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="display text-4xl md:text-5xl">Real dates. Real stadiums.</h2>
          <p className="mt-3 max-w-lg text-sm text-muted-foreground">
            Every kick-off below comes straight from official competition data — never estimated. Shown in US Eastern time.
          </p>
        </div>
        <Link to="/fixtures" className="text-sm font-semibold text-primary">Full calendar →</Link>
      </div>
      {error ? (
        <div className="mt-8 flex gap-3 rounded-xl border border-destructive/50 bg-destructive/10 p-5 text-sm">
          <ShieldAlert className="h-5 w-5 shrink-0 text-destructive" /> Fixtures could not be loaded: {error}
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {fixtures.slice(0, 6).map((f) => <FixtureRow key={f.id} f={f} />)}
        </ul>
      )}
    </section>
  );
}

function Faq() {
  const items = [
    ["Where does the match data come from?", "Fixtures, kickoff times and results come from football-data.org, an official football data provider."],
    ["Which competitions are covered?", "Premier League, UEFA Champions League, LaLiga, Serie A, Bundesliga and Ligue 1."],
    ["What time zone are kickoffs shown in?", "All kickoff times are shown in US Eastern time (ET)."],
  ];
  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 pb-24">
      <p className="eyebrow">FAQ</p>
      <h2 className="display mt-3 text-4xl">Good questions.</h2>
      <div className="mt-8 divide-y divide-border rounded-xl border border-border bg-card">
        {items.map(([q, a]) => (
          <details key={q} className="group p-5">
            <summary className="cursor-pointer font-semibold">{q}</summary>
            <p className="mt-2 text-sm text-muted-foreground">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
