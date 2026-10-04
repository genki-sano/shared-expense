import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LineMessagingClient } from "@shared-expense/integrations";
import type { ExpenseRepository } from "../core/expenses/repository";
import { InMemoryExpenseRepository } from "../expenses/repository";
import { InMemoryHouseholdUserRepository } from "../core/users/repository";
import { createLineWebhookRoutes } from "./routes";

const actor = {
  id: "woman",
  lineUserId: "line-woman-private",
  displayName: "A",
  notifyEnabled: true,
};
const partner = {
  id: "man",
  lineUserId: "line-man-private",
  displayName: "B",
  notifyEnabled: true,
};
function fixture() {
  const tasks: Promise<void>[] = [];
  const repository = new InMemoryExpenseRepository([]);
  const client = {
    replyMessage: vi.fn<LineMessagingClient["replyMessage"]>(async () => {}),
    pushMessage: vi.fn<LineMessagingClient["pushMessage"]>(async () => {}),
  } satisfies LineMessagingClient;
  const dependencies = {
    channelSecret: "secret",
    expenseRepository: repository as ExpenseRepository,
    lineMessagingClient: client,
    userRepository: new InMemoryHouseholdUserRepository([actor, partner]),
    schedule: (task: Promise<void>) => {
      tasks.push(task);
    },
  };
  return {
    tasks,
    repository,
    client,
    dependencies,
    app: () => createLineWebhookRoutes(dependencies),
  };
}
function event(id = "event-1") {
  return {
    type: "message",
    webhookEventId: id,
    replyToken: "private-reply-token",
    source: { userId: actor.lineUserId },
    message: { type: "text", text: "1200 private-memo" },
  };
}
async function request(
  app: ReturnType<typeof createLineWebhookRoutes>,
  events: unknown = [event()],
  validSignature = true,
) {
  const body = JSON.stringify({ events });
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode("secret"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = Buffer.from(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)),
  ).toString("base64");
  return app.request("/", {
    method: "POST",
    headers: { "x-line-signature": validSignature ? signature : "bad" },
    body,
  });
}
beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("asynchronous LINE webhook without persistent state", () => {
  it("acknowledges before slow storage completes, then confirms and logs safely", async () => {
    const f = fixture();
    let unblock!: () => void;
    const blocked = new Promise<void>((resolve) => {
      unblock = resolve;
    });
    const original = f.repository.create.bind(f.repository);
    vi.spyOn(f.repository, "create").mockImplementation(async (input) => {
      await blocked;
      return original(input);
    });
    expect((await request(f.app())).status).toBe(200);
    expect(f.tasks).toHaveLength(1);
    expect(f.client.replyMessage).not.toHaveBeenCalled();
    unblock();
    await Promise.all(f.tasks);
    expect(f.client.replyMessage).toHaveBeenCalledOnce();
    expect(f.client.pushMessage).toHaveBeenCalledTimes(1);
    expect(f.client.pushMessage.mock.calls.map(([input]) => input.to)).toEqual([
      partner.lineUserId,
    ]);
    expect(console.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "line_webhook.save_completed",
        expenseId: "exp_1",
      }),
    );
    expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toMatch(
      /private-memo|private-reply-token|line-woman-private|line-man-private/,
    );
  });
  it("rejects invalid signatures and bodies without scheduling processing", async () => {
    const f = fixture();
    expect((await request(f.app(), [event()], false)).status).toBe(401);
    expect((await request(f.app(), null)).status).toBe(400);
    expect(f.tasks).toHaveLength(0);
  });
  it("accepts verification requests with no events without a storage binding", async () => {
    const f = fixture();
    expect((await request(f.app(), [])).status).toBe(200);
    await Promise.all(f.tasks);
    expect(f.client.replyMessage).not.toHaveBeenCalled();
  });
  it("logs a save failure and isolates it from other events in the same batch", async () => {
    const f = fixture();
    const original = f.repository.create.bind(f.repository);
    vi.spyOn(f.repository, "create")
      .mockRejectedValueOnce(new Error("save unavailable"))
      .mockImplementation(original);
    expect((await request(f.app(), [event(), event("event-2")])).status).toBe(
      200,
    );
    await Promise.all(f.tasks);
    expect(f.client.pushMessage).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "line_webhook.save_failed",
        webhookEventId: "event-1",
      }),
    );
    expect(console.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "line_webhook.processing_completed",
        webhookEventId: "event-2",
      }),
    );
  });
  it("does not push to the actor after reply failure and skips an unregistered partner", async () => {
    const f = fixture();
    f.dependencies.userRepository = new InMemoryHouseholdUserRepository([
      actor,
      { ...partner, lineUserId: "" },
    ]);
    f.client.replyMessage.mockRejectedValue(new Error("expired reply token"));
    await request(f.app());
    await Promise.all(f.tasks);
    expect(f.client.pushMessage).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      expect.objectContaining({ event: "line_webhook.reply_failed" }),
    );
    expect(console.error).toHaveBeenCalledWith(
      expect.objectContaining({ event: "line_webhook.processing_failed" }),
    );
    expect(console.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "line_webhook.push_skipped",
        reason: "unregistered recipient",
      }),
    );
  });
  it("logs a partner push failure without rolling back the save", async () => {
    const f = fixture();
    const save = vi.spyOn(f.repository, "create");
    f.client.pushMessage.mockRejectedValueOnce(new Error("push failed"));
    await request(f.app());
    await Promise.all(f.tasks);
    expect(save).toHaveBeenCalledOnce();
    expect(f.client.pushMessage).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "line_webhook.push_failed",
        recipientUserId: "man",
      }),
    );
    expect(console.error).toHaveBeenCalledWith(
      expect.objectContaining({ event: "line_webhook.processing_failed" }),
    );
  });
  it("still notifies the partner when actor Reply fails", async () => {
    const f = fixture();
    f.client.replyMessage.mockRejectedValue(new Error("reply failed"));
    await request(f.app());
    await Promise.all(f.tasks);
    expect(f.client.pushMessage.mock.calls.map(([input]) => input.to)).toEqual([
      partner.lineUserId,
    ]);
    expect(console.error).toHaveBeenCalledWith(
      expect.objectContaining({ event: "line_webhook.reply_failed" }),
    );
  });
  it("does not push when partner notifications are disabled", async () => {
    const f = fixture();
    f.dependencies.userRepository = new InMemoryHouseholdUserRepository([
      actor,
      { ...partner, notifyEnabled: false },
    ]);
    await request(f.app());
    await Promise.all(f.tasks);
    expect(f.client.replyMessage).toHaveBeenCalledOnce();
    expect(f.client.pushMessage).not.toHaveBeenCalled();
  });
});
