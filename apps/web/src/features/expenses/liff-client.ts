export type GetLiffIdTokenInput = {
  liffId: string;
  redirectUri?: string;
  now?: Date;
};

const ID_TOKEN_EXPIRATION_BUFFER_SECONDS = 60;

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
    if (input.redirectUri === undefined) {
      liff.login();
    } else {
      liff.login({ redirectUri: input.redirectUri });
    }
    return null;
  }

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
