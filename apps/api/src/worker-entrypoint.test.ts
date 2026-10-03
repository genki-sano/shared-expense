import { describe, expect, it, vi } from "vitest";
import worker from "./index";
import * as appModule from "./app";

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

it("registers background work on the original Worker execution context", async () => {
  const original = appModule.createAppFromEnv;
  let schedule: ((task: Promise<void>) => void) | undefined;
  const factory = vi
    .spyOn(appModule, "createAppFromEnv")
    .mockImplementation((env, dependencies) => {
      schedule = dependencies?.scheduleWebhook;
      return original(env, dependencies);
    });
  const tasks: Promise<unknown>[] = [];
  const context = {
    tasks,
    waitUntil(task: Promise<unknown>) {
      this.tasks.push(task);
    },
  };
  try {
    await worker.fetch(
      new Request("https://api.example.test/health"),
      {},
      context,
    );
    const task = Promise.resolve();
    schedule!(task);
    expect(tasks).toEqual([task]);
  } finally {
    factory.mockRestore();
  }
});
