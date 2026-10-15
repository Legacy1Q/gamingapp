// Production defaults to the current origin; development keeps the local API.
export function resolveApiBaseUrl(env = {}, origin) {
  const base = env.VITE_API_BASE_URL?.trim()
    || (env.PROD ? origin : "http://localhost:5004");
  const url = new URL(base);
  if (!['http:', 'https:'].includes(url.protocol)
      || url.pathname !== '/' || url.search || url.hash || url.username || url.password
      || (env.PROD && url.protocol !== 'https:')) {
    throw new Error('The API address must be an HTTPS origin in production, without a path.');
  }
  return url.origin;
}

export const apiBaseUrl = resolveApiBaseUrl(import.meta.env, globalThis.location?.origin);
