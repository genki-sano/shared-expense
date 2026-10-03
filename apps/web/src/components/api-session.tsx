"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { resolveApiToken, type ApiSession } from "../lib/api-auth";
import { StatusScreen } from "./query-boundary";

export function ApiSessionBoundary({
  children,
}: {
  children: (session: ApiSession) => ReactNode;
}) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const devToken =
    process.env.NODE_ENV === "development"
      ? process.env.NEXT_PUBLIC_DEV_ID_TOKEN
      : undefined;
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID?.trim();
  const auth = useQuery({
    queryKey: ["liff-session", apiBaseUrl, liffId, devToken],
    queryFn: () => resolveApiToken(apiBaseUrl),
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  if (auth.isError)
    return (
      <main className="shell">
        <div className="app">
          <p className="errorMessage">
            支出明細を読み込めませんでした。{auth.error.message}
          </p>
          <button
            className="secondaryButton"
            onClick={() => void auth.refetch()}
          >
            再試行
          </button>
        </div>
      </main>
    );
  if (
    auth.isPending ||
    (apiBaseUrl?.trim() && liffId && !devToken && auth.data === null)
  )
    return <StatusScreen message="LINE認証を確認しています" />;
  return children({ apiBaseUrl, idToken: auth.data ?? undefined });
}
