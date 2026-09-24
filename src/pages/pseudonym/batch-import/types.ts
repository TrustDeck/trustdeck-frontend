import type { PseudonymCreatePayload } from '../../../core/services/TrustDeck'

export const BATCH_REQUEST_SIZE = 500
export const BATCH_ROW_LIMIT = 50_000
export const BATCH_FILE_SIZE_LIMIT = 25 * 1024 * 1024

export type ImportField =
  | 'identifier'
  | 'idType'
  | 'psn'
  | 'validFrom'
  | 'validTo'
  | 'validityTime'

export const IMPORT_FIELDS: ImportField[] = [
  'identifier',
  'idType',
  'psn',
  'validFrom',
  'validTo',
  'validityTime'
]

export type SourceCell = string | Date | null

export type SourceRow = {
  sourceRowNumber: number
  values: SourceCell[]
}

export type ParsedSheet = {
  name: string
  rawRows: SourceRow[]
  rows: SourceRow[]
  headers: string[]
  headerRowIndex: number | null
  hasHeader: boolean
}

export type DateFormat =
  | 'auto'
  | 'YYYY-MM-DD'
  | 'YYYY-MM-DD HH:mm:ss'
  | 'DD.MM.YYYY'
  | 'DD.MM.YYYY HH:mm:ss'

export type CsvDelimiter = 'auto' | ',' | ';'

export type ColumnMapping = {
  identifier: number | null
  idType: number | null
  idTypeFixed: string
  psn: number | null
  validFrom: number | null
  validTo: number | null
  validityTime: number | null
}

export type ValidationMessage = {
  code: string
  message: string
  severity: 'error' | 'warning'
}

export type ValidatedImportRow = {
  sourceRowNumber: number
  payload?: PseudonymCreatePayload
  identifier: string
  idType: string
  psn?: string
  status: 'valid' | 'invalid' | 'warning'
  messages: ValidationMessage[]
  duplicatePair: boolean
  duplicatePseudonym: boolean
}

export type ImportRowStatus =
  | 'created'
  | 'invalid'
  | 'excluded'
  | 'not-submitted'
  | 'not-confirmed'
  | 'request-failed'
  | 'outcome-uncertain'

export type ImportResultRow = {
  sourceRowNumber: number
  identifier: string
  idType: string
  validationStatus: ValidatedImportRow['status']
  validationMessage?: string
  status: ImportRowStatus
  pseudonym?: string
  message?: string
}

export type ChunkOutcome = {
  chunkIndex: number
  rowCount: number
  status: 'created' | 'partial' | 'request-failed' | 'outcome-uncertain'
  message?: string
}

export type ImportResult = {
  rows: ImportResultRow[]
  chunks: ChunkOutcome[]
  returnedPseudonyms: string[]
  stopped: boolean
  stopMessage?: string
}
