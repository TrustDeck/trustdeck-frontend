/** How the backend matches the parts of a search query. */
export type SearchMatch = 'contains' | 'prefix'

/** The backend needs at least this many characters per query part to match anywhere in the values. */
export const MIN_CONTAINS_PART_LENGTH = 3

/**
 * Chooses how a search query is matched. Searches match anywhere in the values ("contains"), so
 * that fragments from the middle of an identifier or pseudonym are found as well. The backend
 * refuses this for query parts shorter than three characters, so such queries match the
 * beginning of the values ("prefix") instead.
 */
export const searchMatchFor = (query: string): SearchMatch => {
  const parts = query.trim().split(/\s+/).filter((part) => part !== '')
  return parts.some((part) => part !== '*' && part.length < MIN_CONTAINS_PART_LENGTH)
    ? 'prefix'
    : 'contains'
}
