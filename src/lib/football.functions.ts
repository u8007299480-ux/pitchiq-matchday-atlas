import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  COMPETITIONS,
  predictOutcome,
  teamStrength,
  type Fixture,
  type Probabilities,
  type TeamRef,
} from "./football";
import { fd, toFixture, type RawMatch } from "./football.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type TeamWithVenue = TeamRef & { venue: string | null; league: string | null };

async function allTeams(): Promise<TeamWithVenue[]> {
  const byId = new Map<number, TeamWithVenue>();
  for (const c of COMPETITIONS) {
    const res = await fd<{ competition?: { name?: string }; teams: (TeamRef & { venue?: string })[] }>(
      `/competitions/${c}/teams`,
      12 * 60 * 60 * 1000,
    );
    const compName = res.competition?.name ?? null;
    for (const t of res.teams) {
      const prev = byId.get(t.id);
      byId.set(t.id, {
        id: t.id,
        name: t.name,
        shortName: t.shortName ?? t.name,
        tla: t.tla ?? "",
        crest: t.crest ?? "",
        venue: t.venue ?? prev?.venue ?? null,
        // Prefer the domestic league over the Champions League.
        league: c === "CL" ? (prev?.league ?? compName) : compName,
      });
    }
  }
  return [...byId.values()];
}

export type TeamSuggestion = { id: number; name: string; shortName: string; crest: string; league: string | null };

export const getTeamDirectory = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const teams = await allTeams();
    const list: TeamSuggestion[] = teams.map((t) => ({
      id: t.id, name: t.name, shortName: t.shortName, crest: t.crest, league: t.league,
    }));
    return { teams: list, error: null as string | null };
  } catch (e) {
    return { teams: [] as TeamSuggestion[], error: (e as Error).message };
  }
});

async function venueMap() {
  try {
    const teams = await allTeams();
    return new Map(teams.filter((t) => t.venue).map((t) => [t.id, t.venue as string]));
  } catch {
    return new Map<number, string>();
  }
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

async function upcoming(days: number): Promise<Fixture[]> {
  const from = new Date();
  const to = new Date(Date.now() + days * 86400000);
  const res = await fd<{ matches: RawMatch[] }>(
    `/matches?competitions=${COMPETITIONS.join(",")}&dateFrom=${ymd(from)}&dateTo=${ymd(to)}`,
  );
  const venues = await venueMap();
  return res.matches
    .filter((m) => ["SCHEDULED", "TIMED"].includes(m.status) && new Date(m.utcDate) > from)
    .map((m) => toFixture(m, venues))
    .sort((a, b) => a.utcDate.localeCompare(b.utcDate));
}

async function recentResults(teamId: number, limit = 6): Promise<Fixture[]> {
  const res = await fd<{ matches: RawMatch[] }>(`/teams/${teamId}/matches?status=FINISHED&limit=12`);
  return res.matches
    .map((m) => toFixture(m))
    .sort((a, b) => b.utcDate.localeCompare(a.utcDate))
    .slice(0, limit);
}

export const getUpcomingFixtures = createServerFn({ method: "GET" })
  .inputValidator((d: { days?: number } | undefined) =>
    z.object({ days: z.number().min(1).max(10).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    try {
      return { fixtures: await upcoming(data.days ?? 9), error: null as string | null };
    } catch (e) {
      return { fixtures: [] as Fixture[], error: (e as Error).message };
    }
  });

export const getFeaturedPrediction = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const list = await upcoming(9);
    const fixture =
      list.find((f) => f.competition.code === "CL") ??
      list.find((f) => f.competition.code === "PL") ??
      list[0];
    if (!fixture) return { fixture: null, probabilities: null, error: null as string | null };
    const [h, a] = await Promise.all([recentResults(fixture.home.id), recentResults(fixture.away.id)]);
    const probabilities = predictOutcome(teamStrength(fixture.home.id, h), teamStrength(fixture.away.id, a));
    return { fixture, probabilities, error: null as string | null };
  } catch (e) {
    return { fixture: null, probabilities: null, error: (e as Error).message };
  }
});

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim();

function findTeam(teams: TeamWithVenue[], query: string) {
  const q = norm(query);
  if (!q) return null;
  return (
    teams.find((t) => norm(t.tla) === q || norm(t.shortName) === q || norm(t.name) === q) ??
    teams.find((t) => norm(t.shortName).startsWith(q) || norm(t.name).includes(q)) ??
    teams.find((t) => q.split(" ").every((w) => norm(t.name).includes(w))) ??
    null
  );
}

export type Analysis = {
  teamA: TeamWithVenue;
  teamB: TeamWithVenue;
  nextMeeting: Fixture | null;
  headToHead: Fixture[];
  formA: Fixture[];
  formB: Fixture[];
  probabilities: Probabilities;
  homeId: number;
};

/** Premium-only: verifies the caller's subscription on the server before returning any analysis. */
export const analyzeMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { teamA: string; teamB: string }) =>
    z.object({ teamA: z.string().trim().min(2).max(60), teamB: z.string().trim().min(2).max(60) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: premium } = await context.supabase.rpc("is_premium", { _user_id: context.userId });
    if (!premium) return { analysis: null, error: null as string | null, locked: true };
    try {
      const teams = await allTeams();
      const teamA = findTeam(teams, data.teamA);
      const teamB = findTeam(teams, data.teamB);
      if (!teamA) return { analysis: null, error: `No team found for "${data.teamA}".` };
      if (!teamB) return { analysis: null, error: `No team found for "${data.teamB}".` };
      if (teamA.id === teamB.id) return { analysis: null, error: "Pick two different teams." };

      const venues = new Map(teams.filter((t) => t.venue).map((t) => [t.id, t.venue as string]));
      const sched = await fd<{ matches: RawMatch[] }>(`/teams/${teamA.id}/matches?status=SCHEDULED`);
      const nextRaw = sched.matches
        .filter((m) => m.homeTeam.id === teamB.id || m.awayTeam.id === teamB.id)
        .sort((a, b) => a.utcDate.localeCompare(b.utcDate))[0];
      const nextMeeting = nextRaw ? toFixture(nextRaw, venues) : null;

      const [formA, formB] = await Promise.all([recentResults(teamA.id, 5), recentResults(teamB.id, 5)]);

      let headToHead: Fixture[] = [];
      if (nextRaw) {
        const h2h = await fd<{ matches: RawMatch[] }>(`/matches/${nextRaw.id}/head2head?limit=10`);
        headToHead = h2h.matches
          .filter((m) => m.status === "FINISHED")
          .map((m) => toFixture(m))
          .sort((a, b) => b.utcDate.localeCompare(a.utcDate));
      }

      const homeId = nextMeeting?.home.id ?? teamA.id;
      const sA = teamStrength(teamA.id, formA);
      const sB = teamStrength(teamB.id, formB);
      const p = homeId === teamA.id ? predictOutcome(sA, sB) : predictOutcome(sB, sA);
      const probabilities = homeId === teamA.id ? p : { home: p.away, draw: p.draw, away: p.home };

      const analysis: Analysis = { teamA, teamB, nextMeeting, headToHead, formA, formB, probabilities, homeId };
      return { analysis, error: null as string | null };
    } catch (e) {
      return { analysis: null, error: (e as Error).message };
    }
  });
