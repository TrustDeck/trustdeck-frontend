/** Extracts the version string from a `GET /version` response, or null if it has none. */
export function backendVersionFrom(response: unknown): string | null {
  if (!response || typeof response !== 'object') return null
  const version = (response as { version?: unknown }).version
  if (typeof version !== 'string') return null
  const trimmed = version.trim()
  return trimmed ? trimmed : null
}

/**
 * Reads the backend version with the given request and returns null if it cannot be read,
 * e.g. because an older backend does not know the endpoint (404) or the network fails.
 */
export async function readBackendVersion(
  requestVersion: () => Promise<unknown>
): Promise<string | null> {
  try {
    return backendVersionFrom(await requestVersion())
  } catch {
    return null
  }
}
