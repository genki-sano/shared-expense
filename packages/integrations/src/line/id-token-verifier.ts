import { defaultFetcher } from "../fetcher";

export const LINE_ID_TOKEN_VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";

export type LineIdTokenPayload = {
  sub: string;
  aud: string;
};

export type VerifyLineIdTokenInput = {
  idToken: string;
  channelId: string;
  fetcher?: typeof fetch;
};

export class LineIdTokenVerificationError extends Error {
  readonly status: number;
  readonly description: string | undefined;

  constructor(status: number, description?: string | undefined) {
    super(
      description === undefined
        ? `LINE ID token verification failed: ${status}`
        : `LINE ID token verification failed: ${status}: ${description}`,
    );
    this.name = "LineIdTokenVerificationError";
    this.status = status;
    this.description = description;
  }
}

export async function verifyLineIdToken(
  input: VerifyLineIdTokenInput,
): Promise<LineIdTokenPayload> {
  const fetcher = input.fetcher ?? defaultFetcher();
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
    throw new LineIdTokenVerificationError(
      response.status,
      await lineErrorDescription(response),
    );
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

async function lineErrorDescription(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as unknown;
    if (
      typeof body === "object" &&
      body !== null &&
      "error_description" in body &&
      typeof body.error_description === "string" &&
      body.error_description.trim() !== ""
    ) {
      return body.error_description;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function isLineIdTokenPayload(value: unknown): value is LineIdTokenPayload {
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
