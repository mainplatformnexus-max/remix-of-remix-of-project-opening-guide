import { createServerFn } from "@tanstack/react-start";
import { toChannels, type Channel, type TvCategory } from "./channels";

const FEED = "https://magic1xtra.com/api-proxy.php?path=";
const PER_PAGE = 100;

interface FeedBody {
  status?: unknown;
  message?: unknown;
  data?: unknown;
  pagination?: { total_pages?: unknown; total_items?: unknown };
}

async function feed(path: string): Promise<FeedBody> {
  const res = await fetch(FEED + encodeURIComponent(path), {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`TV feed answered ${res.status}`);
  const body = (await res.json()) as FeedBody;
  if (body.status && body.status !== "success") throw new Error(String(body.message ?? "TV feed error"));
  return body;
}

export const getTvCategories = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ categories: TvCategory[]; error: string | null }> => {
    try {
      const body = await feed("/tv-categories?per_page=100");
      const rows = Array.isArray(body.data) ? (body.data as { id?: unknown; name?: unknown }[]) : [];
      const categories = rows
        .map((r) => ({ id: Number(r.id), name: String(r.name ?? "").trim() }))
        .filter((c) => Number.isInteger(c.id) && c.id > 0 && c.name);
      return { categories, error: null };
    } catch (e) {
      console.error("getTvCategories failed", e);
      return { categories: [], error: "Channel categories are unavailable right now." };
    }
  },
);

export interface TvPage {
  channels: Channel[];
  page: number;
  totalPages: number;
  /** Channels in this list (exact when everything fits one page, otherwise the feed total) */
  count: number;
  /** Search matches the web player can't play (insecure http links, MTN secure, offline) */
  hidden?: number;
  error: string | null;
}

function tvQs(page: number, search: string) {
  const qs = new URLSearchParams({ per_page: String(PER_PAGE), page: String(page) });
  if (search) qs.set("search", search);
  return qs.toString();
}

const cleanSearch = (v: unknown) => String(v ?? "").trim().slice(0, 80);

/**
 * One page of a category. Only the category listing carries stream links;
 * the feed's plain /tvs list leaves them out.
 */
export const getTvPage = createServerFn({ method: "GET" })
  .inputValidator((d: { categoryId: number; page: number }) => {
    const categoryId = Math.trunc(Number(d.categoryId));
    if (!(categoryId > 0)) throw new Error("Invalid category");
    const page = Math.min(1000, Math.max(1, Math.trunc(Number(d.page) || 1)));
    return { categoryId, page };
  })
  .handler(async ({ data }): Promise<TvPage> => {
    try {
      const body = await feed(`/categories/${data.categoryId}/tvs?${tvQs(data.page, "")}`);
      const pg = body.pagination ?? {};
      const totalPages = Math.max(1, Number(pg.total_pages) || 1);
      const channels = toChannels(body.data);
      const rows = Array.isArray(body.data) ? body.data.length : 0;
      const count = totalPages <= 1 ? channels.length : Number(pg.total_items) || channels.length;
      return { channels, page: data.page, totalPages, count, hidden: Math.max(0, rows - channels.length), error: null };
    } catch (e) {
      console.error("getTvPage failed", e);
      return { channels: [], page: data.page, totalPages: data.page, count: 0, error: "Channels could not load. Try again." };
    }
  });

/**
 * Search across the whole feed: the global search finds which categories hold matches,
 * then each of those categories is searched to get the playable stream links.
 */
export const searchTvs = createServerFn({ method: "GET" })
  .inputValidator((d: { search: string }) => ({ search: cleanSearch(d.search) }))
  .handler(async ({ data }): Promise<TvPage> => {
    const empty = { channels: [], page: 1, totalPages: 1, count: 0 };
    if (!data.search) return { ...empty, error: null };
    try {
      const found = await feed(`/tvs?${tvQs(1, data.search)}`);
      const rows = Array.isArray(found.data) ? (found.data as { tv_category_id?: unknown }[]) : [];
      const hits = new Map<number, number>();
      for (const r of rows) {
        const id = Number(r.tv_category_id);
        if (id > 0) hits.set(id, (hits.get(id) ?? 0) + 1);
      }
      const catIds = [...hits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id]) => id);
      const pages = await Promise.all(
        catIds.map((id) =>
          feed(`/categories/${id}/tvs?${tvQs(1, data.search)}`)
            .then((b) => ({ found: Array.isArray(b.data) ? b.data.length : 0, channels: toChannels(b.data) }))
            .catch(() => ({ found: 0, channels: [] as Channel[] })),
        ),
      );
      const seen = new Set<string>();
      const channels = pages
        .flatMap((p) => p.channels)
        .filter((c) => !seen.has(c.id) && Boolean(seen.add(c.id)));
      const matched = pages.reduce((n, p) => n + p.found, 0);
      return { ...empty, channels, count: channels.length, hidden: Math.max(0, matched - channels.length), error: null };
    } catch (e) {
      console.error("searchTvs failed", e);
      return { ...empty, error: "Search is unavailable right now. Try again." };
    }
  });
