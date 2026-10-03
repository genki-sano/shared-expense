import { getLiffIdToken } from "./liff-client";

export type ApiSession = {
  apiBaseUrl: string | undefined;
  idToken: string | undefined;
};

export async function resolveApiToken(
  apiBaseUrl: string | undefined,
): Promise<string | null> {
  const devToken =
    process.env.NODE_ENV === "development"
      ? process.env.NEXT_PUBLIC_DEV_ID_TOKEN
      : undefined;
  if (devToken?.trim()) return devToken;
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID?.trim();
  if (!apiBaseUrl?.trim() || !liffId) return null;
  return getLiffIdToken({ liffId, redirectUri: window.location.href });
}

// Recheck expiry at the user event, including when a screen was left open for a long time.
export async function authenticateMutation<
  T extends { apiBaseUrl: string | undefined; idToken?: string | undefined },
>(input: T): Promise<T> {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID?.trim();
  if (!liffId) return input;
  const idToken = await resolveApiToken(input.apiBaseUrl);
  if (idToken === null)
    throw new Error("LINE認証を確認しています。ログイン後に再度お試しください");
  return { ...input, idToken };
}
