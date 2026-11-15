import { describe, expect, it } from "vitest";
import { MOVIE_MAX, POPULAR_ID, popularChannels } from "@/lib/channels";
import { tvChannelsQuery } from "@/lib/tv-queries";

describe("Popular category", () => {
  it("puts Movie Max first, playing the Movie Max stream", () => {
    const first = popularChannels()[0];
    expect(first?.name).toBe("Movie Max");
    expect(first?.stream).toBe("https://watch.hostherb.com/tv-257/index.m3u8");
    expect(first?.playable).toBe(true);
  });

  it("lists Movie Max when the Popular category is opened", async () => {
    const q = tvChannelsQuery(POPULAR_ID, "", [1, 2]);
    const page = await (q.queryFn as (ctx: { pageParam: { idx: number; page: number } }) => Promise<{ channels: { id: string }[] }>)({
      pageParam: { idx: 0, page: 1 },
    });
    expect(page.channels[0]?.id).toBe(MOVIE_MAX.id);
  });
});
