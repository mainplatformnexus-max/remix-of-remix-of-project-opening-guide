import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
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
    const data = await new QueryClient().fetchInfiniteQuery(tvChannelsQuery(POPULAR_ID, "", [1, 2]));
    expect(data.pages[0]?.channels[0]?.id).toBe(MOVIE_MAX.id);
  });
});
