export function authorizationHeaders(
  idToken: string | undefined,
): Record<string, string> {
  return idToken ? { Authorization: `Bearer ${idToken}` } : {};
}

export function apiFetch(
  input: { apiBaseUrl: string; fetcher?: typeof fetch },
  path: string,
  init: RequestInit,
): Promise<Response> {
  return (input.fetcher ?? fetch)(
    new URL(path, input.apiBaseUrl).toString(),
    init,
  );
}
