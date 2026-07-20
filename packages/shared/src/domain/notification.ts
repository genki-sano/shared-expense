export type ExpenseEventType = "expense.created" | "expense.updated" | "expense.deleted";

export type NotificationDeliveryStatus = "success" | "failed" | "skipped";

export type NotificationHistory = {
  id: string;
  eventType: string;
  eventId: string;
  sentToUserId: string;
  sentAt: string;
  deliveryStatus: NotificationDeliveryStatus;
  providerMessageId: string | null;
  errorReason: string | null;
};

export type NotificationDeduplicationKey = {
  eventType: string;
  eventId: string;
  sentToUserId: string;
};

export function buildExpenseEventId(
  eventType: ExpenseEventType,
  expenseId: string,
  version: number,
): string {
  return `${eventType}:${expenseId}:v${version}`;
}

export function buildMonthlySettlementEventId(month: string): string {
  return `settlement.monthly:${month}`;
}

export function shouldSendNotification(input: {
  notifyEnabled: boolean;
  key: NotificationDeduplicationKey;
  histories: readonly Pick<
    NotificationHistory,
    "eventType" | "eventId" | "sentToUserId" | "deliveryStatus"
  >[];
}): boolean {
  if (!input.notifyEnabled) {
    return false;
  }

  const matchingHistories = input.histories.filter(
    (history) =>
      history.eventType === input.key.eventType &&
      history.eventId === input.key.eventId &&
      history.sentToUserId === input.key.sentToUserId,
  );

  return !matchingHistories.some(
    (history) => history.deliveryStatus === "success" || history.deliveryStatus === "skipped",
  );
}
