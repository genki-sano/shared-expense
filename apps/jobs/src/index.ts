import { runMonthlySettlementReminder, type JobsEnv } from "./monthly-settlement-reminder";

type ScheduledController = {
  scheduledTime: number;
  cron: string;
};

type ExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
};

export default {
  scheduled(_controller: ScheduledController, env: JobsEnv, context: ExecutionContext): void {
    context.waitUntil(
      runMonthlySettlementReminder({ env }).catch((error: unknown) => {
        console.error("Monthly settlement reminder failed", error);
        throw error;
      }),
    );
  },
};
