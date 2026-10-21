import { useMemo, useState } from "react";
import type { TeamSuggestion } from "@/lib/football.functions";

export const normTeam = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim().replace(/\s+/g, " ");

export function matchTeams(teams: TeamSuggestion[], query: string, limit = 8) {
  const q = normTeam(query);
  if (q.length < 1) return [];
  const scored = teams
    .map((t) => {
      const n = normTeam(t.name);
      const core = normTeam(t.name.replace(/^([A-Z0-9.]{1,4}\s+)+/, ""));
      const s = normTeam(t.shortName);
      const tla = normTeam(t.tla ?? "");
      const score = core.startsWith(q) ? 0 : s.startsWith(q) ? 0.3 : tla.startsWith(q) ? 0.4 : n.startsWith(q) ? 0.5 : n.split(" ").some((w) => w.startsWith(q)) ? 1 : n.includes(q) || s.includes(q) || tla.includes(q) ? 2 : 9;
      return { t, score };
    })
    .filter((x) => x.score < 9)
    .sort((a, b) => a.score - b.score || a.t.name.length - b.t.name.length);
  return scored.slice(0, limit).map((x) => x.t);
}

export function TeamSearch({
  value, onChange, onPick, teams, placeholder, loading, error,
}: { value: string; onChange: (v: string) => void; onPick?: (name: string) => void; teams: TeamSuggestion[]; placeholder: string; loading: boolean; error?: string | null }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const results = useMemo(() => matchTeams(teams, value), [teams, value]);
  const show = open && normTeam(value).length >= 1;
  const listboxId = `team-options-${placeholder.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  function pick(t: TeamSuggestion) {
    onChange(t.name);
    onPick?.(t.name);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        className="field"
        placeholder={placeholder}
        value={value}
        required
        autoComplete="off"
        role="combobox"
        aria-expanded={show}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={show && results[active] ? `${listboxId}-${results[active].id}` : undefined}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setOpen(false); return; }
          if (!show || results.length === 0) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % results.length); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i - 1 + results.length) % results.length); }
          if (e.key === "Enter") { const t = results[active]; if (t) { e.preventDefault(); pick(t); } }
        }}
      />
      {show && (
        <ul id={listboxId} role="listbox" className="absolute left-0 right-0 z-50 mt-2 max-h-72 overflow-y-auto overscroll-contain rounded-xl border border-border bg-card shadow-lg">
          {loading && teams.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted-foreground">Loading teams…</li>
          ) : error ? (
            <li className="px-4 py-3 text-sm text-destructive" role="status">{error}</li>
          ) : results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted-foreground">No team found for "{value}".</li>
          ) : (
            results.map((t, i) => (
              <li
                key={t.id}
                id={`${listboxId}-${t.id}`}
                role="option"
                aria-selected={i === active}
                onPointerDown={(e) => { e.preventDefault(); pick(t); }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm ${i === active ? "bg-accent text-primary" : ""}`}
              >
                {t.crest ? <img src={t.crest} alt="" className="h-6 w-6 object-contain" /> : <span className="h-6 w-6" />}
                <span className="font-semibold">{t.name}</span>
                <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{t.league}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
