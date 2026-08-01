export function defaultFetcher(): typeof fetch {
  return (input, init) => globalThis.fetch(input, init);
}
