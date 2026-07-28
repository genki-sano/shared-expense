export type GetLiffIdTokenInput = {
  liffId: string;
  redirectUri?: string;
};

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

  return idToken;
}
