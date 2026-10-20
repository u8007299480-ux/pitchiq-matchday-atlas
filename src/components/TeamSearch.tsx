import { useMemo, useState } from "react";
import type { TeamSuggestion } from "@/lib/football.functions";

export const normTeam = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();

export function matchTeams(teams: TeamSuggestion[], query: string, limit = 8) {
  const q = normTeam(query);
  if (q.length < 1) return [];
  const scored = teams
    .map((t) => {
      const n = normTeam(t.name);
      const s = normTeam(t.shortName);
      const score = s.startsWith(q) || n.startsWith(q) ? 0 : n.split(" ").some((w) => w.startsWith(q)) ? 1 : n.includes(q) || s.includes(q) ? 2 : 9;
      return { t, score };
    })
    .filter((x) => x.score < 9)
    .sort((a, b) => a.score - b.score || a.t.shortName.localeCompare(b.t.shortName));
  return scored.slice(0, limit).map((x) => x.t);
}

export function TeamSearch({
  value, onChange, onPick, teams, placeholder, loading,
}: { value: string; onChange: (v: string) => void; onPick?: (name: string) => void; teams: TeamSuggestion[]; placeholder: string; loading: boolean }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const results = useMemo(() => matchTeams(teams, value), [teams, value]);
  const show = open && normTeam(value).length >= 1;

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
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!show || results.length === 0) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % results.length); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i - 1 + results.length) % results.length); }
          if (e.key === "Enter") { const t = results[active]; if (t) { e.preventDefault(); pick(t); } }
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {show && (
        <ul role="listbox" className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          {loading && teams.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted-foreground">Loading teams…</li>
          ) : results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted-foreground">No team found for "{value}".</li>
          ) : (
            results.map((t, i) => (
              <li
                key={t.id}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => { e.preventDefault(); pick(t); }}
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
