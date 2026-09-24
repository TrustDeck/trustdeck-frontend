import { compareLocalDateTimes, parseLocalDateTime } from './dates'
import type {
  ColumnMapping,
  DateFormat,
  SourceRow,
  ValidatedImportRow,
  ValidationMessage
} from './types'

function valueAt(row: SourceRow, index: number | null): string {
  if (index === null) return ''
  const value = row.values[index]
  return value instanceof Date
    ? value.toISOString()
    : String(value ?? '').trim()
}

function message(
  code: string,
  text: string,
  severity: 'error' | 'warning' = 'error'
): ValidationMessage {
  return { code, message: text, severity }
}

export type ValidationText = {
  missingIdentifier: string
  missingIdType: string
  invalidDate: string
  dateOrder: string
  validityConflict: string
  duplicatePair: string
  duplicatePseudonym: string
  emptyRow: string
}

export function validateRows(
  rows: SourceRow[],
  mapping: ColumnMapping,
  dateFormat: DateFormat,
  text: ValidationText
): ValidatedImportRow[] {
  const preliminary = rows.map((row): ValidatedImportRow => {
    const identifier = valueAt(row, mapping.identifier)
    const idType = mapping.idTypeFixed.trim() || valueAt(row, mapping.idType)
    const psn = valueAt(row, mapping.psn)
    const messages: ValidationMessage[] = []
    const validFromSource = row.values[mapping.validFrom ?? -1] ?? null
    const validToSource = row.values[mapping.validTo ?? -1] ?? null
    const validityTime = valueAt(row, mapping.validityTime)
    const validFrom =
      mapping.validFrom === null
        ? null
        : parseLocalDateTime(validFromSource, dateFormat)
    const validTo =
      mapping.validTo === null
        ? null
        : parseLocalDateTime(validToSource, dateFormat)

    if (!identifier)
      messages.push(message('missing-identifier', text.missingIdentifier))
    if (!idType) messages.push(message('missing-id-type', text.missingIdType))
    if (
      mapping.validFrom !== null &&
      valueAt(row, mapping.validFrom) &&
      !validFrom
    ) {
      messages.push(message('invalid-valid-from', text.invalidDate))
    }
    if (mapping.validTo !== null && valueAt(row, mapping.validTo) && !validTo) {
      messages.push(message('invalid-valid-to', text.invalidDate))
    }
    if (
      validFrom &&
      validTo &&
      compareLocalDateTimes(validTo, validFrom) <= 0
    ) {
      messages.push(message('date-order', text.dateOrder))
    }
    if (validTo && validityTime) {
      messages.push(message('validity-conflict', text.validityConflict))
    }
    if (
      !identifier &&
      !idType &&
      !psn &&
      !validFrom &&
      !validTo &&
      !validityTime
    ) {
      messages.push(message('empty-row', text.emptyRow))
    }

    const payload =
      messages.some((entry) => entry.severity === 'error') ||
      !identifier ||
      !idType
        ? undefined
        : {
            identifierItem: { identifier, idType },
            ...(psn ? { psn } : {}),
            ...(validFrom ? { validFrom } : {}),
            ...(validTo ? { validTo } : {}),
            ...(validityTime && !validTo ? { validityTime } : {})
          }

    return {
      sourceRowNumber: row.sourceRowNumber,
      payload,
      identifier,
      idType,
      ...(psn ? { psn } : {}),
      status: messages.some((entry) => entry.severity === 'error')
        ? 'invalid'
        : messages.length > 0
          ? 'warning'
          : 'valid',
      messages,
      duplicatePair: false,
      duplicatePseudonym: false
    }
  })

  const pairCounts = new Map<string, number>()
  const psnCounts = new Map<string, number>()
  preliminary.forEach((row) => {
    if (row.identifier && row.idType) {
      const key = `${row.identifier}\u0000${row.idType}`
      pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1)
    }
    if (row.psn) psnCounts.set(row.psn, (psnCounts.get(row.psn) ?? 0) + 1)
  })

  return preliminary.map((row) => {
    const pairKey = `${row.identifier}\u0000${row.idType}`
    const duplicatePair = Boolean(
      row.identifier && row.idType && (pairCounts.get(pairKey) ?? 0) > 1
    )
    const duplicatePseudonym = Boolean(
      row.psn && (psnCounts.get(row.psn) ?? 0) > 1
    )
    const messages = [...row.messages]
    if (duplicatePair)
      messages.push(message('duplicate-pair', text.duplicatePair, 'warning'))
    if (duplicatePseudonym)
      messages.push(message('duplicate-pseudonym', text.duplicatePseudonym))
    return {
      ...row,
      status:
        duplicatePseudonym || row.status === 'invalid'
          ? 'invalid'
          : messages.length
            ? 'warning'
            : 'valid',
      messages,
      duplicatePair,
      duplicatePseudonym
    }
  })
}
