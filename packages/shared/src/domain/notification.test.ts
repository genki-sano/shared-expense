import { describe, expect, it } from "vitest";
import {
  buildExpenseEventId,
  buildMonthlySettlementEventId,
  shouldSendNotification,
} from "./notification";

const key = {
  eventType: "expense.updated",
  eventId: "expense.updated:exp_1:v3",
  sentToUserId: "user_a",
};

const history = (deliveryStatus: "success" | "failed" | "skipped") => ({
  ...key,
  deliveryStatus,
});

describe("buildExpenseEventId", () => {
  it("builds a versioned expense event ID", () => {
    expect(buildExpenseEventId("expense.updated", "exp_1", 3)).toBe(
      "expense.updated:exp_1:v3",
    );
  });
});

describe("buildMonthlySettlementEventId", () => {
  it("builds a monthly settlement event ID", () => {
    expect(buildMonthlySettlementEventId("2026-06")).toBe("settlement.monthly:2026-06");
  });
});

describe("shouldSendNotification", () => {
  it("returns false when the recipient has disabled notifications", () => {
    expect(shouldSendNotification({ notifyEnabled: false, key, histories: [] })).toBe(false);
  });

  it("returns false when a success history already exists", () => {
    expect(
      shouldSendNotification({
        notifyEnabled: true,
        key,
        histories: [history("success")],
      }),
    ).toBe(false);
  });

  it("returns false when a skipped history already exists", () => {
    expect(
      shouldSendNotification({
        notifyEnabled: true,
        key,
        histories: [history("skipped")],
      }),
    ).toBe(false);
  });

  it("returns true when only failed histories exist", () => {
    expect(
      shouldSendNotification({
        notifyEnabled: true,
        key,
        histories: [history("failed")],
      }),
    ).toBe(true);
  });

  it("returns true when no histories exist", () => {
    expect(shouldSendNotification({ notifyEnabled: true, key, histories: [] })).toBe(true);
  });

  it("returns false when a success history exists for the exact deduplication key", () => {
    expect(
      shouldSendNotification({
        notifyEnabled: true,
        key,
        histories: [history("success")],
      }),
    ).toBe(false);
  });

  it("returns false when a skipped history exists for the exact deduplication key", () => {
    expect(
      shouldSendNotification({
        notifyEnabled: true,
        key,
        histories: [history("skipped")],
      }),
    ).toBe(false);
  });

  it("ignores a success history for a different event ID", () => {
    expect(
      shouldSendNotification({
        notifyEnabled: true,
        key,
        histories: [
          {
            ...key,
            eventId: "expense.updated:exp_2:v1",
            deliveryStatus: "success",
          },
        ],
      }),
    ).toBe(true);
  });

  it("ignores a success history for a different recipient", () => {
    expect(
      shouldSendNotification({
        notifyEnabled: true,
        key,
        histories: [{ ...key, sentToUserId: "user_b", deliveryStatus: "success" }],
      }),
    ).toBe(true);
  });

  it("ignores a success history for a different event type", () => {
    expect(
      shouldSendNotification({
        notifyEnabled: true,
        key,
        histories: [{ ...key, eventType: "expense.created", deliveryStatus: "success" }],
      }),
    ).toBe(true);
  });
});
