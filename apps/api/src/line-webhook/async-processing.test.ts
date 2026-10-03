import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LineMessagingClient } from "@shared-expense/integrations";
import type { ExpenseRepository } from "../core/expenses/repository";
import { InMemoryExpenseRepository } from "../expenses/repository";
import { InMemoryHouseholdUserRepository } from "../core/users/repository";
import { InMemoryWebhookEventStore } from "./event-store";
import { createLineWebhookRoutes, webhookPushRetryKey } from "./routes";

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
  const store = new InMemoryWebhookEventStore();
  const repository = new InMemoryExpenseRepository([]);
  const client = {
    replyMessage: vi.fn<LineMessagingClient["replyMessage"]>(async () => {}),
    pushMessage: vi.fn<LineMessagingClient["pushMessage"]>(async () => {}),
  } satisfies LineMessagingClient;
  const dependencies = {
    channelSecret: "secret",
    eventStore: store,
    expenseRepository: repository as ExpenseRepository,
    lineMessagingClient: client,
    userRepository: new InMemoryHouseholdUserRepository([actor, partner]),
    schedule: (task: Promise<void>) => {
      tasks.push(task);
    },
  };
  return {
    tasks,
    store,
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
  events = [event()],
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

describe("asynchronous LINE webhook", () => {
  it("acknowledges before a slow save finishes and then sends confirmations", async () => {
    const f = fixture();
    let unblock!: () => void;
    const blocked = new Promise<void>((resolve) => {
      unblock = resolve;
    });
    const original = f.repository.create.bind(f.repository);
    const save = vi
      .spyOn(f.repository, "create")
      .mockImplementation(async (input) => {
        await blocked;
        return original(input);
      });
    const response = await request(f.app());
    expect(response.status).toBe(200);
    expect(f.tasks).toHaveLength(1);
    expect(f.client.replyMessage).not.toHaveBeenCalled();
    unblock();
    await Promise.all(f.tasks);
    expect(save).toHaveBeenCalledOnce();
    expect(f.client.replyMessage).toHaveBeenCalledOnce();
    expect(f.client.pushMessage).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[0]?.[0].id).toBe("line_event-1");
    expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toMatch(
      /private-memo|private-reply-token|line-woman-private|line-man-private/,
    );
  });
  it("rejects bad signatures, missing IDs and missing storage before acknowledgment", async () => {
    const f = fixture();
    expect((await request(f.app(), [event()], false)).status).toBe(401);
    expect(
      (await request(f.app(), [{ ...event(), webhookEventId: "" }])).status,
    ).toBe(400);
    expect(
      (
        await request(
          createLineWebhookRoutes({ ...f.dependencies, eventStore: null }),
        )
      ).status,
    ).toBe(503);
    expect(f.tasks).toHaveLength(0);
  });
  it("does not save or notify twice for concurrent and completed redeliveries", async () => {
    const f = fixture();
    const save = vi.spyOn(f.repository, "create");
    await Promise.all([request(f.app()), request(f.app())]);
    await Promise.all(f.tasks);
    await request(f.app());
    await Promise.all(f.tasks);
    expect(save).toHaveBeenCalledOnce();
    expect(f.client.replyMessage).toHaveBeenCalledOnce();
    expect(f.client.pushMessage).toHaveBeenCalledTimes(2);
  });
  it("replays only failed recipient delivery without saving or repeating successful delivery", async () => {
    const f = fixture();
    const save = vi.spyOn(f.repository, "create");
    let fail = true;
    f.client.pushMessage.mockImplementation(async (input) => {
      if (input.to === partner.lineUserId && fail)
        throw new Error("temporary push failure");
    });
    await request(f.app());
    await Promise.all(f.tasks);
    fail = false;
    await request(f.app());
    await Promise.all(f.tasks);
    expect(save).toHaveBeenCalledOnce();
    expect(f.client.replyMessage).toHaveBeenCalledOnce();
    expect(f.client.pushMessage.mock.calls.map(([input]) => input.to)).toEqual([
      actor.lineUserId,
      partner.lineUserId,
      partner.lineUserId,
    ]);
    expect(f.client.pushMessage.mock.calls[1]?.[0].retryKey).toBe(
      f.client.pushMessage.mock.calls[2]?.[0].retryKey,
    );
    expect(console.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "line_webhook.push_failed",
        webhookEventId: "event-1",
        recipientUserId: "man",
      }),
    );
  });
  it("recovers an append that succeeded before its response was lost", async () => {
    const f = fixture();
    const original = f.repository.create.bind(f.repository);
    const save = vi
      .spyOn(f.repository, "create")
      .mockImplementation(async (input) => {
        await original(input);
        throw new Error("response lost");
      });
    await request(f.app());
    await Promise.all(f.tasks);
    await request(f.app());
    await Promise.all(f.tasks);
    expect(save).toHaveBeenCalledOnce();
    expect(f.client.pushMessage).toHaveBeenCalledTimes(2);
    expect(console.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "line_webhook.save_recovered",
        expenseId: "line_event-1",
      }),
    );
  });
  it("does not re-append when the previous save outcome is unknown and no row can be found", async () => {
    const f = fixture();
    const save = vi
      .spyOn(f.repository, "create")
      .mockRejectedValue(new Error("network failure"));
    await request(f.app());
    await Promise.all(f.tasks);
    await request(f.app());
    await Promise.all(f.tasks);
    expect(save).toHaveBeenCalledOnce();
    expect(f.client.pushMessage).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "line_webhook.processing_failed",
        reason: expect.stringContaining("uncertain"),
      }),
    );
  });
  it("continues with actor push if reply fails and skips unregistered partners", async () => {
    const f = fixture();
    f.dependencies.userRepository = new InMemoryHouseholdUserRepository([
      actor,
      { ...partner, lineUserId: "" },
    ]);
    f.client.replyMessage.mockRejectedValue(new Error("invalid reply token"));
    await request(f.app());
    await Promise.all(f.tasks);
    await request(f.app());
    await Promise.all(f.tasks);
    expect(f.client.replyMessage).toHaveBeenCalledOnce();
    expect(f.client.pushMessage).toHaveBeenCalledOnce();
    expect(console.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "line_webhook.push_skipped",
        reason: "unregistered recipient",
      }),
    );
  });
  it("isolates event failures within a batch", async () => {
    const f = fixture();
    const original = f.repository.create.bind(f.repository);
    vi.spyOn(f.repository, "create").mockImplementation((input) =>
      input.id === "line_event-1"
        ? Promise.reject(new Error("failed"))
        : original(input),
    );
    await request(f.app(), [event(), event("event-2")]);
    await Promise.all(f.tasks);
    expect(f.client.pushMessage).toHaveBeenCalledTimes(2);
    expect(console.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "line_webhook.processing_completed",
        webhookEventId: "event-2",
      }),
    );
  });
  it("uses stable, recipient-specific UUID retry keys", async () => {
    const key = await webhookPushRetryKey("event-1", "woman");
    expect(key).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(key).toBe(await webhookPushRetryKey("event-1", "woman"));
    expect(key).not.toBe(await webhookPushRetryKey("event-1", "man"));
  });
});

it("stops uncertain push replays after the LINE retry key expires", async () => {
  const f = fixture();
  f.client.pushMessage.mockRejectedValue(new Error("response lost"));
  await request(f.app());
  await Promise.all(f.tasks);
  const firstAttempt = f.client.pushMessage.mock.calls.length;
  vi.spyOn(Date, "now").mockReturnValue(Date.now() + 24 * 60 * 60 * 1000);
  await request(f.app());
  await Promise.all(f.tasks);
  expect(f.client.pushMessage).toHaveBeenCalledTimes(firstAttempt);
  expect(console.error).toHaveBeenCalledWith(
    expect.objectContaining({
      event: "line_webhook.push_failed",
      reason: expect.stringContaining("retry key expired"),
    }),
  );
});
