export function encodeUriName(abbreviation?: string): string {
  return encodeURIComponent((abbreviation ?? '').trim().replace(/\s+/g, ''))
}

