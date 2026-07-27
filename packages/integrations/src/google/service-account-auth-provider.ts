export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

const JWT_BEARER_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:jwt-bearer";

type ServiceAccountJwtHeader = {
  alg: "RS256";
  typ: "JWT";
};

type ServiceAccountJwtPayload = {
  iss: string;
  scope: string;
  aud: string;
  iat: number;
  exp: number;
};

export type ServiceAccountJwtSigner = (input: {
  header: ServiceAccountJwtHeader;
  payload: ServiceAccountJwtPayload;
  privateKey: string;
}) => Promise<string>;

export type GoogleAccessTokenProvider = {
  getAccessToken: () => Promise<string>;
};

export type GoogleServiceAccountAccessTokenProviderInput = {
  clientEmail: string;
  privateKey: string;
  scope?: string;
  fetcher?: typeof fetch;
  now?: () => Date;
  signJwt?: ServiceAccountJwtSigner;
};

export class GoogleServiceAccountAccessTokenProvider implements GoogleAccessTokenProvider {
  readonly #clientEmail: string;
  readonly #privateKey: string;
  readonly #scope: string;
  readonly #fetcher: typeof fetch;
  readonly #now: () => Date;
  readonly #signJwt: ServiceAccountJwtSigner;

  constructor(input: GoogleServiceAccountAccessTokenProviderInput) {
    this.#clientEmail = input.clientEmail;
    this.#privateKey = normalizePrivateKey(input.privateKey);
    this.#scope = input.scope ?? GOOGLE_SHEETS_SCOPE;
    this.#fetcher = input.fetcher ?? fetch;
    this.#now = input.now ?? (() => new Date());
    this.#signJwt = input.signJwt ?? signServiceAccountJwt;
  }

  async getAccessToken(): Promise<string> {
    const issuedAt = Math.floor(this.#now().getTime() / 1000);
    const assertion = await this.#signJwt({
      header: {
        alg: "RS256",
        typ: "JWT",
      },
      payload: {
        iss: this.#clientEmail,
        scope: this.#scope,
        aud: GOOGLE_TOKEN_URL,
        iat: issuedAt,
        exp: issuedAt + 3600,
      },
      privateKey: this.#privateKey,
    });
    const response = await this.#fetcher(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: JWT_BEARER_GRANT_TYPE,
        assertion,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to exchange Google service account token: ${response.status}`);
    }

    const body = (await response.json()) as { access_token?: unknown };
    if (typeof body.access_token !== "string") {
      throw new Error("Google service account token response did not include access_token");
    }

    return body.access_token;
  }
}

export async function signServiceAccountJwt(input: {
  header: ServiceAccountJwtHeader;
  payload: ServiceAccountJwtPayload;
  privateKey: string;
}): Promise<string> {
  const encodedHeader = base64UrlEncodeJson(input.header);
  const encodedPayload = base64UrlEncodeJson(input.payload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyPemToArrayBuffer(input.privateKey),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );

  return `${signingInput}.${base64UrlEncodeBytes(new Uint8Array(signature))}`;
}

function normalizePrivateKey(privateKey: string): string {
  return privateKey.replace(/\\n/g, "\n");
}

function privateKeyPemToArrayBuffer(privateKey: string): ArrayBuffer {
  const base64 = normalizePrivateKey(privateKey)
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

function base64UrlEncodeJson(value: unknown): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(JSON.stringify(value)));
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}
