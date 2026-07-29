import { createAppFromEnv, type AppEnv } from "./app";

export default {
  fetch(request: Request, env: AppEnv): Promise<Response> {
    return Promise.resolve(createAppFromEnv(env).fetch(request));
  },
};
