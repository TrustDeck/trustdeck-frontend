import { TrustDeckHttpError } from '../services/TrustDeck'

export function getHttpStatus(error: unknown): number | undefined {
  if (error instanceof TrustDeckHttpError) return error.status
  if (error && typeof error === 'object' && 'status' in error) {
    const status = Number((error as { status?: unknown }).status)
    if (!Number.isNaN(status)) return status
  }
  const message = error instanceof Error ? error.message : String(error)
  const match = message.match(/(?:Request failed|Upload failed|Failed to fetch image):\s*(\d{3})/)
  return match ? Number(match[1]) : undefined
}

export function isForbidden(error: unknown): boolean {
  return getHttpStatus(error) === 403
}
