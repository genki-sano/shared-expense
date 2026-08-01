export type GetLiffIdTokenInput = {
  liffId: string;
  redirectUri?: string;
  now?: Date;
};

const ID_TOKEN_EXPIRATION_BUFFER_SECONDS = 60;
const EXPIRED_ID_TOKEN_REFRESH_KEY = "shared-expense:liff-expired-id-token-refresh";

export async function getLiffIdToken(
  input: GetLiffIdTokenInput,
): Promise<string | null> {
  const { default: liff } = await import("@line/liff");

  await liff.init({ liffId: input.liffId });

  if (!liff.isLoggedIn()) {
    if (input.redirectUri === undefined) {
      liff.login();
    } else {
      liff.login({ redirectUri: input.redirectUri });
    }
    return null;
  }

  const idToken = liff.getIDToken();
  if (idToken === null) {
    throw new Error("LIFF ID token is not available");
  }
  const decodedIdToken = liff.getDecodedIDToken();
  if (isExpiredIdToken(decodedIdToken, input.now ?? new Date())) {
    if (liff.isInClient()) {
      throw new Error(
        "LINE認証の有効期限が切れました。LINEからアプリを開き直してください",
      );
    }

    if (isExpiredIdTokenRefreshInProgress()) {
      clearExpiredIdTokenRefresh();
      throw new Error(
        "LINE認証を更新できませんでした。ブラウザを再読み込みしてから再度お試しください",
      );
    }

    markExpiredIdTokenRefreshInProgress();
    liff.logout();
    if (input.redirectUri === undefined) {
      liff.login();
    } else {
      liff.login({ redirectUri: input.redirectUri });
    }
    return null;
  }

  clearExpiredIdTokenRefresh();
  return idToken;
}

function isExpiredIdToken(
  decodedIdToken: { exp?: unknown } | null,
  now: Date,
): boolean {
  if (
    decodedIdToken === null ||
    typeof decodedIdToken.exp !== "number" ||
    !Number.isFinite(decodedIdToken.exp)
  ) {
    return false;
  }

  const expiresAt = decodedIdToken.exp - ID_TOKEN_EXPIRATION_BUFFER_SECONDS;
  return expiresAt <= Math.floor(now.getTime() / 1000);
}

function isExpiredIdTokenRefreshInProgress(): boolean {
  return globalThis.sessionStorage?.getItem(EXPIRED_ID_TOKEN_REFRESH_KEY) === "1";
}

function markExpiredIdTokenRefreshInProgress(): void {
  globalThis.sessionStorage?.setItem(EXPIRED_ID_TOKEN_REFRESH_KEY, "1");
}

function clearExpiredIdTokenRefresh(): void {
  globalThis.sessionStorage?.removeItem(EXPIRED_ID_TOKEN_REFRESH_KEY);
}
