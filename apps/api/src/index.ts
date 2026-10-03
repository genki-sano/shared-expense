import type { ExecutionContext } from "@cloudflare/workers-types";
import { createAppFromEnv, type AppEnv } from "./app";

export default {
  fetch(
    request: Request,
    env: AppEnv,
    context?: Pick<ExecutionContext, "waitUntil">,
  ): Promise<Response> {
    return Promise.resolve(
      createAppFromEnv(
        env,
        context ? { scheduleWebhook: (task) => context.waitUntil(task) } : {},
      ).fetch(request),
    );
  },
};
