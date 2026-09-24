import Papa from 'papaparse'
import readExcelFile from 'read-excel-file/browser'

import { BATCH_FILE_SIZE_LIMIT, BATCH_ROW_LIMIT } from './types'
import type { CsvDelimiter, ParsedSheet, SourceCell, SourceRow } from './types'

export type ImportFileErrorCode =
  | 'unsupported-extension'
  | 'xls-not-supported'
  | 'empty-file'
  | 'file-too-large'
  | 'parse-failed'
  | 'no-worksheets'
  | 'no-usable-rows'
  | 'too-many-rows'

export class ImportFileError extends Error {
  constructor(public readonly code: ImportFileErrorCode) {
    super(code)
    this.name = 'ImportFileError'
  }
}

function columnName(index: number): string {
  let value = index + 1
  let name = ''
  while (value > 0) {
    const remainder = (value - 1) % 26
    name = String.fromCharCode(65 + remainder) + name
    value = Math.floor((value - 1) / 26)
  }
  return `Column ${name}`
}

function cellToSourceCell(value: unknown): SourceCell {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) return value
  return String(value)
}

function isEmptyRow(row: SourceCell[]) {
  return row.every((value) => value === null || String(value).trim() === '')
}

function normalizeRows(rows: SourceCell[][]): SourceRow[] {
  const lastUsableRow = rows.reduce(
    (last, row, index) => (isEmptyRow(row) ? last : index),
    -1
  )
  if (lastUsableRow < 0) return []

  const width = rows.reduce((max, row) => Math.max(max, row.length), 0)
  return rows.slice(0, lastUsableRow + 1).map((values, index) => ({
    sourceRowNumber: index + 1,
    values: Array.from(
      { length: width },
      (_, columnIndex) => values[columnIndex] ?? null
    )
  }))
}

function disambiguateHeaders(values: SourceCell[], width: number): string[] {
  const counts = new Map<string, number>()
  return Array.from({ length: width }, (_, index) => {
    const raw = values[index] === null ? '' : String(values[index]).trim()
    const base = raw || columnName(index)
    const count = (counts.get(base) ?? 0) + 1
    counts.set(base, count)
    return count === 1 ? base : `${base} (${count})`
  })
}

export function prepareSheet(
  name: string,
  rows: SourceRow[],
  headerRowIndex: number | null
): ParsedSheet {
  const width = rows.reduce((max, row) => Math.max(max, row.values.length), 0)
  const safeHeaderIndex =
    headerRowIndex !== null && rows[headerRowIndex] ? headerRowIndex : null
  const headers =
    safeHeaderIndex === null
      ? Array.from({ length: width }, (_, index) => columnName(index))
      : disambiguateHeaders(rows[safeHeaderIndex].values, width)
  const dataRows =
    safeHeaderIndex === null ? rows : rows.slice(safeHeaderIndex + 1)

  return {
    name,
    rawRows: rows,
    rows: dataRows,
    headers,
    headerRowIndex: safeHeaderIndex,
    hasHeader: safeHeaderIndex !== null
  }
}

function assertFileCanBeRead(file: File) {
  const extension = file.name.toLowerCase().split('.').pop()
  if (extension === 'xls') throw new ImportFileError('xls-not-supported')
  if (extension !== 'csv' && extension !== 'xlsx') {
    throw new ImportFileError('unsupported-extension')
  }
  if (file.size === 0) throw new ImportFileError('empty-file')
  if (file.size > BATCH_FILE_SIZE_LIMIT) {
    throw new ImportFileError('file-too-large')
  }
  return extension
}

async function parseCsv(
  file: File,
  delimiter: CsvDelimiter = 'auto'
): Promise<ParsedSheet[]> {
  const text = await file.text()
  const guessed = Papa.parse<string[]>(text, {
    preview: 25,
    skipEmptyLines: false,
    delimitersToGuess: [',', ';'],
    worker: false
  })
  const selectedDelimiter =
    delimiter === 'auto' ? guessed.meta.delimiter || ',' : delimiter
  const parsed = Papa.parse<string[]>(text, {
    delimiter: selectedDelimiter,
    skipEmptyLines: false,
    worker: false
  })
  if (parsed.errors.length > 0) throw new ImportFileError('parse-failed')
  const rows = normalizeRows(
    parsed.data.map((row) => row.map(cellToSourceCell))
  )
  if (rows.length === 0) throw new ImportFileError('no-usable-rows')
  if (rows.length > BATCH_ROW_LIMIT) {
    throw new ImportFileError('too-many-rows')
  }
  const suggestedHeader = rows.findIndex((row) => !isEmptyRow(row.values))
  return [
    prepareSheet('CSV', rows, suggestedHeader < 0 ? null : suggestedHeader)
  ]
}

async function parseXlsx(file: File): Promise<ParsedSheet[]> {
  try {
    const sheets = await readExcelFile(file, {
      parseNumber: (value: string) => value
    })
    if (!sheets.length) throw new ImportFileError('no-worksheets')
    const parsedSheets = sheets.map(({ sheet, data }) => {
      const rows = normalizeRows(
        data.map((row) => row.map((value) => cellToSourceCell(value)))
      )
      return prepareSheet(
        sheet,
        rows,
        rows.findIndex((row) => !isEmptyRow(row.values))
      )
    })
    const rowCount = parsedSheets.reduce(
      (total, sheet) => total + sheet.rows.length,
      0
    )
    if (rowCount === 0) throw new ImportFileError('no-usable-rows')
    if (rowCount > BATCH_ROW_LIMIT) throw new ImportFileError('too-many-rows')
    return parsedSheets
  } catch (error) {
    if (error instanceof ImportFileError) throw error
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'XLS_FILE_NOT_SUPPORTED'
    ) {
      throw new ImportFileError('xls-not-supported')
    }
    throw new ImportFileError('parse-failed')
  }
}

export async function parseImportFile(
  file: File,
  delimiter: CsvDelimiter = 'auto'
): Promise<ParsedSheet[]> {
  const extension = assertFileCanBeRead(file)
  return extension === 'csv' ? parseCsv(file, delimiter) : parseXlsx(file)
}
