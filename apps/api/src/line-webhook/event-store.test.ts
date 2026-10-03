import { afterEach, expect, it, vi } from "vitest";
import { InMemoryWebhookEventStore } from "./event-store";

afterEach(() => vi.restoreAllMocks());

it("persists checkpoints, excludes simultaneous claims and skips completed events", async () => {
  const store = new InMemoryWebhookEventStore();
  const claim = (await store.claim("event"))!;
  expect(await store.claim("event")).toBeNull();
  claim.progress.replyComplete = true;
  await store.checkpoint(claim);
  await store.release(claim, false);
  const resumed = (await store.claim("event"))!;
  expect(resumed.progress.replyComplete).toBe(true);
  await store.release(resumed, true);
  expect(await store.claim("event")).toBeNull();
});

it("recovers expired leases while rejecting writes from the stale worker", async () => {
  const now = vi.spyOn(Date, "now").mockReturnValue(0);
  const store = new InMemoryWebhookEventStore();
  const stale = (await store.claim("event"))!;
  stale.progress.sentTo = ["woman"];
  await store.checkpoint(stale);
  now.mockReturnValue(120001);
  const resumed = (await store.claim("event"))!;
  expect(resumed.progress.sentTo).toEqual(["woman"]);
  await expect(store.checkpoint(stale)).rejects.toThrow("claim lost");
  await expect(store.release(stale, true)).rejects.toThrow("claim lost");
  await store.release(resumed, true);
});
