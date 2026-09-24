import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from 'react-oidc-context'
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentArrowUpIcon,
  ExclamationTriangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

import Panel from '../../../core/components/common/Panel'
import PrimaryButton from '../../../core/components/form/buttons/PrimaryButton'
import PrimaryOutlinedButton from '../../../core/components/form/buttons/PrimaryOutlinedButton'
import SecondaryOutlinedButton from '../../../core/components/form/buttons/SecondaryOutlinedButton'
import TrustDeck from '../../../core/services/TrustDeck'
import {
  canUseDomainAction,
  getCurrentUserAccess,
  type CachedUserAccess
} from '../../../core/services/PermissionCache'
import {
  prepareSheet,
  parseImportFile,
  ImportFileError
} from '../batch-import/parser'
import {
  hasCompleteMapping,
  mappingUsesSourceColumn,
  suggestMapping
} from '../batch-import/mapping'
import {
  processChunkResponse,
  processNetworkFailure
} from '../batch-import/results'
import {
  BATCH_REQUEST_SIZE,
  type ColumnMapping,
  type CsvDelimiter,
  type DateFormat,
  type ImportField,
  type ImportResult,
  type ImportResultRow,
  type ParsedSheet
} from '../batch-import/types'
import { validateRows } from '../batch-import/validation'

type BatchStage =
  | 'file'
  | 'mapping'
  | 'preview'
  | 'confirmation'
  | 'processing'
  | 'results'

type Props = {
  projectAbbreviation: string
  domainName: string
  onCancel: () => void
  onDone: () => void
}

const EMPTY_MAPPING: ColumnMapping = {
  identifier: null,
  idType: null,
  idTypeFixed: '',
  psn: null,
  validFrom: null,
  validTo: null,
  validityTime: null
}

const PAGE_SIZE = 25

function TablePagination({
  page,
  total,
  onPageChange,
  hasIssues,
  onNextIssue
}: {
  page: number
  total: number
  onPageChange: (page: number) => void
  hasIssues: boolean
  onNextIssue: () => void
}) {
  const { t } = useTranslation('pseudonyms')
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const [pageInput, setPageInput] = useState(String(page + 1))

  useEffect(() => {
    setPageInput(String(page + 1))
  }, [page])

  const commitPageInput = () => {
    const requestedPage = Number(pageInput)
    if (!Number.isFinite(requestedPage)) {
      setPageInput(String(page + 1))
      return
    }
    onPageChange(Math.min(pageCount - 1, Math.max(0, requestedPage - 1)))
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
      <button
        type="button"
        title={t('search:pagination.previous')}
        aria-label={t('search:pagination.previous')}
        onClick={() => onPageChange(Math.max(0, page - 1))}
        disabled={page === 0}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-color-blue text-color-blue transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </button>
      <label className="flex items-center gap-2">
        <span className="sr-only">{t('batch.pageNumber')}</span>
        <input
          type="number"
          min={1}
          max={pageCount}
          value={pageInput}
          onChange={(event) => setPageInput(event.target.value)}
          onBlur={commitPageInput}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commitPageInput()
          }}
          className="w-20 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-center font-medium dark:border-slate-700 dark:bg-slate-950 dark:text-gray-100"
        />
        <span>{t('batch.pageOf', { pages: pageCount })}</span>
      </label>
      <button
        type="button"
        title={t('search:pagination.next')}
        aria-label={t('search:pagination.next')}
        onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
        disabled={page >= pageCount - 1}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-color-blue text-color-blue transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
      >
        <ChevronRightIcon className="h-5 w-5" />
      </button>
      {hasIssues && (
        <SecondaryOutlinedButton
          label={t('batch.nextIssue')}
          onClick={onNextIssue}
        />
      )}
    </div>
  )
}

function extensionOf(file: File | null) {
  return file?.name.toLowerCase().split('.').pop() ?? ''
}

function statusLabel(t: (key: string) => string, status: string): string {
  return t(`batch.status.${status}`)
}

