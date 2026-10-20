import { formatKickoff, type Fixture } from "@/lib/football";

export function Crest({ src, alt }: { src: string; alt: string }) {
  return src ? (
    <img src={src} alt={alt} className="h-7 w-7 object-contain" loading="lazy" />
  ) : (
    <span className="h-7 w-7 rounded-full bg-muted" />
  );
}

export function FixtureRow({ f }: { f: Fixture }) {
  const k = formatKickoff(f.utcDate);
  return (
    <li className="grid grid-cols-[110px_1fr] items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 md:grid-cols-[140px_1fr_200px]">
      <div className="font-mono text-xs text-muted-foreground">
        <div>{k.day}</div>
        <div className="text-base font-bold text-primary">{k.time} ET</div>
      </div>
      <div className="flex flex-wrap items-center gap-3 font-semibold">
        <Crest src={f.home.crest} alt={f.home.name} />
        <span>{f.home.shortName}</span>
        <span className="font-mono text-xs text-muted-foreground">VS</span>
        <span>{f.away.shortName}</span>
        <Crest src={f.away.crest} alt={f.away.name} />
      </div>
      <div className="col-span-2 text-xs text-muted-foreground md:col-span-1 md:text-right">
        <div className="text-foreground">{f.competition.name}</div>
        {f.venue && <div>{f.venue}</div>}
      </div>
    </li>
  );
}
