import { createServer } from "node:http";
import { createAppFromEnv } from "./app";
import { loadLocalDevAppEnv } from "./dev-env";
import { createNodeRequest } from "./dev-request";

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
    const request = createNodeRequest(incoming, port);
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
