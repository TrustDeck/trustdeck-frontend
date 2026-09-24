import type { Pseudonym } from '../../../core/types/Pseudonym'
import type { ChunkOutcome, ImportResultRow, ValidatedImportRow } from './types'

export type BatchResponse = {
  status: number
  data: Pseudonym[]
  errorBody?: string
}

export type ResultText = {
  unauthenticated: string
  permissionDenied: string
  domainUnavailable: string
  rejected: string
  serverUncertain: string
  requestNotAccepted: (status: number) => string
  partialRow: string
  partialChunk: string
  networkUncertain: string
}

export type ProcessedChunk = {
  rows: ImportResultRow[]
  outcome: ChunkOutcome
  returnedPseudonyms: string[]
  stop: boolean
  stopMessage?: string
}

function rowBase(row: ValidatedImportRow): ImportResultRow {
  return {
    sourceRowNumber: row.sourceRowNumber,
    identifier: row.identifier,
    idType: row.idType,
    validationStatus: row.status,
    ...(row.messages.length
      ? {
          validationMessage: row.messages.map((item) => item.message).join('; ')
        }
      : {}),
    status: 'not-confirmed',
    ...(row.psn ? { pseudonym: row.psn } : {})
  }
}

function responseKey(item: Pseudonym): string | null {
  const identifier = item.identifierItem?.identifier?.trim()
  const idType = item.identifierItem?.idType?.trim()
  return identifier && idType ? `${identifier}\u0000${idType}` : null
}

function statusMessage(status: number, text: ResultText): string {
  switch (status) {
    case 401:
      return text.unauthenticated
    case 403:
      return text.permissionDenied
    case 404:
    case 410:
      return text.domainUnavailable
    case 422:
      return text.rejected
    case 500:
    case 502:
    case 503:
    case 504:
      return text.serverUncertain
    default:
      return text.requestNotAccepted(status)
  }
}

export function processChunkResponse(
  rows: ValidatedImportRow[],
  response: BatchResponse,
  chunkIndex: number,
  text: ResultText
): ProcessedChunk {
  const baseRows = rows.map(rowBase)
  if (response.status === 201 && response.data.length === rows.length) {
    return {
      rows: baseRows.map((row, index) => ({
        ...row,
        status: 'created',
        ...(response.data[index]?.psn
          ? { pseudonym: response.data[index].psn }
          : {})
      })),
      outcome: { chunkIndex, rowCount: rows.length, status: 'created' },
      returnedPseudonyms: [],
      stop: false
    }
  }

  if (response.status === 206) {
    const submittedKeys = new Set(
      rows.map((row) => `${row.identifier}\u0000${row.idType}`)
    )
    const returnedByKey = new Map<string, Pseudonym>()
    const duplicateKeys = new Set<string>()
    response.data.forEach((item) => {
      const key = responseKey(item)
      if (!key || returnedByKey.has(key)) {
        if (key) duplicateKeys.add(key)
        return
      }
      returnedByKey.set(key, item)
    })
    const rowsWithMatches = baseRows.map((row) => {
      const key = `${row.identifier}\u0000${row.idType}`
      const returned = duplicateKeys.has(key)
        ? undefined
        : returnedByKey.get(key)
      return returned
        ? {
            ...row,
            status: 'created' as const,
            ...(returned.psn ? { pseudonym: returned.psn } : {})
          }
        : {
            ...row,
            message: text.partialRow
          }
    })
    return {
      rows: rowsWithMatches,
      outcome: {
        chunkIndex,
        rowCount: rows.length,
        status: 'partial',
        message: text.partialChunk
      },
      returnedPseudonyms: response.data
        .filter((item) => {
          const key = responseKey(item)
          return !key || duplicateKeys.has(key) || !submittedKeys.has(key)
        })
        .map((item) => item.psn)
        .filter((value): value is string => Boolean(value)),
      stop: false
    }
  }

  const message = statusMessage(response.status, text)
  const uncertain =
    response.status >= 500 || response.status === 0 || response.status === 408
  return {
    rows: baseRows.map((row) => ({
      ...row,
      status: uncertain ? 'outcome-uncertain' : 'request-failed',
      message
    })),
    outcome: {
      chunkIndex,
      rowCount: rows.length,
      status: uncertain ? 'outcome-uncertain' : 'request-failed',
      message
    },
    returnedPseudonyms: [],
    stop: true,
    stopMessage: message
  }
}

export function processNetworkFailure(
  rows: ValidatedImportRow[],
  chunkIndex: number,
  text: ResultText
): ProcessedChunk {
  const message = text.networkUncertain
  return {
    rows: rows.map((row) => ({
      ...rowBase(row),
      status: 'outcome-uncertain',
      message
    })),
    outcome: {
      chunkIndex,
      rowCount: rows.length,
      status: 'outcome-uncertain',
      message
    },
    returnedPseudonyms: [],
    stop: true,
    stopMessage: message
  }
}
