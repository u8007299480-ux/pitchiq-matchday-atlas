import { Link } from "@tanstack/react-router";
import { ChevronsRight } from "lucide-react";
import { Logo } from "./Logo";

export function SiteHeader({ live }: { live: boolean | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-10">
          <Link to="/"><Logo /></Link>
          <nav className="hidden gap-8 font-mono text-xs tracking-[0.25em] text-muted-foreground md:flex">
            <a href="/#predictions" className="hover:text-foreground">PREDICTIONS</a>
            <a href="/#engine" className="hover:text-foreground">ANALYSIS</a>
            <Link to="/fixtures" className="hover:text-foreground">LEAGUES</Link>
            <a href="/#faq" className="hover:text-foreground">FAQ</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {live !== null && (
            <span className="hidden items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground sm:flex">
              <span className={`h-2 w-2 rounded-full ${live ? "bg-primary" : "bg-destructive"}`} />
              {live ? "Live data" : "Data offline"}
            </span>
          )}
          <Link to="/app" className="flex items-center gap-1 font-mono text-sm font-bold tracking-[0.2em]">
            <ChevronsRight className="h-4 w-4 text-primary" /> OPEN APP
          </Link>
        </div>
      </div>
    </header>
  );
}
