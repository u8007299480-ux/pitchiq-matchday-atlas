import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { BarChart3, CreditCard, Globe, History, LifeBuoy, Radar, Trophy, User } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Crest } from "@/components/FixtureRow";
import { TeamSearch } from "@/components/TeamSearch";
import { Paywall } from "@/components/Paywall";
import { useSession } from "@/hooks/useSession";
import { confirmCheckout } from "@/lib/billing.functions";
import { analyzeMatch, getTeamDirectory, type Analysis, type TeamSuggestion } from "@/lib/football.functions";
import { formatKickoff, resultFor, type Fixture } from "@/lib/football";

export const Route = createFileRoute("/app")({
  validateSearch: z.object({ a: z.string().optional(), b: z.string().optional(), checkout: z.enum(["success", "cancelled"]).optional(), session_id: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Match Analysis — PitchIQ" },
      { name: "description", content: "Analyze any matchup: next official meeting, head-to-head history, recent form and win probabilities." },
      { property: "og:title", content: "Match Analysis — PitchIQ" },
      { property: "og:description", content: "Next meeting, head-to-head, form and win probabilities for any two teams." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AppPage,
});

function AppPage() {
  const search = Route.useSearch();
  const [a, setA] = useState(search.a ?? "");
  const [b, setB] = useState(search.b ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Analysis | null>(null);
  const [teams, setTeams] = useState<TeamSuggestion[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const confirmedCheckoutRef = useRef<string | null>(null);
  const { session, ready } = useSession();

  useEffect(() => {
    if (!ready) return;
    if (search.checkout === "cancelled") {
      setNotice("Checkout cancelled — you have not been charged.");
      window.history.replaceState(null, "", "/app");
      return;
    }
    if (search.checkout !== "success" || !search.session_id) return;
    if (!session) {
      setNotice("Sign in to verify your subscription. Premium access is not granted until the server confirms payment.");
      return;
    }
    if (confirmedCheckoutRef.current === search.session_id) return;
    confirmedCheckoutRef.current = search.session_id;
    setNotice("Confirming your subscription…");
    confirmCheckout({ data: { sessionId: search.session_id } })
      .then((r) => setNotice(r.premium ? "Welcome to Premium! Your analyses are unlocked." : "Payment not confirmed yet. If you completed checkout, refresh in a moment."))
      .catch(() => setNotice("We couldn't confirm your payment yet. Please refresh in a moment."))
      .finally(() => window.history.replaceState(null, "", "/app"));
  }, [ready, session, search.checkout, search.session_id]);

  useEffect(() => {
    getTeamDirectory()
      .then((r) => {
        setTeams(r.teams);
        setTeamsError(r.error ? "Team suggestions are unavailable. Please try again later." : null);
      })
      .catch(() => setTeamsError("Team suggestions are unavailable. Please try again later."))
      .finally(() => setTeamsLoading(false));
  }, []);

  async function run(e?: React.FormEvent, ta = a, tb = b) {
    e?.preventDefault();
    if (ta.trim().length < 2 || tb.trim().length < 2) return;
    setError(null);
    if (!session) { setLocked(true); setResult(null); return; }
    setLoading(true);
    try {
      const res = await analyzeMatch({ data: { teamA: ta, teamB: tb } });
      setLocked(res.locked);
      setResult(res.analysis);
      setError(res.error);
    } catch {
      setError("Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border p-4 md:flex">
        <Link to="/" className="px-2 py-2"><Logo /></Link>
        <p className="eyebrow mt-8 px-3 text-[10px] text-muted-foreground">Analysis</p>
        <nav className="mt-3 space-y-1 text-sm">
          <span className="flex items-center gap-3 rounded-lg bg-accent px-3 py-2.5 text-primary"><BarChart3 className="h-4 w-4" /> Matches</span>
          <Link to="/fixtures" className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted"><Trophy className="h-4 w-4" /> Competitions</Link>
          <span className="flex items-center gap-3 px-3 py-2.5 text-muted-foreground"><History className="h-4 w-4" /> History</span>
          <Link to="/account" className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted"><CreditCard className="h-4 w-4" /> Pricing <span className="ml-auto rounded-full bg-gold px-2 text-[10px] font-bold text-primary-foreground">PRO</span></Link>
        </nav>
        <div className="mt-auto space-y-3 border-t border-border pt-4 text-sm text-muted-foreground">
          <Link to="/account" className="flex items-center gap-2 text-foreground"><User className="h-4 w-4" /> {session ? "Account" : "Guest · Sign in"}</Link>
          <div className="flex items-center gap-2"><LifeBuoy className="h-4 w-4" /> Support</div>
          <div className="flex items-center gap-2"><Globe className="h-4 w-4" /> EN English</div>
        </div>
      </aside>

      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-center text-4xl font-extrabold">Match Analysis</h1>
          <p className="mt-2 text-center">Enter the two teams you want to analyze</p>
          <p className="mt-2 text-center text-sm text-primary">Connected to official fixtures and results across the top competitions.</p>

          <form onSubmit={run} className="mt-8 rounded-2xl border border-border bg-card p-8">
            <p className="eyebrow text-[10px] text-muted-foreground">Match to analyze</p>
            <TeamSlot crest={result?.teamA.crest} />
            <TeamSearch placeholder="Barcelona" value={a} onChange={setA} onPick={(n) => { if (b.trim()) void run(undefined, n, b); }} teams={teams} loading={teamsLoading} error={teamsError} />
            <p className="my-3 text-center font-mono text-[10px] tracking-widest text-muted-foreground">VS</p>
            <TeamSlot crest={result?.teamB.crest} />
            <TeamSearch placeholder="Real Madrid" value={b} onChange={setB} onPick={(n) => { if (a.trim()) void run(undefined, a, n); }} teams={teams} loading={teamsLoading} error={teamsError} />
            <button className="btn-primary mt-6 w-full" disabled={loading}>
              <Radar className="h-4 w-4" /> {loading ? "Analyzing…" : "Analyze match"}
            </button>
          </form>

          <div className="mt-6 rounded-2xl border border-border bg-card p-8">
            {notice && <p className="mb-4 text-center text-sm text-primary">{notice}</p>}
            {locked ? (
              <Paywall signedIn={!!session} returnTo="/app" />
            ) : error ? (
              <p className="text-center text-sm text-destructive">{error}</p>
            ) : result ? (
              <>
                <Result r={result} />
                {result.probabilities && (
                  <p className="mt-6 text-center text-xs text-muted-foreground">Probabilities are estimates based on recent official results, not guaranteed outcomes.</p>
                )}
              </>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Radar className="mx-auto h-10 w-10 text-primary" />
                <p className="mt-4">Run an analysis to find the next official meeting between two teams.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function TeamSlot({ crest }: { crest?: string | undefined }) {
  return (
    <div className="my-3 flex justify-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-input font-bold text-primary">
        {crest ? <img src={crest} alt="" className="h-8 w-8 object-contain" /> : "?"}
      </span>
    </div>
  );
}

function Result({ r }: { r: Analysis }) {
  const p = r.probabilities;
  const winsA = r.headToHead.filter((m) => resultFor(r.teamA.id, m) === "W").length;
  const winsB = r.headToHead.filter((m) => resultFor(r.teamB.id, m) === "W").length;
  return (
    <div className="space-y-8">
      <div className="text-center">
        <p className="eyebrow text-[10px]">Next official meeting</p>
        {r.nextMeeting ? (
          <>
            <h2 className="display mt-3 text-3xl">
              {r.nextMeeting.home.shortName} <span className="text-primary">vs</span> {r.nextMeeting.away.shortName}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatKickoff(r.nextMeeting.utcDate).full} · {r.nextMeeting.competition.name}
              {r.nextMeeting.venue ? ` · ${r.nextMeeting.venue}` : ""}
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No scheduled meeting between these teams yet.</p>
        )}
      </div>

      {p ? (
        <div className="grid grid-cols-3 text-center">
          {[[p.home, `${r.teamA.shortName} win`], [p.draw, "Draw"], [p.away, `${r.teamB.shortName} win`]].map(([v, l], i) => (
            <div key={i}>
              <div className={`font-display text-3xl font-extrabold ${i === 0 ? "text-primary" : ""}`}>{v}%</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          Outcome estimates are unavailable: a scheduled meeting and recent finished results for both teams are required.
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Form title={r.teamA.shortName} teamId={r.teamA.id} list={r.formA} />
        <Form title={r.teamB.shortName} teamId={r.teamB.id} list={r.formB} />
      </div>

      {r.headToHead.length > 0 && (
        <div>
          <p className="eyebrow text-[10px]">Head to head · last {r.headToHead.length}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {r.teamA.shortName} {winsA} · Draws {r.headToHead.length - winsA - winsB} · {r.teamB.shortName} {winsB}
          </p>
          <ul className="mt-3 space-y-2">{r.headToHead.map((m) => <ScoreRow key={m.id} m={m} />)}</ul>
        </div>
      )}
    </div>
  );
}

function Form({ title, teamId, list }: { title: string; teamId: number; list: Fixture[] }) {
  return (
    <div>
      <p className="eyebrow text-[10px]">{title} · recent results</p>
      <ul className="mt-3 space-y-2">
        {list.map((m) => {
          const res = resultFor(teamId, m);
          return (
            <li key={m.id} className="flex items-center gap-2 text-sm">
              <span className={`w-6 rounded text-center font-mono text-xs font-bold ${res === "W" ? "bg-primary text-primary-foreground" : res === "L" ? "bg-destructive" : "bg-muted"}`}>{res}</span>
              <span className="truncate">{m.home.shortName} {m.score.home}–{m.score.away} {m.away.shortName}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ScoreRow({ m }: { m: Fixture }) {
  return (
    <li className="flex items-center justify-between rounded-lg bg-background px-4 py-2 text-sm">
      <span className="font-mono text-xs text-muted-foreground">{formatKickoff(m.utcDate).day} {new Date(m.utcDate).getUTCFullYear()}</span>
      <span className="flex items-center gap-2">
        <Crest src={m.home.crest} alt={m.home.name} /> {m.home.shortName}
        <b className="text-primary">{m.score.home}–{m.score.away}</b>
        {m.away.shortName} <Crest src={m.away.crest} alt={m.away.name} />
      </span>
    </li>
  );
}
