import type { Analysis } from "@/lib/football.functions";
import { buildMatchScenarios } from "@/lib/match-scenarios";

export function MatchScenarios({ analysis }: { analysis: Analysis }) {
  const { scenarios, evidence, uncertainty, tied } = buildMatchScenarios(analysis);
  return (
    <section aria-label="Probable match scenarios" className="min-w-0 space-y-5 border-t border-border pt-6">
      {scenarios.map((scenario, index) => (
        <section key={scenario.outcome} aria-labelledby={`scenario-${index}`} className={index === 1 ? "border-t border-border pt-5" : ""}>
          <h3 id={`scenario-${index}`} className={`text-sm font-bold ${index === 0 ? "text-primary" : "text-foreground"}`}>
            Option {index + 1} — {index === 0 ? "Most Likely Match Scenario" : "Second Most Likely Match Scenario"}
          </h3>
          <p className="mt-2 break-words text-base font-semibold">{scenario.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">Associated outcome estimate: {scenario.likelihood}% · Not a probability of this exact sequence</p>
          <p className="mt-3 break-words text-sm leading-relaxed">{scenario.progression}</p>
          <p className="mt-3 break-words text-sm leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">Possible turning point: </span>{scenario.turningPoint}</p>
        </section>
      ))}
      <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
        <p><span className="font-semibold text-foreground">Available evidence: </span>{evidence}</p>
        <p>{uncertainty}{tied ? " Some outcome estimates are tied; their display order does not imply a stronger likelihood." : ""} Both scenarios are projections, not guaranteed results.</p>
      </div>
    </section>
  );
}