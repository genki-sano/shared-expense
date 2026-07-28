import type { User } from "@shared-expense/shared";
import type { ExpenseRepository } from "../expenses/repository";

const LINE_ID_TOKEN_VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";

export type LineIdTokenAuthenticatorInput = {
  channelId: string;
  expenseRepository: Pick<ExpenseRepository, "listHouseholdUsers">;
  fetcher?: typeof fetch;
};

export function createLineIdTokenAuthenticator(
  input: LineIdTokenAuthenticatorInput,
): (token: string) => Promise<User> {
  return async (token) => {
    const payload = await verifyLineIdToken({
      idToken: token,
      channelId: input.channelId,
      ...(input.fetcher === undefined ? {} : { fetcher: input.fetcher }),
    });
    const users = await input.expenseRepository.listHouseholdUsers();
    const user = users.find((item) => item.lineUserId === payload.sub);

    if (user === undefined) {
      throw new Error(`Unknown LINE user: ${payload.sub}`);
    }

    return user;
  };
}

export async function verifyLineIdToken(input: {
  idToken: string;
  channelId: string;
  fetcher?: typeof fetch;
}): Promise<{ sub: string; aud: string }> {
  const fetcher = input.fetcher ?? fetch;
  const body = new URLSearchParams({
    id_token: input.idToken,
    client_id: input.channelId,
  });
  const response = await fetcher(LINE_ID_TOKEN_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(`LINE ID token verification failed: ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  if (!isLineIdTokenPayload(payload)) {
    throw new Error("LINE ID token verification returned an invalid payload");
  }

  if (payload.aud !== input.channelId) {
    throw new Error("LINE ID token audience mismatch");
  }

  return { sub: payload.sub, aud: payload.aud };
}

function isLineIdTokenPayload(value: unknown): value is { sub: string; aud: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "sub" in value &&
    typeof value.sub === "string" &&
    value.sub.trim() !== "" &&
    "aud" in value &&
    typeof value.aud === "string"
  );
}
