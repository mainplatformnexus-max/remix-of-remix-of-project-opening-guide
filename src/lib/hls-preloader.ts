const MAX_CONCURRENT_PRELOADS = 2;

type WarmTarget = { kind: "playlist" | "media"; url: string };

const queued = new Set<string>();
const attempted = new Set<string>();
const queue: string[] = [];
let active = 0;

export function resolveStreamSource(src: string, baseUrl: URL): string | null {
  try {
    const url = new URL(src, baseUrl);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function nextWarmTarget(manifest: string, baseUrl: URL): WarmTarget | null {
  const lines = manifest
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const variants: { bandwidth: number; url: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line?.startsWith("#EXT-X-STREAM-INF:")) continue;
    const nextLine = lines.slice(i + 1).find((candidate) => !candidate.startsWith("#"));
    if (!nextLine) continue;
    try {
      const bandwidth = Number(line.match(/\bBANDWIDTH=(\d+)/)?.[1]) || Number.MAX_SAFE_INTEGER;
      const url = new URL(nextLine, baseUrl).href;
      if (url.startsWith("https://") || url.startsWith("http://")) {
        variants.push({ bandwidth, url });
      }
    } catch {
      // Ignore invalid manifest references.
    }
  }

  if (variants.length) {
    variants.sort((a, b) => a.bandwidth - b.bandwidth);
    return { kind: "playlist", url: variants[0]!.url };
  }

  const parts = lines
    .filter((line) => line.startsWith("#EXT-X-PART:"))
    .map((line) => line.match(/\bURI=(["'])(.*?)\1/)?.[2])
    .filter((uri): uri is string => Boolean(uri));
  const segments = lines.filter((line) => !line.startsWith("#"));
  const mediaUri = parts.at(-1) ?? segments.at(-1);
  if (!mediaUri) return null;

  try {
    const url = new URL(mediaUri, baseUrl).href;
    if (!url.startsWith("https://") && !url.startsWith("http://")) return null;
    return { kind: "media", url };
  } catch {
    return null;
  }
}

async function fetchPlaylist(
  url: string,
): Promise<{ response: Response; manifest: string } | null> {
  try {
    const response = await fetch(url, {
      cache: "force-cache",
      credentials: "omit",
      mode: "cors",
    });
    if (!response.ok) return null;
    return { response, manifest: await response.text() };
  } catch {
    // A source that does not permit browser-side preloading can still play in the player.
    return null;
  }
}

async function warmStream(src: string): Promise<void> {
  const first = await fetchPlaylist(src);
  if (!first) return;

  const next = nextWarmTarget(first.manifest, new URL(first.response.url || src));
  if (!next) return;

  if (next.kind === "media") {
    try {
      const response = await fetch(next.url, {
        cache: "force-cache",
        credentials: "omit",
        mode: "cors",
      });
      if (response.ok) await response.arrayBuffer();
    } catch {
      // Best-effort only. Playback will make its own request if warming fails.
    }
    return;
  }

  const mediaPlaylist = await fetchPlaylist(next.url);
  if (!mediaPlaylist) return;
  const media = nextWarmTarget(
    mediaPlaylist.manifest,
    new URL(mediaPlaylist.response.url || next.url),
  );
  if (!media || media.kind !== "media") return;

  try {
    const response = await fetch(media.url, {
      cache: "force-cache",
      credentials: "omit",
      mode: "cors",
    });
    if (response.ok) await response.arrayBuffer();
  } catch {
    // Best-effort only. Playback will make its own request if warming fails.
  }
}

function pumpQueue() {
  while (active < MAX_CONCURRENT_PRELOADS && queue.length) {
    const src = queue.shift();
    if (!src) continue;
    queued.delete(src);
    active++;
    void warmStream(src)
      .catch(() => undefined)
      .finally(() => {
        attempted.add(src);
        active--;
        pumpQueue();
      });
  }
}

/** Warm each playable channel's lowest-quality live segment once, with bounded concurrency. */
export function preloadStreams(sources: string[]): void {
  if (typeof window === "undefined") return;
  const baseUrl = new URL(window.location.href);
  for (const src of sources) {
    const absoluteSrc = resolveStreamSource(src, baseUrl);
    if (!absoluteSrc || attempted.has(absoluteSrc) || queued.has(absoluteSrc)) continue;
    queued.add(absoluteSrc);
    queue.push(absoluteSrc);
  }
  pumpQueue();
}

export { nextWarmTarget };
