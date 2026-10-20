// Shared, browser-safe football types and helpers.

export const COMPETITIONS = ["PL", "CL", "PD", "SA", "BL1", "FL1"] as const;
export const DISPLAY_TIMEZONE = "America/New_York";

export type TeamRef = {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
};

export type Fixture = {
  id: number;
  utcDate: string;
  status: string;
  competition: { code: string; name: string; emblem: string };
  home: TeamRef;
  away: TeamRef;
  venue: string | null;
  score: { home: number | null; away: number | null };
};

export type Probabilities = { home: number; draw: number; away: number };

export function formatKickoff(utcDate: string) {
  const d = new Date(utcDate);
  const day = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: DISPLAY_TIMEZONE,
  }).format(d);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: DISPLAY_TIMEZONE,
  }).format(d);
  return { day, time, full: `${day} · ${time} ET` };
}

/** Points & goal-difference per game from a team's finished matches. */
export function teamStrength(teamId: number, matches: Fixture[]) {
  const played = matches.filter(
    (m) => m.score.home !== null && m.score.away !== null,
  );
  if (played.length === 0) return 0;
  let pts = 0;
  let gd = 0;
  for (const m of played) {
    const isHome = m.home.id === teamId;
    const gf = (isHome ? m.score.home : m.score.away) as number;
    const ga = (isHome ? m.score.away : m.score.home) as number;
    pts += gf > ga ? 3 : gf === ga ? 1 : 0;
    gd += gf - ga;
  }
  return pts / played.length + 0.3 * (gd / played.length);
}

/**
 * Win/draw/win percentages from two strength ratings. The home side gets a
 * fixed home advantage. Always returns whole numbers summing to 100.
 */
export function predictOutcome(homeStrength: number, awayStrength: number): Probabilities {
  const diff = homeStrength - awayStrength + 0.25;
  const draw = Math.max(0.12, 0.28 - 0.06 * Math.abs(diff));
  const home = (1 - draw) / (1 + Math.exp(-1.6 * diff));
  const h = Math.round(home * 100);
  const d = Math.round(draw * 100);
  return { home: h, draw: d, away: 100 - h - d };
}

export function resultFor(teamId: number, m: Fixture): "W" | "D" | "L" | null {
  if (m.score.home === null || m.score.away === null) return null;
  const isHome = m.home.id === teamId;
  const gf = isHome ? m.score.home : m.score.away;
  const ga = isHome ? m.score.away : m.score.home;
  return gf > ga ? "W" : gf === ga ? "D" : "L";
}
