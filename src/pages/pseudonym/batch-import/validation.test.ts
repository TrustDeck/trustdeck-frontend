import { describe, expect, it } from 'vitest'

import { parseLocalDateTime } from './dates'
import { validateRows } from './validation'
import type { ColumnMapping, SourceRow } from './types'

const mapping: ColumnMapping = {
  identifier: 0,
  idType: 1,
  idTypeFixed: '',
  psn: 2,
  validFrom: 3,
  validTo: 4,
  validityTime: 5
}

const text = {
  missingIdentifier: 'missing identifier',
  missingIdType: 'missing id type',
  invalidDate: 'invalid date',
  dateOrder: 'date order',
  validityConflict: 'validity conflict',
  duplicatePair: 'duplicate pair',
  duplicatePseudonym: 'duplicate pseudonym',
  emptyRow: 'empty row'
}

describe('batch import validation', () => {
  it('converts supported local date formats without a UTC shift', () => {
    expect(
      parseLocalDateTime('31.12.2026 23:59:00', 'DD.MM.YYYY HH:mm:ss')
    ).toBe('2026-12-31T23:59:00')
    expect(parseLocalDateTime('2026-02-30', 'YYYY-MM-DD')).toBeNull()
  })

  it('validates required fields, dates, conflicts, and duplicate values', () => {
    const rows: SourceRow[] = [
      {
        sourceRowNumber: 2,
        values: ['0001', 'PatientID', 'PSN-1', '2026-01-01', '2026-01-02', '']
      },
      {
        sourceRowNumber: 3,
        values: ['0001', 'PatientID', 'PSN-1', '2026-01-02', '2026-01-01', '']
      },
      { sourceRowNumber: 4, values: ['', '', '', '', '', ''] }
    ]
    const result = validateRows(rows, mapping, 'YYYY-MM-DD', text)
    expect(result[0].duplicatePair).toBe(true)
    expect(result[0].duplicatePseudonym).toBe(true)
    expect(result[1].status).toBe('invalid')
    expect(result[1].payload).toBeUndefined()
    expect(result[2].messages.map((entry) => entry.code)).toEqual(
      expect.arrayContaining([
        'missing-identifier',
        'missing-id-type',
        'empty-row'
      ])
    )
  })

  it('omits empty optional fields from the payload and supports fixed ID types', () => {
    const result = validateRows(
      [{ sourceRowNumber: 2, values: ['0001', '', '', '', '', '3days'] }],
      { ...mapping, idType: null, idTypeFixed: 'PatientID' },
      'auto',
      text
    )
    expect(result[0].payload).toEqual({
      identifierItem: { identifier: '0001', idType: 'PatientID' },
      validityTime: '3days'
    })
  })
})
