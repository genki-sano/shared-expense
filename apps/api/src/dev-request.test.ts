import { Readable } from "node:stream";
import type { IncomingMessage } from "node:http";
import { describe, expect, it } from "vitest";
import { createNodeRequest } from "./dev-request";

describe("createNodeRequest", () => {
  it("preserves JSON request bodies for mutation requests", async () => {
    const incoming = Object.assign(
      Readable.from([
        JSON.stringify({
          date: "2026-07-27",
          price: 1200,
          category: "食費",
          memo: "ランチ",
        }),
      ]),
      {
        headers: {
          host: "localhost:8787",
          authorization: "Bearer local-dev",
          "content-type": "application/json",
        },
        method: "POST",
        url: "/api/expenses",
      },
    ) as IncomingMessage;

    const request = createNodeRequest(incoming, 8787);

    expect(request.method).toBe("POST");
    expect(request.url).toBe("http://localhost:8787/api/expenses");
    expect(request.headers.get("authorization")).toBe("Bearer local-dev");
    await expect(request.json()).resolves.toEqual({
      date: "2026-07-27",
      price: 1200,
      category: "食費",
      memo: "ランチ",
    });
  });

  it("does not attach a body to GET requests", () => {
    const incoming = Object.assign(Readable.from([]), {
      headers: { host: "localhost:8787" },
      method: "GET",
      url: "/health",
    }) as IncomingMessage;

    const request = createNodeRequest(incoming, 8787);

    expect(request.method).toBe("GET");
    expect(request.body).toBeNull();
  });
});