function escapeCsv(value: string | number | undefined) {
  const text = String(value ?? '')
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function downloadResults(rows: ImportResultRow[]) {
  const header = [
    'sourceRowNumber',
    'identifier',
    'idType',
    'pseudonym',
    'status',
    'validationDetails'
  ]
  const csv = [
    header,
    ...rows.map((row) => [
      row.sourceRowNumber,
      row.identifier,
      row.idType,
      row.pseudonym ?? '',
      row.status,
      [row.validationStatus, row.validationMessage, row.message]
        .filter(Boolean)
        .join(' - ')
    ])
  ]
    .map((line) => line.map((value) => escapeCsv(value)).join(','))
    .join('\r\n')
  const url = URL.createObjectURL(
    new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  )
  const link = document.createElement('a')
  link.href = url
  link.download = 'pseudonym-import-results.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export default function BatchPseudonymImport({
  projectAbbreviation,
  domainName,
  onCancel,
  onDone
}: Props) {
  const { t } = useTranslation('pseudonyms')
  const auth = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [stage, setStage] = useState<BatchStage>('file')
  const [file, setFile] = useState<File | null>(null)
  const [sheets, setSheets] = useState<ParsedSheet[]>([])
  const [sheetIndex, setSheetIndex] = useState(0)
  const [headerChoice, setHeaderChoice] = useState('suggested')
  const [delimiter, setDelimiter] = useState<CsvDelimiter>('auto')
  const [mapping, setMapping] = useState<ColumnMapping>(EMPTY_MAPPING)
  const [dateFormat, setDateFormat] = useState<DateFormat>('auto')
  const [excludedRows, setExcludedRows] = useState<Set<number>>(new Set())
  const [includeDuplicateRows, setIncludeDuplicateRows] = useState(false)
  const [page, setPage] = useState(0)
  const [previewIssueCursor, setPreviewIssueCursor] = useState(-1)
  const [resultPage, setResultPage] = useState(0)
  const [resultIssueCursor, setResultIssueCursor] = useState(-1)
  const [parsing, setParsing] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [permissionAccess, setPermissionAccess] =
    useState<CachedUserAccess | null>(null)
  const [completedChunks, setCompletedChunks] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)

  useEffect(() => {
    let active = true
    const token = auth.user?.access_token
    if (!token) return undefined
    TrustDeck.instance().setToken(token)
    getCurrentUserAccess(false)
      .then((access) => {
        if (active) setPermissionAccess(access)
      })
      .catch(() => {
        if (active) setPermissionAccess(null)
      })
    return () => {
      active = false
    }
  }, [auth.user?.access_token])

  const selectedSheet = sheets[sheetIndex]
  const activeSheet = useMemo(() => {
    if (!selectedSheet) return null
    const selectedHeader =
      headerChoice === 'none'
        ? null
        : Number(
            headerChoice === 'suggested'
              ? selectedSheet.headerRowIndex
              : headerChoice
          )
    return prepareSheet(
      selectedSheet.name,
      selectedSheet.rawRows,
      Number.isNaN(selectedHeader) ? null : selectedHeader
    )
  }, [headerChoice, selectedSheet])

  const validatedRows = useMemo(() => {
    if (!activeSheet || !hasCompleteMapping(mapping)) return []
    return validateRows(activeSheet.rows, mapping, dateFormat, {
      missingIdentifier: t('batch.validation.missingIdentifier'),
      missingIdType: t('batch.validation.missingIdType'),
      invalidDate: t('batch.validation.invalidDate'),
      dateOrder: t('batch.validation.dateOrder'),
      validityConflict: t('batch.validation.validityConflict'),
      duplicatePair: t('batch.validation.duplicatePair'),
      duplicatePseudonym: t('batch.validation.duplicatePseudonym'),
      emptyRow: t('batch.validation.emptyRow')
    })
  }, [activeSheet, dateFormat, mapping, t])

  const validRows = validatedRows.filter((row) => row.status !== 'invalid')
  const invalidRows = validatedRows.filter((row) => row.status === 'invalid')
  const warningRows = validatedRows.filter((row) => row.status === 'warning')
  const excludedCount = excludedRows.size
  const rowsToSubmit = validatedRows.filter(
    (row) =>
      row.status !== 'invalid' &&
      !excludedRows.has(row.sourceRowNumber) &&
      (includeDuplicateRows ||
        !row.duplicatePair ||
        row.sourceRowNumber ===
          validatedRows.find(
            (candidate) =>
              `${candidate.identifier}\u0000${candidate.idType}` ===
              `${row.identifier}\u0000${row.idType}`
          )?.sourceRowNumber)
  )
  const chunkCount = Math.ceil(rowsToSubmit.length / BATCH_REQUEST_SIZE)
  const hasDuplicateSourceMappings = Boolean(
    activeSheet?.headers.some(
      (_, index) => mappingUsesSourceColumn(mapping, index).length > 1
    )
  )
  const canCreateBatch =
    !permissionAccess ||
    canUseDomainAction(permissionAccess, domainName, 'pseudonym:create-batch')
  const resultText = {
    unauthenticated: t('batch.results.unauthenticated'),
    permissionDenied: t('batch.results.permissionDenied'),
    domainUnavailable: t('batch.results.domainUnavailable'),
    rejected: t('batch.results.rejected'),
    serverUncertain: t('batch.results.serverUncertain'),
    requestNotAccepted: (status: number) =>
      t('batch.results.requestNotAccepted', { status }),
    partialRow: t('batch.results.partialRow'),
    partialChunk: t('batch.results.partialChunk'),
    networkUncertain: t('batch.results.networkUncertain')
  }

  const parseFile = async (nextFile: File, nextDelimiter = delimiter) => {
    setError('')
    setParsing(true)
    try {
      const parsed = await parseImportFile(nextFile, nextDelimiter)
      setFile(nextFile)
      setSheets(parsed)
      setSheetIndex(0)
      setHeaderChoice(parsed[0]?.headerRowIndex === null ? 'none' : 'suggested')
      setMapping(parsed[0] ? suggestMapping(parsed[0].headers) : EMPTY_MAPPING)
      setExcludedRows(new Set())
      setResult(null)
      setStage('file')
    } catch (parseError) {
      const code =
        parseError instanceof ImportFileError ? parseError.code : 'parse-failed'
      setError(t(`batch.fileErrors.${code}`))
      setFile(null)
      setSheets([])
    } finally {
      setParsing(false)
    }
  }

  const selectFile = (nextFile: File | undefined) => {
    if (nextFile) void parseFile(nextFile)
  }

  const updateSheet = (nextIndex: number) => {
    const nextSheet = sheets[nextIndex]
    setSheetIndex(nextIndex)
    setHeaderChoice(nextSheet?.headerRowIndex === null ? 'none' : 'suggested')
    setMapping(nextSheet ? suggestMapping(nextSheet.headers) : EMPTY_MAPPING)
    setPage(0)
  }

  const updateHeaderChoice = (choice: string) => {
    setHeaderChoice(choice)
    const nextHeader =
      choice === 'none'
        ? null
        : Number(
            choice === 'suggested' ? selectedSheet?.headerRowIndex : choice
          )
    const nextSheet =
      selectedSheet &&
      prepareSheet(
        selectedSheet.name,
        selectedSheet.rawRows,
        Number.isNaN(nextHeader) ? null : nextHeader
      )
    setMapping(nextSheet ? suggestMapping(nextSheet.headers) : EMPTY_MAPPING)
    setPage(0)
  }

  const toggleExcluded = (sourceRowNumber: number) => {
    setExcludedRows((current) => {
      const next = new Set(current)
      if (next.has(sourceRowNumber)) next.delete(sourceRowNumber)
      else next.add(sourceRowNumber)
      return next
    })
  }

  const startProcessing = async () => {
    if (!domainName || !canCreateBatch || rowsToSubmit.length === 0) return
    setStage('processing')
    setProcessing(true)
    setCompletedChunks(0)
    const resultRows: ImportResultRow[] = validatedRows.map((row) => {
      if (row.status === 'invalid') {
        return {
          sourceRowNumber: row.sourceRowNumber,
          identifier: row.identifier,
          idType: row.idType,
          validationStatus: row.status,
          status: 'invalid',
          ...(row.psn ? { pseudonym: row.psn } : {}),
          ...(row.messages.length
            ? {
                validationMessage: row.messages
                  .map((item) => item.message)
                  .join('; ')
              }
            : {})
        }
      }
      if (excludedRows.has(row.sourceRowNumber)) {
        return {
          sourceRowNumber: row.sourceRowNumber,
          identifier: row.identifier,
          idType: row.idType,
          validationStatus: row.status,
          status: 'excluded',
          ...(row.psn ? { pseudonym: row.psn } : {}),
          message: t('batch.results.excluded')
        }
      }
      if (
        !includeDuplicateRows &&
        row.duplicatePair &&
        row.sourceRowNumber !==
          validatedRows.find(
            (candidate) =>
              `${candidate.identifier}\u0000${candidate.idType}` ===
              `${row.identifier}\u0000${row.idType}`
          )?.sourceRowNumber
      ) {
        return {
          sourceRowNumber: row.sourceRowNumber,
          identifier: row.identifier,
          idType: row.idType,
          validationStatus: row.status,
          status: 'not-submitted',
          ...(row.psn ? { pseudonym: row.psn } : {}),
          message: t('batch.results.duplicateNotSubmitted')
        }
      }
      return {
        sourceRowNumber: row.sourceRowNumber,
        identifier: row.identifier,
        idType: row.idType,
        validationStatus: row.status,
        status: 'not-submitted',
        ...(row.psn ? { pseudonym: row.psn } : {}),
        message: t('batch.results.notStarted')
      }
    })
    const chunks = []
    for (
      let index = 0;
      index < rowsToSubmit.length;
      index += BATCH_REQUEST_SIZE
    ) {
      chunks.push(rowsToSubmit.slice(index, index + BATCH_REQUEST_SIZE))
    }
    const chunkOutcomes = []
    const returnedPseudonyms: string[] = []
    let stopped = false
    let stopMessage = ''
    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index]
      try {
        const response =
          await TrustDeck.instance().createPseudonymsBatchWithStatus(
            chunk.flatMap((row) => (row.payload ? [row.payload] : [])),
            domainName
          )
        const processed = processChunkResponse(
          chunk,
          response,
          index + 1,
          resultText
        )
        processed.rows.forEach((processedRow) => {
          const position = resultRows.findIndex(
            (row) => row.sourceRowNumber === processedRow.sourceRowNumber
          )
          if (position >= 0) resultRows[position] = processedRow
        })
        chunkOutcomes.push(processed.outcome)
        returnedPseudonyms.push(...processed.returnedPseudonyms)
        setCompletedChunks(index + 1)
        if (processed.stop) {
          stopped = true
          stopMessage = processed.stopMessage ?? ''
          break
        }
      } catch {
        const processed = processNetworkFailure(chunk, index + 1, resultText)
        processed.rows.forEach((processedRow) => {
          const position = resultRows.findIndex(
            (row) => row.sourceRowNumber === processedRow.sourceRowNumber
          )
          if (position >= 0) resultRows[position] = processedRow
        })
        chunkOutcomes.push(processed.outcome)
        returnedPseudonyms.push(...processed.returnedPseudonyms)
        stopped = true
        stopMessage = processed.stopMessage ?? ''
        break
      }
    }
    if (stopped) {
      const startedRows = chunks.slice(0, chunkOutcomes.length).flat()
      resultRows.forEach((row, index) => {
        if (
          row.status === 'not-submitted' &&
          !startedRows.some(
            (started) => started.sourceRowNumber === row.sourceRowNumber
          )
        ) {
          resultRows[index] = {
            ...row,
            message: t('batch.results.notStartedAfterStop')
          }
        }
      })
    }
    setResult({
      rows: resultRows,
      chunks: chunkOutcomes,
      returnedPseudonyms,
      stopped,
      stopMessage
    })
    setResultPage(0)
    setResultIssueCursor(-1)
    setProcessing(false)
    setStage('results')
  }

  const visibleRows = validatedRows.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE
  )
  const previewIssues = validatedRows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => row.status !== 'valid')
  const resultIssues = result
    ? result.rows
        .map((row, index) => ({ row, index }))
        .filter(
          ({ row }) =>
            row.validationStatus !== 'valid' || row.status !== 'created'
        )
    : []
  const visibleResultRows = result
    ? result.rows.slice(resultPage * PAGE_SIZE, (resultPage + 1) * PAGE_SIZE)
    : []
  const permissionMessage = permissionAccess && !canCreateBatch

  const goToNextIssue = (
    issues: { index: number }[],
    cursor: number,
    setCursor: (index: number) => void,
    setTargetPage: (page: number) => void
  ) => {
    if (!issues.length) return
    const nextIssue = issues.find(({ index }) => index > cursor) ?? issues[0]
    setCursor(nextIssue.index)
    setTargetPage(Math.floor(nextIssue.index / PAGE_SIZE))
  }

  return (
    <Panel noMaxWidth className="mx-auto w-full">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="td-panel-title">{t('batch.title')}</h2>
          <p className="td-section-subtitle mt-1">{t('batch.description')}</p>
        </div>
        {stage !== 'results' && (
          <SecondaryOutlinedButton
            label={t('common:cancel')}
            onClick={onCancel}
            icon={<XMarkIcon className="mr-1 h-5 w-5" />}
            disabled={processing}
          />
        )}
      </div>

      {stage !== 'results' && (
        <div
          className="mb-5 flex flex-wrap gap-2 text-sm"
          aria-label={t('batch.stageLabel')}
        >
          {(['file', 'mapping', 'preview', 'confirmation'] as const).map(
            (item, index) => (
              <span
                key={item}
                className={`rounded-full px-3 py-1 ${stage === item ? 'bg-color-blue text-white' : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300'}`}
              >
                {index + 1}. {t(`batch.stages.${item}`)}
              </span>
            )
          )}
        </div>
      )}

      {stage === 'file' && (
        <div className="space-y-5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="sr-only"
            onChange={(event) => {
              selectFile(event.target.files?.[0])
              event.target.value = ''
            }}
          />
          {!file ? (
            <div
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center focus-within:ring-2 focus-within:ring-color-blue dark:border-slate-700 dark:bg-slate-900"
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ')
                  fileInputRef.current?.click()
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                selectFile(event.dataTransfer.files[0])
              }}
            >
              <DocumentArrowUpIcon
                className="h-10 w-10 text-color-blue"
                aria-hidden="true"
              />
              <p className="font-semibold">{t('batch.fileDrop')}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('batch.fileTypes')}
              </p>
              <PrimaryOutlinedButton
                label={t('batch.chooseFile')}
                onClick={() => fileInputRef.current?.click()}
                disabled={parsing}
              />
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-base font-medium">
                {t('batch.selectedFile', {
                  name: file.name,
                  size: Math.ceil(file.size / 1024)
                })}
              </p>
              <PrimaryOutlinedButton
                label={t('batch.changeFile')}
                onClick={() => fileInputRef.current?.click()}
                disabled={parsing}
              />
            </div>
          )}
          {file && extensionOf(file) === 'csv' && (
            <label className="block max-w-sm">
              <span className="td-field-label mb-1 block">
                {t('batch.delimiter')}
              </span>
              <select
                value={delimiter}
                onChange={(event) => {
                  const next = event.target.value as CsvDelimiter
                  setDelimiter(next)
                  void parseFile(file, next)
                }}
                className="w-full rounded-lg border border-color-light-gray bg-white px-3 py-2 dark:bg-slate-900"
              >
                <option value="auto">{t('batch.delimiterAuto')}</option>
                <option value=",">{t('batch.delimiterComma')}</option>
                <option value=";">{t('batch.delimiterSemicolon')}</option>
              </select>
            </label>
          )}
          {file && extensionOf(file) === 'xlsx' && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              <ExclamationTriangleIcon className="mr-1 inline h-4 w-4" />
              {t('batch.xlsxIdentifierWarning')}
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}
          {sheets.length > 1 && (
            <label className="block max-w-sm">
              <span className="td-field-label mb-1 block">
                {t('batch.worksheet')}
              </span>
              <select
                value={sheetIndex}
                onChange={(event) => updateSheet(Number(event.target.value))}
                className="w-full rounded-lg border border-color-light-gray bg-white px-3 py-2 dark:bg-slate-900"
              >
                {sheets.map((sheet, index) => (
                  <option key={sheet.name} value={index}>
                    {sheet.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {activeSheet && activeSheet.rows.length === 0 && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {t('batch.fileErrors.no-usable-rows')}
            </p>
          )}
          <div className="flex justify-end">
            <span
              title={
                file && !domainName ? t('batch.domainRequired') : undefined
              }
            >
              <PrimaryButton
                label={t('batch.next')}
                onClick={() => setStage('mapping')}
                disabled={!file || !activeSheet || !domainName || parsing}
                icon={<ArrowRightIcon className="mr-1 h-5 w-5" />}
              />
            </span>
          </div>
        </div>
      )}

      {stage === 'mapping' && activeSheet && (
        <div className="space-y-5">
          <label className="block max-w-sm">
            <span className="td-field-label mb-1 block">
              {t('batch.headerRow')}
            </span>
            <select
              value={headerChoice}
              onChange={(event) => updateHeaderChoice(event.target.value)}
              className="w-full rounded-lg border border-color-light-gray bg-white px-3 py-2 dark:bg-slate-900"
            >
              <option value="suggested">
                {t('batch.suggestedHeader', {
                  row: (selectedSheet?.headerRowIndex ?? 0) + 1
                })}
              </option>
              {selectedSheet?.rawRows.map((row, index) => (
                <option key={row.sourceRowNumber} value={index}>
                  {t('batch.headerRowOption', { row: row.sourceRowNumber })}
                </option>
              ))}
              <option value="none">{t('batch.noHeader')}</option>
            </select>
          </label>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t('batch.mappingSuggestion')}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {(
              [
                'identifier',
                'idType',
                'psn',
                'validFrom',
                'validTo',
                'validityTime'
              ] as ImportField[]
            ).map((field) => (
              <label key={field} className="block">
                <span className="td-field-label mb-1 block">
                  {t(`batch.fields.${field}`)}
                  {field === 'identifier' || field === 'idType' ? ' *' : ''}
                </span>
                <select
                  value={mapping[field] ?? ''}
                  onChange={(event) =>
                    setMapping((current) => ({
                      ...current,
                      [field]:
                        event.target.value === ''
                          ? null
                          : Number(event.target.value),
                      ...(field === 'idType' ? { idTypeFixed: '' } : {})
                    }))
                  }
                  className="w-full rounded-lg border border-color-light-gray bg-white px-3 py-2 dark:bg-slate-900"
                >
                  <option value="">{t('batch.notMapped')}</option>
                  {activeSheet.headers.map((header, index) => (
                    <option key={`${header}-${index}`} value={index}>
                      {header}
                    </option>
                  ))}
                </select>
                {field === 'idType' && (
                  <input
                    value={mapping.idTypeFixed}
                    onChange={(event) =>
                      setMapping((current) => ({
                        ...current,
                        idType: null,
                        idTypeFixed: event.target.value
                      }))
                    }
                    placeholder={t('batch.fixedIdType')}
                    className="mt-2 w-full rounded-lg border border-color-light-gray bg-white px-3 py-2 dark:bg-slate-900"
                  />
                )}
              </label>
            ))}
          </div>
          <label className="block max-w-sm">
            <span className="td-field-label mb-1 block">
              {t('batch.dateFormat')}
            </span>
            <select
              value={dateFormat}
              onChange={(event) =>
                setDateFormat(event.target.value as DateFormat)
              }
              className="w-full rounded-lg border border-color-light-gray bg-white px-3 py-2 dark:bg-slate-900"
            >
              {(
                [
                  'auto',
                  'YYYY-MM-DD',
                  'YYYY-MM-DD HH:mm:ss',
                  'DD.MM.YYYY',
                  'DD.MM.YYYY HH:mm:ss'
                ] as DateFormat[]
              ).map((format) => (
                <option key={format} value={format}>
                  {format === 'auto' ? t('batch.dateFormatAuto') : format}
                </option>
              ))}
            </select>
          </label>
          {hasDuplicateSourceMappings && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              {t('batch.mappingDuplicateWarning')}
            </p>
          )}
          <div className="flex justify-between">
            <SecondaryOutlinedButton
              label={t('batch.back')}
              onClick={() => setStage('file')}
              icon={<ArrowLeftIcon className="mr-1 h-5 w-5" />}
            />
            <PrimaryButton
              label={t('batch.next')}
              onClick={() => setStage('preview')}
              disabled={!hasCompleteMapping(mapping)}
              icon={<ArrowRightIcon className="mr-1 h-5 w-5" />}
            />
          </div>
        </div>
      )}

      {stage === 'preview' && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3 text-sm">
            <span>
              {t('batch.summary.total', { count: validatedRows.length })}
            </span>
            <span>{t('batch.summary.valid', { count: validRows.length })}</span>
            <span>
              {t('batch.summary.invalid', { count: invalidRows.length })}
            </span>
            <span>
              {t('batch.summary.warnings', { count: warningRows.length })}
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <SecondaryOutlinedButton
              label={t('batch.excludeInvalid')}
              onClick={() =>
                setExcludedRows(
                  new Set(invalidRows.map((row) => row.sourceRowNumber))
                )
              }
              disabled={!invalidRows.length}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeDuplicateRows}
                onChange={(event) =>
                  setIncludeDuplicateRows(event.target.checked)
                }
              />
              {t('batch.includeDuplicateRows')}
            </label>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2">{t('batch.table.row')}</th>
                  <th className="px-3 py-2">{t('batch.fields.identifier')}</th>
                  <th className="px-3 py-2">{t('batch.fields.idType')}</th>
                  <th className="px-3 py-2">{t('batch.fields.psn')}</th>
                  <th className="px-3 py-2">{t('batch.table.status')}</th>
                  <th className="px-3 py-2">{t('batch.table.messages')}</th>
                  <th className="px-3 py-2">{t('batch.table.exclude')}</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => {
                  const validated = validatedRows.find(
                    (item) => item.sourceRowNumber === row.sourceRowNumber
                  )
                  return (
                    <tr
                      key={row.sourceRowNumber}
                      className="border-t border-gray-200 dark:border-slate-700"
                    >
                      <td className="px-3 py-2">{row.sourceRowNumber}</td>
                      <td className="px-3 py-2 font-mono">
                        {validated?.identifier || t('batch.table.noValue')}
                      </td>
                      <td className="px-3 py-2">
                        {validated?.idType || t('batch.table.noValue')}
                      </td>
                      <td className="px-3 py-2 font-mono">
                        {validated?.psn || t('batch.table.noValue')}
                      </td>
                      <td className="px-3 py-2">
                        {statusLabel(t, validated?.status ?? 'invalid')}
                      </td>
                      <td className="px-3 py-2">
                        {validated?.messages
                          .map((item) => item.message)
                          .join('; ') || t('batch.table.ready')}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={excludedRows.has(row.sourceRowNumber)}
                          onChange={() => toggleExcluded(row.sourceRowNumber)}
                          aria-label={t('batch.table.excludeRow', {
                            row: row.sourceRowNumber
                          })}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={page}
            total={validatedRows.length}
            onPageChange={setPage}
            hasIssues={previewIssues.length > 0}
            onNextIssue={() =>
              goToNextIssue(
                previewIssues,
                previewIssueCursor,
                setPreviewIssueCursor,
                setPage
              )
            }
          />
          <div className="flex justify-between">
            <SecondaryOutlinedButton
              label={t('batch.back')}
              onClick={() => setStage('mapping')}
              icon={<ArrowLeftIcon className="mr-1 h-5 w-5" />}
            />
            <PrimaryButton
              label={t('batch.review')}
              onClick={() => setStage('confirmation')}
              disabled={!rowsToSubmit.length}
              icon={<ArrowRightIcon className="mr-1 h-5 w-5" />}
            />
          </div>
        </div>
      )}

      {stage === 'confirmation' && (
        <div className="space-y-5">
          <h3 className="td-section-title">{t('batch.confirmationTitle')}</h3>
          <dl className="grid gap-3 rounded-xl bg-gray-50 p-4 text-sm dark:bg-slate-900 sm:grid-cols-2">
            <div>
              <dt className="font-semibold">{t('batch.confirmation.file')}</dt>
              <dd>{file?.name}</dd>
            </div>
            <div>
              <dt className="font-semibold">
                {t('batch.confirmation.project')}
              </dt>
              <dd>{projectAbbreviation}</dd>
            </div>
            <div>
              <dt className="font-semibold">
                {t('batch.confirmation.domain')}
              </dt>
              <dd>{domainName}</dd>
            </div>
            <div>
              <dt className="font-semibold">{t('batch.confirmation.total')}</dt>
              <dd>{validatedRows.length}</dd>
            </div>
            <div>
              <dt className="font-semibold">{t('batch.confirmation.valid')}</dt>
              <dd>{validRows.length}</dd>
            </div>
            <div>
              <dt className="font-semibold">
                {t('batch.confirmation.invalid')}
              </dt>
              <dd>{invalidRows.length}</dd>
            </div>
            <div>
              <dt className="font-semibold">
                {t('batch.confirmation.warnings')}
              </dt>
              <dd>{warningRows.length}</dd>
            </div>
            <div>
              <dt className="font-semibold">
                {t('batch.confirmation.excluded')}
              </dt>
              <dd>{excludedCount}</dd>
            </div>
            <div>
              <dt className="font-semibold">{t('batch.confirmation.rows')}</dt>
              <dd>{rowsToSubmit.length}</dd>
            </div>
            <div>
              <dt className="font-semibold">
                {t('batch.confirmation.chunks')}
              </dt>
              <dd>{chunkCount}</dd>
            </div>
            <div>
              <dt className="font-semibold">
                {t('batch.confirmation.pseudonyms')}
              </dt>
              <dd>
                {mapping.psn === null
                  ? t('batch.generated')
                  : t('batch.supplied')}
              </dd>
            </div>
          </dl>
          {permissionMessage && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {t('batch.permissionDenied')}
            </p>
          )}
          <div className="flex justify-between">
            <SecondaryOutlinedButton
              label={t('batch.back')}
              onClick={() => setStage('preview')}
              icon={<ArrowLeftIcon className="mr-1 h-5 w-5" />}
            />
            <PrimaryButton
              label={t('batch.start')}
              onClick={() => void startProcessing()}
              disabled={!canCreateBatch || !rowsToSubmit.length}
            />
          </div>
        </div>
      )}

      {stage === 'processing' && (
        <div className="space-y-4" aria-live="polite">
          <p className="font-semibold">
            {t('batch.processing', {
              completed: completedChunks,
              total: chunkCount
            })}
          </p>
          <progress
            className="h-3 w-full"
            max={Math.max(1, chunkCount)}
            value={completedChunks}
          />
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t('batch.noRetry')}
          </p>
        </div>
      )}

      {stage === 'results' && result && (
        <div className="space-y-5">
          <h3 className="td-section-title">{t('batch.results.title')}</h3>
          <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <span>
              {t('batch.results.created', {
                count: result.rows.filter((row) => row.status === 'created')
                  .length
              })}
            </span>
            <span>
              {t('batch.results.invalid', {
                count: result.rows.filter((row) => row.status === 'invalid')
                  .length
              })}
            </span>
            <span>
              {t('batch.results.excludedCount', {
                count: result.rows.filter((row) => row.status === 'excluded')
                  .length
              })}
            </span>
            <span>
              {t('batch.results.notConfirmed', {
                count: result.rows.filter(
                  (row) => row.status === 'not-confirmed'
                ).length
              })}
            </span>
            <span>
              {t('batch.results.uncertain', {
                count: result.rows.filter(
                  (row) =>
                    row.status === 'outcome-uncertain' ||
                    row.status === 'request-failed'
                ).length
              })}
            </span>
          </div>
          {result.returnedPseudonyms.length > 0 && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              {t('batch.results.unmatchedPseudonyms', {
                values: result.returnedPseudonyms.join(', ')
              })}
            </p>
          )}
          {result.stopMessage && (
            <p
              role="alert"
              className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
            >
              {result.stopMessage}
            </p>
          )}
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2">{t('batch.table.row')}</th>
                  <th className="px-3 py-2">{t('batch.fields.identifier')}</th>
                  <th className="px-3 py-2">{t('batch.fields.idType')}</th>
                  <th className="px-3 py-2">{t('batch.table.pseudonym')}</th>
                  <th className="px-3 py-2">{t('batch.table.status')}</th>
                  <th className="px-3 py-2">
                    {t('batch.table.validationDetails')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleResultRows.map((row) => (
                  <tr
                    key={row.sourceRowNumber}
                    className="border-t border-gray-200 dark:border-slate-700"
                  >
                    <td className="px-3 py-2">{row.sourceRowNumber}</td>
                    <td className="px-3 py-2 font-mono">
                      {row.identifier || t('batch.table.noValue')}
                    </td>
                    <td className="px-3 py-2">
                      {row.idType || t('batch.table.noValue')}
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {row.pseudonym ?? t('batch.table.noValue')}
                    </td>
                    <td className="px-3 py-2">{statusLabel(t, row.status)}</td>
                    <td className="px-3 py-2">
                      <span>{statusLabel(t, row.validationStatus)}</span>
                      {(row.validationMessage || row.message) && (
                        <span className="block text-gray-600 dark:text-gray-300">
                          {[row.validationMessage, row.message]
                            .filter(Boolean)
                            .join('; ')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={resultPage}
            total={result.rows.length}
            onPageChange={setResultPage}
            hasIssues={resultIssues.length > 0}
            onNextIssue={() =>
              goToNextIssue(
                resultIssues,
                resultIssueCursor,
                setResultIssueCursor,
                setResultPage
              )
            }
          />
          <div className="flex flex-wrap justify-between gap-3">
            <SecondaryOutlinedButton
              label={t('batch.results.newImport')}
              onClick={() => {
                setStage('file')
                setFile(null)
                setSheets([])
                setResult(null)
              }}
            />
            <PrimaryOutlinedButton
              label={t('batch.results.downloadResults')}
              onClick={() => downloadResults(result.rows)}
              icon={<ArrowDownTrayIcon className="mr-1 h-5 w-5" />}
            />
            <PrimaryButton label={t('batch.results.done')} onClick={onDone} />
          </div>
        </div>
      )}
    </Panel>
  )
}
