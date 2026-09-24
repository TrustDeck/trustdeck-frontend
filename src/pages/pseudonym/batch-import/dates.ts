import type { DateFormat, SourceCell } from './types'

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/
const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/
const EUROPEAN_DATE_ONLY = /^(\d{2})\.(\d{2})\.(\d{4})$/
const EUROPEAN_DATE_TIME =
  /^(\d{2})\.(\d{2})\.(\d{4})[ T](\d{2}):(\d{2}):(\d{2})$/

function isValidDateParts(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number
) {
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute &&
    date.getUTCSeconds() === second
  )
}

function formatParts(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0
) {
  if (!isValidDateParts(year, month, day, hour, minute, second)) return null
  return `${String(year).padStart(4, '0')}-${String(month).padStart(
    2,
    '0'
  )}-${String(day).padStart(2, '0')}T${String(hour).padStart(
    2,
    '0'
  )}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`
}

function parseString(value: string, format: DateFormat): string | null {
  const normalized = value.trim()
  const dateTime = normalized.match(DATE_TIME)
  const dateOnly = normalized.match(DATE_ONLY)
  const europeanDateTime = normalized.match(EUROPEAN_DATE_TIME)
  const europeanDateOnly = normalized.match(EUROPEAN_DATE_ONLY)

  if (format === 'YYYY-MM-DD' && !dateOnly) return null
  if (format === 'YYYY-MM-DD HH:mm:ss' && !dateTime) return null
  if (format === 'DD.MM.YYYY' && !europeanDateOnly) return null
  if (format === 'DD.MM.YYYY HH:mm:ss' && !europeanDateTime) return null

  if (dateTime) {
    const [year, month, day, hour, minute, second] = dateTime
      .slice(1)
      .map(Number)
    return formatParts(year, month, day, hour, minute, second)
  }
  if (dateOnly) {
    const [year, month, day] = dateOnly.slice(1).map(Number)
    return formatParts(year, month, day)
  }
  if (europeanDateTime) {
    const [day, month, year, hour, minute, second] = europeanDateTime
      .slice(1)
      .map(Number)
    return formatParts(year, month, day, hour, minute, second)
  }
  if (europeanDateOnly) {
    const [day, month, year] = europeanDateOnly.slice(1).map(Number)
    return formatParts(year, month, day)
  }
  return null
}

export function formatSourceDate(value: Date): string {
  return (
    formatParts(
      value.getUTCFullYear(),
      value.getUTCMonth() + 1,
      value.getUTCDate(),
      value.getUTCHours(),
      value.getUTCMinutes(),
      value.getUTCSeconds()
    ) ?? ''
  )
}

export function parseLocalDateTime(
  value: SourceCell,
  format: DateFormat
): string | null {
  if (value instanceof Date) return formatSourceDate(value) || null
  if (value === null) return null
  return parseString(value, format)
}

export function compareLocalDateTimes(left: string, right: string): number {
  return left.localeCompare(right)
}
