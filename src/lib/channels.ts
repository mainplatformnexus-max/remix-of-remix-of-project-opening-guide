/**
 * Live TV channels come from the Magic 1Xtra TV feed (see tv.functions.ts).
 * This module holds the shared types and the pure mapping rules so both the
 * server function and the browser use the same logic.
 */
import movieMaxLogo from "@/assets/moviemax-logo.png.asset.json";

export interface Channel {
  id: string;
  name: string;
  short: string;
  categoryId: number | null;
  /** Category name as published by the feed, e.g. "News" */
  category: string;
  /** HTTPS HLS link or an app-local playback relay, or "" when unavailable */
  stream: string;
  /** False when the feed only has a plain http link: listed, but browsers block it on https pages */
  playable: boolean;
  /** Absolute logo URL, or null to fall back to initials */
  logo: string | null;
  /** Tailwind background class for the channel badge (design-system token) */
  badge: string;
  description: string;
  views: number;
}

export interface TvCategory {
  id: number;
  name: string;
}

/** Feed asset host for relative image paths such as "assets/uploads/tv/images/x.jpg". */
export const TV_ASSET_ROOT = "https://tvapp.hostherb.com/";

const BADGES = [
  "bg-ch-news",
  "bg-ch-sport",
  "bg-ch-science",
  "bg-ch-film",
  "bg-ch-kids",
  "bg-ch-music",
  "bg-ch-biz",
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function initials(name: string) {
  const words = name
    .replace(/\(.*?\)/g, "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  if (words.length === 0) return "TV";
  if (words.length === 1) return (words[0] as string).slice(0, 3).toUpperCase();
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function stripHtml(s: string) {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function absUrl(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  if (/^https:\/\//i.test(s)) return s;
  if (/^https?:\/\//i.test(s)) return null; // plain http images are blocked on https pages
  return TV_ASSET_ROOT + s.replace(/^\/+/, "");
}

interface RawTv {
  id?: unknown;
  title?: unknown;
  category?: unknown;
  tv_category_id?: unknown;
  description?: unknown;
  thumbnail_image?: unknown;
  logo_url?: unknown;
  total_views?: unknown;
  playback_mode?: unknown;
  external_source?: unknown;
  stream_status?: unknown;
  other_url?: unknown;
  video?: unknown;
  stream_url?: unknown;
}

function isSuperSportRelayUrl(rawUrl: string, name: string, category: string) {
  if (category.toLowerCase() !== "super sport" || !/^super\s?sport\b/i.test(name)) return false;
  try {
    const url = new URL(rawUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    return (
      url.origin === "http://197.220.88.26:2200" &&
      parts[0] === "AFR-EX" &&
      /^SuperSport_/i.test(parts[1] ?? "") &&
      parts.length >= 3 &&
      /\.m3u8$/i.test(parts.at(-1) ?? "")
    );
  } catch {
    return false;
  }
}

/**
 * Turns one feed row into a playable channel, or null when the web player cannot play it:
 * MTN secure channels, offline rows, and non-HLS streams are excluded. Plain HTTP HLS is
 * only routed through the server relay for the allowlisted Super Sport feed category/source.
 */
export function toChannel(raw: RawTv): Channel | null {
  const mode = String(raw.playback_mode ?? "").toLowerCase();
  const source = String(raw.external_source ?? "").toLowerCase();
  if (mode.includes("mtn") || source.includes("mtn")) return null;
  if (String(raw.stream_status ?? "").toLowerCase() === "offline") return null;

  const name = String(raw.title ?? "").trim() || "Untitled channel";
  const id = String(raw.id ?? name);
  const cat = (raw.category ?? {}) as { id?: unknown; name?: unknown };
  const category = typeof cat.name === "string" && cat.name.trim() ? cat.name.trim() : "Live TV";
  const catId = Number(raw.tv_category_id ?? cat.id);

  const links = [raw.other_url, raw.video, raw.stream_url]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((u) => u.toLowerCase().includes(".m3u8") && !u.includes("mtntv.co.ug"));
  const secure = links.find((u) => /^https:\/\//i.test(u));
  const insecure = links.find((u) => /^http:\/\//i.test(u));
  const relayAllowed = Boolean(insecure && isSuperSportRelayUrl(insecure, name, category));
  if (!secure && !insecure) return null;
  const stream =
    secure ?? (relayAllowed ? `/api/sports-stream?channel=${encodeURIComponent(id)}` : "");

  let description = stripHtml(String(raw.description ?? ""));
  if (
    !description ||
    description.toLowerCase() === name.toLowerCase() ||
    /^imported from/i.test(description)
  ) {
    description = `Live ${category.toLowerCase()} channel.`;
  }

  return {
    id,
    name,
    short: initials(name),
    categoryId: Number.isFinite(catId) && catId > 0 ? catId : null,
    category,
    stream,
    playable: Boolean(secure || relayAllowed),
    logo: absUrl(raw.thumbnail_image) ?? absUrl(raw.logo_url),
    badge: BADGES[hash(id) % BADGES.length] as string,
    description,
    views: Number(raw.total_views) || 0,
  };
}

export function toChannels(rows: unknown): Channel[] {
  if (!Array.isArray(rows)) return [];
  const seen = new Set<string>();
  const out: Channel[] = [];
  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    const c = toChannel(r as RawTv);
    if (c && !seen.has(c.id)) {
      seen.add(c.id);
      out.push(c);
    }
  }
  return out;
}

/** Placeholder shown in the player area until the first channel arrives. */
export const NO_CHANNEL: Channel = {
  id: "none",
  name: "Loading channels…",
  short: "TV",
  categoryId: null,
  category: "Live TV",
  stream: "",
  playable: false,
  logo: null,
  badge: "bg-ch-film",
  description: "Pick a channel from the list.",
  views: 0,
};

export type ShelfTab = "trending" | "music" | "movies";

export const SHELF_TABS: { id: ShelfTab; label: string }[] = [
  { id: "trending", label: "Trending" },
  { id: "music", label: "Music" },
  { id: "movies", label: "Movies" },
];

/** Feed category each bottom-bar tab draws from. */
export const SHELF_CATEGORY: Record<ShelfTab, string> = {
  trending: "1Xtra On Demand",
  music: "Music",
  movies: "Movies",
};

/** Trending = most watched first. Music/Movies keep the feed's own order. */
export function shelfChannels(channels: Channel[], tab: ShelfTab): Channel[] {
  if (tab === "trending") return [...channels].sort((a, b) => b.views - a.views).slice(0, 20);
  return channels.slice(0, 20);
}

/**
 * "Popular" is the app's own category, shown before every feed category and opened by default.
 * Its id is negative so it can never clash with a feed category id.
 */
export const POPULAR_ID = -1;
export const POPULAR_NAME = "Popular";

/** Movie Max's own channel: first in Popular and the channel that plays on first visit. */
export const MOVIE_MAX: Channel = {
  id: "moviemax",
  name: "Movie Max",
  short: "MM",
  categoryId: POPULAR_ID,
  category: POPULAR_NAME,
  stream: "https://watch.hostherb.com/tv-257/index.m3u8",
  playable: true,
  logo: movieMaxLogo.url,
  badge: "bg-ch-film",
  description: "Movie Max live — movies, series and entertainment around the clock.",
  views: 0,
};

/**
 * Feed channels from the user's popular-channel lists that the feed carries with a stream the
 * web player can play. Each is looked up live (by title inside its feed category) and only
 * shown while the feed still lists it as online and playable. Order = order shown in Popular.
 * Left out on purpose: matches whose stream refuses web players (no CORS), e.g. BBS TV, Classica.
 */
export interface PopularPick {
  /** Feed channel id */
  id: string;
  /** Feed title, used to search the category */
  title: string;
  /** Feed category the channel lives in */
  categoryId: number;
}

/** Feed categories small enough to load whole (one request) instead of a search per channel. */
export const POPULAR_WHOLE_CATEGORIES = [7, 193];

export const POPULAR_PICKS: PopularPick[] = [
  // Uganda & East Africa
  { id: "13579", title: "NTV Uganda", categoryId: 7 },
  { id: "8", title: "Bukedde TV", categoryId: 7 },
  { id: "9", title: "Bukedde TV2", categoryId: 7 },
  { id: "13580", title: "Spark TV", categoryId: 7 },
  { id: "10", title: "TV West", categoryId: 7 },
  { id: "13697", title: "Tayari West TV", categoryId: 7 },
  { id: "5321", title: "K24", categoryId: 12 },
  { id: "11468", title: "TV10", categoryId: 12 },
  // Sport
  { id: "13710", title: "SuperSport LaLiga", categoryId: 193 },
  { id: "13712", title: "SuperSport WWE", categoryId: 193 },
  { id: "12779", title: "WWE Superstar Central", categoryId: 12 },
  { id: "4177", title: "Fuel TV", categoryId: 6 },
  // News
  { id: "7", title: "BBC News", categoryId: 10 },
  { id: "6", title: "CNN", categoryId: 10 },
  { id: "567", title: "Al Jazeera", categoryId: 10 },
  { id: "471", title: "Africanews English", categoryId: 10 },
  { id: "4134", title: "France 24 FAST English", categoryId: 12 },
  { id: "7092", title: "News Central", categoryId: 10 },
  { id: "13686", title: "Bloomberg", categoryId: 7 },
  { id: "7124", title: "NHK World-Japan", categoryId: 20 },
  // Music & entertainment
  { id: "4677", title: "HIPTV", categoryId: 12 },
  // Documentary
  { id: "2406", title: "CGTN Documentary", categoryId: 43 },
  { id: "12681", title: "WildEarth", categoryId: 43 },
  // Faith
  { id: "3873", title: "Faith TV", categoryId: 11 },
  { id: "3064", title: "Daystar TV", categoryId: 11 },
  { id: "9553", title: "SBN TV", categoryId: 11 },
  { id: "3829", title: "EWTN Africa-Asia", categoryId: 11 },
  { id: "10320", title: "Sunna TV", categoryId: 12 },
];

/**
 * Channels in Popular, in display order: Movie Max first, then every popular pick found live
 * in the feed (`found`) that the web player can play. Picks missing from `found` are left out.
 */
export function popularChannels(found: Channel[] = []): Channel[] {
  const byId = new Map(found.map((c) => [c.id, c]));
  const picks = POPULAR_PICKS.map((p) => byId.get(p.id)).filter((c): c is Channel => Boolean(c?.playable));
  return [MOVIE_MAX, ...picks];
}

export function findCategoryId(categories: TvCategory[], name: string): number | null {
  const n = name.toLowerCase();
  return categories.find((c) => c.name.toLowerCase() === n)?.id ?? null;
}
