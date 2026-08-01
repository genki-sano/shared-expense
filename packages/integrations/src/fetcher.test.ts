import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultFetcher } from "./fetcher";

describe("defaultFetcher", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls global fetch without storing an unbound fetch reference", async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const fetcher = defaultFetcher();

    await fetcher("https://example.com/api", { method: "POST" });

    expect(fetchMock).toHaveBeenCalledWith("https://example.com/api", {
      method: "POST",
    });
  });
});
