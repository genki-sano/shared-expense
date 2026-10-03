import type { D1Database } from "@cloudflare/workers-types";
import type { Expense } from "@shared-expense/shared";

export type WebhookProgress = {
  saving?: boolean;
  expense?: Expense;
  replyComplete?: boolean;
  sentTo?: string[];
  pushStartedAt?: Record<string, number>;
};
export type WebhookClaim = {
  eventId: string;
  token: string;
  progress: WebhookProgress;
};
export interface WebhookEventStore {
  claim(eventId: string): Promise<WebhookClaim | null>;
  checkpoint(claim: WebhookClaim): Promise<void>;
  release(claim: WebhookClaim, completed: boolean): Promise<void>;
}

// Longer than waitUntil's execution window, so a replay cannot overlap a live worker.
const LEASE_MS = 120_000;
export class D1WebhookEventStore implements WebhookEventStore {
  constructor(private readonly db: D1Database) {}
  async claim(eventId: string): Promise<WebhookClaim | null> {
    const token = crypto.randomUUID();
    const now = Date.now();
    const row = await this.db
      .prepare(
        `
      INSERT INTO line_webhook_events(event_id, lease_token, lease_until, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(event_id) DO UPDATE SET lease_token=excluded.lease_token,
        lease_until=excluded.lease_until, updated_at=excluded.updated_at
      WHERE line_webhook_events.completed=0 AND line_webhook_events.lease_until<=?
      RETURNING state
    `,
      )
      .bind(eventId, token, now + LEASE_MS, now, now)
      .first<{ state: string }>();
    return row
      ? { eventId, token, progress: JSON.parse(row.state) as WebhookProgress }
      : null;
  }
  async checkpoint(claim: WebhookClaim): Promise<void> {
    const result = await this.db
      .prepare(
        `UPDATE line_webhook_events SET state=?, updated_at=?
      WHERE event_id=? AND lease_token=? AND completed=0`,
      )
      .bind(
        JSON.stringify(claim.progress),
        Date.now(),
        claim.eventId,
        claim.token,
      )
      .run();
    if (result.meta.changes !== 1)
      throw new Error("Webhook processing claim lost");
  }
  async release(claim: WebhookClaim, completed: boolean): Promise<void> {
    const result = await this.db
      .prepare(
        `UPDATE line_webhook_events SET state=?, completed=?, lease_until=0, updated_at=?
      WHERE event_id=? AND lease_token=? AND completed=0`,
      )
      .bind(
        JSON.stringify(claim.progress),
        Number(completed),
        Date.now(),
        claim.eventId,
        claim.token,
      )
      .run();
    if (result.meta.changes !== 1)
      throw new Error("Webhook processing claim lost");
  }
}

// Explicitly injected by local dev/tests; production never falls back to volatile state.
export class InMemoryWebhookEventStore implements WebhookEventStore {
  private readonly records = new Map<
    string,
    {
      progress: WebhookProgress;
      token: string;
      until: number;
      completed: boolean;
    }
  >();
  async claim(eventId: string): Promise<WebhookClaim | null> {
    const record = this.records.get(eventId);
    if (record && (record.completed || record.until > Date.now())) return null;
    const token = crypto.randomUUID();
    const progress = structuredClone(record?.progress ?? {});
    this.records.set(eventId, {
      progress,
      token,
      until: Date.now() + LEASE_MS,
      completed: false,
    });
    return { eventId, token, progress };
  }
  async checkpoint(claim: WebhookClaim): Promise<void> {
    const record = this.records.get(claim.eventId);
    if (!record || record.token !== claim.token || record.completed)
      throw new Error("Webhook processing claim lost");
    record.progress = structuredClone(claim.progress);
  }
  async release(claim: WebhookClaim, completed: boolean): Promise<void> {
    await this.checkpoint(claim);
    const record = this.records.get(claim.eventId)!;
    record.completed = completed;
    record.until = 0;
  }
}
