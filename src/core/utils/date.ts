const DISPLAY_LOCALE = 'de-DE'

/** Format a Date as local YYYY-MM-DD (for date-only fields like birthdate). Avoids UTC shift. */
export function dateToLocalYYYYMMDD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse a YYYY-MM-DD string as local date (so calendar shows the correct day). */
export function localYYYYMMDDToDate(s: string): Date | null {
  if (!s || s.length < 10) return null
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null
  const date = new Date(y, m - 1, d)
  if (Number.isNaN(date.getTime())) return null
  return date
}

/**
 * Format dates consistently in German day-month order, independently of the
 * selected UI language.
 */
export function formatDate(
  iso?: string | null,
  options?: Intl.DateTimeFormatOptions
) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...options
  }).format(d)
}

/**
 * Format date-times consistently as DD.MM.YYYY, HH:mm:ss using a 24-hour
 * clock, independently of the selected UI language.
 */
export function formatDateTime(
  iso?: string | null,
  options?: Intl.DateTimeFormatOptions
) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    ...options,
    hour12: false,
    hourCycle: 'h23'
  }).format(d)
}
