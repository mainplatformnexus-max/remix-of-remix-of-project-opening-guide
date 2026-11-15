import { Search, LogIn, Tv, Film, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TopTab = "live" | "news" | "sport" | "guide";

const TABS: { id: TopTab; label: string }[] = [
  { id: "live", label: "Live TV" },
  { id: "news", label: "News" },
  { id: "sport", label: "Sport" },
  { id: "guide", label: "TV Guide" },
];

export function TopBar({
  tab,
  onTab,
  query,
  onQuery,
}: {
  tab: TopTab;
  onTab: (t: TopTab) => void;
  query: string;
  onQuery: (q: string) => void;
}) {
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-frame px-3 py-2 sm:px-4">
      <a href="https://luofilm.site" className="flex shrink-0 items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-hot shadow-glow">
          <Tv className="h-4 w-4 text-primary-foreground" />
        </span>
        <span className="leading-none">
          <span className="block text-sm font-extrabold tracking-wide text-cyan">MOVIE MAX</span>
          <span className="block text-[9px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
            Live TV
          </span>
        </span>
      </a>

      <nav className="order-3 flex w-full justify-center gap-1 md:order-none md:w-auto md:flex-1">
        <div className="rim flex items-center gap-1 rounded-full p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => onTab(t.id)}
              className={cn(
                "whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-extrabold sm:px-3 sm:text-[11px] uppercase tracking-wide transition-colors",
                tab === t.id
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-foreground/80 hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <label className="rim hidden items-center gap-2 rounded-full px-3 py-1.5 xl:flex">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search channels"
            className="w-36 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </label>
        <Button asChild variant="softInfo" size="xs" className="hidden uppercase lg:inline-flex">
          <a href="https://luofilm.site">
            <Film /> Movies
          </a>
        </Button>
        <Button asChild variant="softGold" size="xs" className="hidden uppercase sm:inline-flex">
          <a href="https://luofilm.site">
            <Crown /> Subscribe
          </a>
        </Button>
        <Button asChild variant="softLight" size="xs" className="uppercase">
          <a href="https://luofilm.site">
            <LogIn /> Login
          </a>
        </Button>
      </div>
    </header>
  );
}
