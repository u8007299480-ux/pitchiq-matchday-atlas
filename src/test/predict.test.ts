import { describe, expect, it } from "vitest";
import { predictOutcome, formatKickoff } from "@/lib/football";

describe("predictOutcome", () => {
  it("percentages always sum to 100", () => {
    const p = predictOutcome(2.4, 0.6);
    expect(p.home + p.draw + p.away).toBe(100);
  });
  it("gives the home side the edge between equal teams", () => {
    const p = predictOutcome(1.5, 1.5);
    expect(p.home).toBeGreaterThan(p.away);
  });
});

describe("formatKickoff", () => {
  it("shows kickoff in US Eastern time", () => {
    // 19:00 UTC on Oct 23 2026 is 3:00 PM EDT
    expect(formatKickoff("2026-10-23T19:00:00Z").time).toBe("3:00 PM");
  });
});
