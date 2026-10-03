"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { StatusScreen } from "../components/query-boundary";

const subscribe = () => () => {};
const browserSnapshot = () => true;
const serverSnapshot = () => false;

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, staleTime: 30_000 },
          mutations: { retry: false },
        },
      }),
  );
  // Static export never initializes LIFF or fetches authenticated data on the server.
  const isBrowser = useSyncExternalStore(
    subscribe,
    browserSnapshot,
    serverSnapshot,
  );
  return (
    <QueryClientProvider client={client}>
      {isBrowser ? (
        children
      ) : (
        <StatusScreen message="支出明細を読み込んでいます" />
      )}
    </QueryClientProvider>
  );
}
