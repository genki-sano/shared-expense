import type { IncomingMessage } from "node:http";

export function createNodeRequest(incoming: IncomingMessage, port: number): Request {
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

  const method = incoming.method ?? "GET";
  const init: RequestInit & { duplex?: "half" } = {
    method,
    headers,
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = incoming as NonNullable<RequestInit["body"]>;
    init.duplex = "half";
  }

  return new Request(url, init);
}
