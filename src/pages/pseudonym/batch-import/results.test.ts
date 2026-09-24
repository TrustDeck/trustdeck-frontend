import { describe, expect, it } from 'vitest'

import { processChunkResponse, processNetworkFailure } from './results'
import type { ValidatedImportRow } from './types'

const text = {
  unauthenticated: 'unauthenticated',
  permissionDenied: 'permission denied',
  domainUnavailable: 'domain unavailable',
  rejected: 'rejected',
  serverUncertain: 'server uncertain',
  requestNotAccepted: (status: number) => `status ${status}`,
  partialRow: 'partial row',
  partialChunk: 'partial chunk',
  networkUncertain: 'network uncertain'
}

const rows: ValidatedImportRow[] = [
  {
    sourceRowNumber: 2,
    identifier: '0001',
    idType: 'PatientID',
    payload: { identifierItem: { identifier: '0001', idType: 'PatientID' } },
    status: 'valid',
    messages: [],
    duplicatePair: false,
    duplicatePseudonym: false
  },
  {
    sourceRowNumber: 3,
    identifier: '0002',
    idType: 'PatientID',
    payload: { identifierItem: { identifier: '0002', idType: 'PatientID' } },
    status: 'valid',
    messages: [],
    duplicatePair: false,
    duplicatePseudonym: false
  }
]

describe('batch import result processing', () => {
  it('associates a complete 201 response by position', () => {
    const result = processChunkResponse(
      rows,
      {
        status: 201,
        data: rows.map((row, index) => ({
          domainName: 'domain',
          identifierItem: row.payload!.identifierItem,
          psn: `PSN-${index}`,
          validFrom: '',
          validFromInherited: false,
          validTo: '',
          validToInherited: false
        }))
      },
      1,
      text
    )
    expect(result.rows.map((row) => row.status)).toEqual(['created', 'created'])
    expect(result.rows[1].pseudonym).toBe('PSN-1')
  })

  it('only matches identifiable 206 entries and preserves unmatched values', () => {
    const result = processChunkResponse(
      rows,
      {
        status: 206,
        data: [
          {
            domainName: 'domain',
            identifierItem: rows[0].payload!.identifierItem,
            psn: 'PSN-1',
            validFrom: '',
            validFromInherited: false,
            validTo: '',
            validToInherited: false
          },
          {
            domainName: 'domain',
            identifierItem: { identifier: 'unknown', idType: 'PatientID' },
            psn: 'PSN-UNKNOWN',
            validFrom: '',
            validFromInherited: false,
            validTo: '',
            validToInherited: false
          }
        ]
      },
      1,
      text
    )
    expect(result.rows[0].status).toBe('created')
    expect(result.rows[1].status).toBe('not-confirmed')
    expect(result.returnedPseudonyms).toEqual(['PSN-UNKNOWN'])
  })

  it('stops without retrying on request failures and network errors', () => {
    expect(
      processChunkResponse(rows, { status: 403, data: [] }, 1, text).stop
    ).toBe(true)
    expect(
      processChunkResponse(rows, { status: 422, data: [] }, 1, text).rows[0]
        .status
    ).toBe('request-failed')
    expect(processNetworkFailure(rows, 1, text).rows[0].status).toBe(
      'outcome-uncertain'
    )
  })
})
