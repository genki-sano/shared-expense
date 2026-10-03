"use client";

import { useQuery } from "@tanstack/react-query";
import { initializeLiff } from "../lib/liff-client";

export function LiffPrimaryRedirectGate(props: { liffId: string }) {
  const initialization = useQuery({
    queryKey: ["liff-primary-redirect", props.liffId],
    queryFn: async () => { await initializeLiff(props.liffId); return true; },
    retry: false,
    staleTime: Infinity,
  });
  const errorMessage = initialization.isError ? errorMessageForUser(initialization.error) : null;

  return (
    <main className="shell">
      <div className="app">
        <p
          className={errorMessage === null ? "statusMessage" : "errorMessage"}
          role="status"
        >
          {errorMessage === null
            ? "LINE認証を確認しています"
            : `LINE認証に失敗しました。${errorMessage}`}
        </p>
      </div>
    </main>
  );
}

function errorMessageForUser(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }

  return "時間をおいて再度お試しください";
}
