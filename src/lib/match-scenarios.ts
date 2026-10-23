import type { Fixture, Probabilities, TeamRef } from "./football";

type ScenarioInput = {
  teamA: TeamRef;
  teamB: TeamRef;
  formA: Fixture[];
  formB: Fixture[];
  probabilities: Probabilities;
  nextMeeting: Fixture | null;
};

export type MatchScenario = {
  outcome: "teamA" | "draw" | "teamB";
  likelihood: number;
  title: string;
  progression: string;
  turningPoint: string;
};

function summarize(teamId: number, matches: Fixture[]) {
  const scored = matches.filter((m) =>
    m.status === "FINISHED" && (m.home.id === teamId || m.away.id === teamId) &&
    m.score.home !== null && m.score.away !== null,
  );
  let wins = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  for (const match of scored) {
    const home = match.score.home;
    const away = match.score.away;
    if (home === null || away === null) continue;
    const gf = match.home.id === teamId ? home : away;
    const ga = match.home.id === teamId ? away : home;
    goalsFor += gf;
    goalsAgainst += ga;
    if (gf > ga) wins++;
  }
  return { played: scored.length, wins, goalsFor, goalsAgainst };
}

/** Browser-safe projections from the existing analysis only; no new API or model. */
export function buildMatchScenarios(input: ScenarioInput) {
  const a = summarize(input.teamA.id, input.formA);
  const b = summarize(input.teamB.id, input.formB);
  const nameA = input.teamA.shortName;
  const nameB = input.teamB.shortName;
  const evidence = `${nameA}: ${a.wins} wins, ${a.goalsFor} goals scored and ${a.goalsAgainst} conceded in ${a.played} completed matches. ${nameB}: ${b.wins} wins, ${b.goalsFor} goals scored and ${b.goalsAgainst} conceded in ${b.played} completed matches.`;
  const uncertainty = [
    "Ranked by the existing win/draw/win estimates, not by measured probabilities of exact match sequences. Tempo and tactics are conditional interpretations of scorelines: possession, shots, lineups, injuries and event timing are unavailable.",
    a.played < 3 || b.played < 3 ? "Fewer than three completed results are available for at least one team; evidence is insufficient to describe a reliable match progression." : "Recent results are a small sample and do not establish how either team will play.",
    !input.nextMeeting ? `No official meeting is scheduled; the existing model assumes ${nameA} is at home.` : "",
  ].filter(Boolean).join(" ");
  const ranked: { outcome: MatchScenario["outcome"]; likelihood: number }[] = [
    { outcome: "teamA", likelihood: input.probabilities.home },
    { outcome: "draw", likelihood: input.probabilities.draw },
    { outcome: "teamB", likelihood: input.probabilities.away },
  ];
  ranked.sort((x, y) => y.likelihood - x.likelihood);
  const tied = ranked.some((item, i) => i > 0 && item.likelihood === ranked[i - 1]?.likelihood);
  const enough = a.played >= 3 && b.played >= 3;
  const averageGoals = (a.goalsFor + a.goalsAgainst + b.goalsFor + b.goalsAgainst) / (a.played + b.played || 1);
  const tempo = averageGoals >= 3
    ? "Recent scorelines suggest scope for a more open, chance-trading match, although they cannot establish its actual pace."
    : "Recent scorelines suggest a tighter scoring environment, although they cannot establish its actual pace.";

  const scenarios: MatchScenario[] = ranked.slice(0, 2).map(({ outcome, likelihood }, index) => {
    const winner = outcome === "teamA" ? nameA : nameB;
    const opponent = outcome === "teamA" ? nameB : nameA;
    const winnerForm = outcome === "teamA" ? a : b;
    const opponentForm = outcome === "teamA" ? b : a;
    const title = outcome === "draw" ? "Neither side breaks the balance" : `${winner} finds a route to victory`;
    if (!enough) return {
      outcome, likelihood, title,
      progression: `The existing model ranks ${outcome === "draw" ? "a draw" : `a ${winner} win`} ${index === 0 ? "first" : "second"}, but the available results do not support a specific tempo or tactical progression.`,
      turningPoint: "A turning point cannot be inferred reliably from the available evidence; no goal timing, formation change or exact score is predicted.",
    };
    if (outcome === "draw") return {
      outcome, likelihood, title,
      progression: `${tempo} A plausible ${index === 0 ? "primary" : "alternative"} path is that ${nameA} and ${nameB} contain each other's attacks and prioritize defensive cover, leaving the match level rather than producing a decisive winner.`,
      turningPoint: "If the first lead is cancelled out, or neither side converts its openings, both could become more cautious late on. A switch toward protecting the result could keep the game level; those events are possibilities, not observed team tendencies.",
    };
    const attackEdge = winnerForm.goalsFor / winnerForm.played > opponentForm.goalsFor / opponentForm.played;
    return {
      outcome, likelihood, title,
      progression: `${tempo} ${winner} ${attackEdge ? "has the higher scoring rate in the available recent results" : "does not have a higher recent scoring rate, so this route depends on making the most of limited openings"}. One plausible path is for ${winner} to establish a lead, then protect it while ${opponent} commits more players forward.`,
      turningPoint: index === 0
        ? `An opening goal for ${winner} could force ${opponent} to take greater attacking risks; the resulting spaces could help ${winner} retain the advantage. This is a conditional tactical pattern, not evidence of a confirmed game plan.`
        : `If ${winner} scores against the initial balance of play or responds successfully to an opponent's lead, ${opponent} could be drawn into chasing the game. A more compact defensive approach and counterattacking openings offer a different route to a ${winner} win, not a guaranteed upset.`,
    };
  });
  return { scenarios, evidence, uncertainty, tied };
}