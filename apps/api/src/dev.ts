import { createServer } from "node:http";
import type { IncomingMessage } from "node:http";
import { createAppFromEnv } from "./app";
import { loadLocalDevAppEnv } from "./dev-env";

const port = Number(process.env.PORT ?? 8787);
const app = createAppFromEnv(loadLocalDevAppEnv(), {
  authenticateToken: async () => ({
    id: "local-dev",
    lineUserId: "local-dev",
    displayName: "Local Dev",
    notifyEnabled: true,
  }),
});

const server = createServer(async (incoming, outgoing) => {
  try {
    const request = createRequest(incoming);
    const response = await app.fetch(request);

    outgoing.statusCode = response.status;
    response.headers.forEach((value, key) => {
      outgoing.setHeader(key, value);
    });
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    outgoing.statusCode = 500;
    outgoing.end("Internal Server Error");
  }
});

server.listen(port, () => {
  console.log(`API dev server ready at http://localhost:${port}`);
});

function createRequest(incoming: IncomingMessage): Request {
  const host = incoming.headers.host ?? `localhost:${port}`;
  const url = new URL(incoming.url ?? "/", `http://${host}`);
  const headers = new Headers();

  for (const [key, value] of Object.entries(incoming.headers)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
      continue;
    }

    headers.set(key, value);
  }

  return new Request(url, {
    method: incoming.method ?? "GET",
    headers,
  });
}
