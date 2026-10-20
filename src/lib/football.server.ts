// Server-only client for football-data.org (key stays on the server).
import type { Fixture, TeamRef } from "./football";

const BASE = "https://api.football-data.org/v4";
const cache = new Map<string, { t: number; v: unknown }>();

export async function fd<T>(path: string, ttlMs = 10 * 60 * 1000): Promise<T> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.t < ttlMs) return hit.v as T;
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) throw new Error("Football data key is not configured.");
  const res = await fetch(BASE + path, { headers: { "X-Auth-Token": key } });
  if (res.status === 429) {
    if (hit) return hit.v as T;
    throw new Error("Too many requests to the data provider — please retry in a minute.");
  }
  if (!res.ok) {
    if (hit) return hit.v as T;
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message || `Data provider error (${res.status}).`);
  }
  const v = await res.json();
  cache.set(path, { t: Date.now(), v });
  return v as T;
}

type RawTeam = { id: number; name: string; shortName: string; tla: string; crest: string };
export type RawMatch = {
  id: number;
  utcDate: string;
  status: string;
  competition: { code: string; name: string; emblem: string };
  homeTeam: RawTeam;
  awayTeam: RawTeam;
  venue?: string | null;
  score: { fullTime: { home: number | null; away: number | null } };
};

const team = (t: RawTeam): TeamRef => ({
  id: t.id,
  name: t.name ?? "TBD",
  shortName: t.shortName ?? t.name ?? "TBD",
  tla: t.tla ?? "",
  crest: t.crest ?? "",
});

export function toFixture(m: RawMatch, venues?: Map<number, string>): Fixture {
  return {
    id: m.id,
    utcDate: m.utcDate,
    status: m.status,
    competition: m.competition,
    home: team(m.homeTeam),
    away: team(m.awayTeam),
    venue: m.venue ?? venues?.get(m.homeTeam.id) ?? null,
    score: { home: m.score.fullTime.home, away: m.score.fullTime.away },
  };
}
