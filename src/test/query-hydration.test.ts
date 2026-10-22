import { describe, expect, it, vi } from "vitest";
import { getRouter } from "@/router";

describe("SSR query hydration", () => {
  it("restores fixture and prediction snapshots without refetching on first render", async () => {
    const server = getRouter();
    const fixtures = { fixtures: [{ id: 558567, home: { shortName: "Brest" } }], error: null };
    const prediction = { fixture: { id: 558567 }, probabilities: { home: 50, draw: 30, away: 20 } };
    server.options.context.queryClient.setQueryData(["fixtures", "upcoming"], fixtures);
    server.options.context.queryClient.setQueryData(["fixtures", "featured"], prediction);

    const snapshot = await server.options.dehydrate?.();
    if (!snapshot) throw new Error("Router must serialize its query cache");
    const client = getRouter();
    await client.options.hydrate?.(snapshot);
    const refetch = vi.fn(async () => ({ fixtures: [{ id: 999, home: { shortName: "Torino" } }], error: null }));
    const restored = await client.options.context.queryClient.fetchQuery({
      queryKey: ["fixtures", "upcoming"], queryFn: refetch, staleTime: 5 * 60 * 1000,
    });

    expect(restored).toEqual(fixtures);
    expect(refetch).not.toHaveBeenCalled();
    expect(client.options.context.queryClient.getQueryData(["fixtures", "featured"])).toEqual(prediction);
  });

  it("does not share cached matches between server requests", () => {
    const first = getRouter();
    first.options.context.queryClient.setQueryData(["fixtures", "upcoming"], { fixtures: [{ id: 558567 }] });
    expect(getRouter().options.context.queryClient.getQueryData(["fixtures", "upcoming"])).toBeUndefined();
  });
});