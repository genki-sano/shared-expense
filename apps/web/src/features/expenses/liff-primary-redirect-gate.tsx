"use client";

import { useEffect, useState } from "react";
import { initializeLiff } from "./liff-client";

type SearchParamsLike = {
  get(name: string): string | null;
};

export function hasLiffPrimaryRedirectParams(
  searchParams: SearchParamsLike,
): boolean {
  return (
    searchParams.get("liff.state") !== null ||
    searchParams.get("access_token") !== null
  );
}

export function LiffPrimaryRedirectGate(props: { liffId: string }) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function initialize(): Promise<void> {
      try {
        await initializeLiff(props.liffId);
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(errorMessageForUser(error));
        }
      }
    }

    void initialize();

    return () => {
      isCancelled = true;
    };
  }, [props.liffId]);

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
