import { describe, expect, it } from "vitest";
import { buildMatchScenarios } from "@/lib/match-scenarios";
import type { Fixture, TeamRef } from "@/lib/football";

const teamA: TeamRef = { id: 1, name: "Test A", shortName: "Test A", tla: "A", crest: "" };
const teamB: TeamRef = { id: 2, name: "Test B", shortName: "Test B", tla: "B", crest: "" };
// Synthetic unit-test inputs only, never served as application data.
const match = (id: number, home: number | null, away: number | null): Fixture => ({
  id, home: teamA, away: teamB, status: "FINISHED", utcDate: "2026-10-20T19:00:00Z",
  score: { home, away }, venue: null, competition: { name: "Test", code: "TEST", emblem: "" },
});
const input = {
  teamA, teamB, formA: [match(1, 3, 0), match(2, 2, 1), match(3, 1, 1)],
  formB: [match(1, 3, 0), match(2, 2, 1), match(3, 1, 1)],
  probabilities: { home: 60, draw: 25, away: 15 }, nextMeeting: null,
};

describe("match scenarios", () => {
  it("returns exactly two distinct outcomes ranked by existing estimates", () => {
    const { scenarios } = buildMatchScenarios(input);
    expect(scenarios.map((s) => [s.outcome, s.likelihood])).toEqual([["teamA", 60], ["draw", 25]]);
    expect(scenarios[0]?.progression).not.toEqual(scenarios[1]?.progression);
  });
  it("keeps team A/B semantics when the team B estimate is highest", () => {
    const { scenarios } = buildMatchScenarios({ ...input, probabilities: { home: 15, draw: 20, away: 65 } });
    expect(scenarios.map((s) => [s.outcome, s.likelihood])).toEqual([["teamB", 65], ["draw", 20]]);
  });
  it("ranks a draw first when its estimate is largest", () => {
    expect(buildMatchScenarios({ ...input, probabilities: { home: 30, draw: 40, away: 30 } }).scenarios[0]?.outcome).toBe("draw");
  });
  it("derives match-specific evidence rather than static numbers", () => {
    const changed = { ...input, formA: [match(4, 0, 2), match(5, 0, 3), match(6, 0, 1)] };
    expect(buildMatchScenarios(changed).evidence).not.toEqual(buildMatchScenarios(input).evidence);
    expect(buildMatchScenarios(changed).scenarios[0]?.progression).not.toEqual(buildMatchScenarios(input).scenarios[0]?.progression);
  });
  it("does not infer progression from fewer than three completed results per team", () => {
    const result = buildMatchScenarios({ ...input, formA: [match(4, null, null), match(5, 1, 0)] });
    expect(result.evidence).toContain("in 1 completed matches");
    expect(result.scenarios.every((s) => s.turningPoint.startsWith("A turning point cannot be inferred"))).toBe(true);
  });
  it("discloses tied estimates", () => {
    expect(buildMatchScenarios({ ...input, probabilities: { home: 40, draw: 20, away: 40 } }).tied).toBe(true);
    expect(buildMatchScenarios(input).tied).toBe(false);
  });
});