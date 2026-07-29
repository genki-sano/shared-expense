import { describe, expect, it } from "vitest";
import worker from "./index";

describe("API Worker entrypoint", () => {
  it("uses Cloudflare env to create the production app", async () => {
    const response = await worker.fetch(
      new Request("https://api.example.test/api/expenses?date=2026-07", {
        method: "OPTIONS",
        headers: {
          Origin: "https://liff.example.com",
          "Access-Control-Request-Method": "GET",
        },
      }),
      {
        API_ALLOWED_ORIGINS: "https://liff.example.com",
      },
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://liff.example.com",
    );
  });
});
