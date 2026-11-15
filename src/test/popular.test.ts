import { describe, expect, it } from "vitest";
import { MOVIE_MAX, NO_CHANNEL, POPULAR_PICKS, popularChannels, type Channel } from "@/lib/channels";

const feedChannel = (id: string, playable = true): Channel => ({ ...NO_CHANNEL, id, name: id, playable, stream: playable ? "https://x/y.m3u8" : "" });

describe("Popular category", () => {
  it("puts Movie Max first, playing the Movie Max stream", () => {
    const first = popularChannels()[0];
    expect(first?.name).toBe("Movie Max");
    expect(first?.stream).toBe("https://watch.hostherb.com/tv-257/index.m3u8");
    expect(first?.playable).toBe(true);
  });

  it("adds found popular channels after Movie Max, in the popular list order", () => {
    const [a, b] = POPULAR_PICKS;
    const ids = popularChannels([feedChannel(b!.id), feedChannel(a!.id), feedChannel("not-popular")]).map((c) => c.id);
    expect(ids).toEqual([MOVIE_MAX.id, a!.id, b!.id]);
  });

  it("leaves out popular channels the feed no longer lists or cannot play", () => {
    const [a, b] = POPULAR_PICKS;
    const ids = popularChannels([feedChannel(a!.id, false)]).map((c) => c.id);
    expect(ids).toEqual([MOVIE_MAX.id]);
    expect(ids).not.toContain(b!.id);
  });
});
