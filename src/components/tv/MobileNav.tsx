import { Tv, Newspaper, Trophy, CalendarDays, LogIn } from "lucide-react";
import movieMaxLogo from "@/assets/moviemax-logo.png.asset.json";
import { cn } from "@/lib/utils";
import { comingSoon } from "@/lib/coming-soon";
import type { TopTab } from "@/components/tv/TopBar";

const TABS: { id: TopTab; label: string; Icon: typeof Tv }[] = [
  { id: "live", label: "Live", Icon: Tv },
  { id: "news", label: "News", Icon: Newspaper },
  { id: "sport", label: "Sport", Icon: Trophy },
  { id: "guide", label: "Guide", Icon: CalendarDays },
];

export function MobileNav({ tab, onTab }: { tab: TopTab; onTab: (t: TopTab) => void }) {
  return (
    <nav
      aria-label="Mobile navigation"
      className="shrink-0 border-t border-border bg-frame px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] md:hidden"
    >
      <div className="grid grid-cols-[auto_repeat(4,minmax(0,1fr))_auto] items-center gap-1">
        <button
          type="button"
          onClick={comingSoon}
          aria-label="Movie Max"
          className="flex min-w-0 flex-col items-center gap-0.5 px-1"
        >
          <img src={movieMaxLogo.url} alt="Movie Max" className="h-7 w-7 shrink-0 object-contain" />
          <span className="text-[8px] font-extrabold leading-none tracking-wide text-cyan">MOVIE MAX</span>
        </button>
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => onTab(id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-col items-center gap-0.5 rounded-xl py-1 text-[10px] font-extrabold uppercase tracking-wide transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "grid h-7 w-11 place-items-center rounded-full transition-colors",
                  active && "bg-primary text-primary-foreground shadow-soft",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              {label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={comingSoon}
          className="flex flex-col items-center gap-0.5 px-1 text-[10px] font-extrabold uppercase tracking-wide text-foreground"
        >
          <span className="rim grid h-7 w-9 place-items-center rounded-full">
            <LogIn className="h-4 w-4" />
          </span>
          Login
        </button>
      </div>
    </nav>
  );
}
