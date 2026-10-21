import { describe, expect, it } from "vitest";
import { matchTeams, normTeam } from "@/components/TeamSearch";
import type { TeamSuggestion } from "@/lib/football.functions";

const teams: TeamSuggestion[] = [
  { id: 57, name: "Arsenal FC", shortName: "Arsenal", tla: "ARS", crest: "", league: "Premier League" },
  { id: 86, name: "Real Madrid CF", shortName: "Real Madrid", tla: "RMA", crest: "", league: "LaLiga" },
  { id: 81, name: "FC Barcelona", shortName: "Barcelona", tla: "FCB", crest: "", league: "LaLiga" },
  { id: 524, name: "Paris Saint-Germain FC", shortName: "Paris SG", tla: "PSG", crest: "", league: "Ligue 1" },
];

describe("team search", () => {
  it("returns suggestions after the first typed letter", () => {
    expect(matchTeams(teams, "a").map((team) => team.id)).toContain(57);
  });

  it("matches full names, short names and provider abbreviations", () => {
    expect(matchTeams(teams, "Real Madrid")[0]?.id).toBe(86);
    expect(matchTeams(teams, "PSG")[0]?.id).toBe(524);
    expect(matchTeams(teams, "bar").map((team) => team.id)).toContain(81);
  });

  it("normalizes accents and repeated spaces", () => {
    expect(normTeam("  Réal   Madrid ")).toBe("real madrid");
    expect(matchTeams(teams, "  real   madrid ")[0]?.id).toBe(86);
  });

  it("returns no fake fallback for an unknown team", () => {
    expect(matchTeams(teams, "DefinitelyNotARealTeam")).toEqual([]);
  });
});
