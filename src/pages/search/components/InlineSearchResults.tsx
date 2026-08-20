import { Fragment, useEffect, useMemo, useState } from 'react'
import { Dialog } from 'primereact/dialog'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  FingerPrintIcon,
  PencilSquareIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import Panel from '../../../core/components/common/Panel'
import IconActionButton from '../../../core/components/common/IconActionButton'
import PrimaryButton from '../../../core/components/form/buttons/PrimaryButton'
import SecondaryOutlinedButton from '../../../core/components/form/buttons/SecondaryOutlinedButton'
import TrustDeck from '../../../core/services/TrustDeck'
import useProjectStore from '../../../core/stores/ProjectStore'
import useToastStore from '../../../core/stores/ToastStore'
import type { Pseudonym } from '../../../core/types/Pseudonym'
import useSearchResultsStore from '../stores/SearchResultsStore'
import usePseudonymStore from '../stores/PseudonymSearchResults'
import {
  formatDisplayValue,
  readDisplayValue,
  selectSummaryAttributes
} from '../utils/entityDisplay'
import InlineEntityDetail from './InlineEntityDetail'
import InlinePseudonymDetail from './InlinePseudonymDetail'

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100] as const

function resolveTrustDeckId(result: any): string {
  return String(
    result?.trustdeckID ??
      result?.trustdeckId ??
      result?.trustDeckId ??
      result?.data?.trustdeckID ??
      result?.data?.trustdeckId ??
      result?.data?.trustDeckId ??
      result?.id ??
      ''
  )
}

function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  alwaysShowPageSize = false,
  offerAllPageSizes = false
}: {
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  alwaysShowPageSize?: boolean
  offerAllPageSizes?: boolean
}) {
  const { t } = useTranslation('search')
  const pageCount = Math.ceil(total / pageSize)
  const pageSizeOptions = offerAllPageSizes
    ? [...PAGE_SIZE_OPTIONS]
    : PAGE_SIZE_OPTIONS.filter(
        (option) => option === 10 || option <= total
      )

  if (
    pageCount <= 1 &&
    pageSizeOptions.length <= 1 &&
    !alwaysShowPageSize
  )
    return null

  const showPageSize = alwaysShowPageSize || pageSizeOptions.length > 1

  return (
    <div className="grid grid-cols-1 items-center gap-4 px-5 py-4 sm:grid-cols-[1fr_auto_1fr]">
      {pageCount > 1 && (
        <div className="flex items-center justify-self-center gap-3 sm:col-start-2">
          <button
            type="button"
            title={t('pagination.previous')}
            aria-label={t('pagination.previous')}
            disabled={page === 0}
            onClick={() => onPageChange(Math.max(0, page - 1))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-color-blue text-color-blue transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <span className="text-base font-medium text-gray-700 dark:text-gray-200">
            {t('pagination.pageOf', { page: page + 1, pages: pageCount })}
          </span>
          <button
            type="button"
            title={t('pagination.next')}
            aria-label={t('pagination.next')}
            disabled={page >= pageCount - 1}
            onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-color-blue text-color-blue transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {showPageSize && (
        <label className="flex items-center justify-self-end gap-2 text-base font-medium text-gray-700 dark:text-gray-200 sm:col-start-3">
          <span>{t('pagination.resultsPerPage')}</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-base dark:border-slate-700 dark:bg-slate-950 dark:text-gray-100"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}

export function InlineEntityResults({
  entityTypeName
}: {
  entityTypeName: string
}) {
  const { t, i18n } = useTranslation('search')
  const showToast = useToastStore((state) => state.show)
  const navigate = useNavigate()
  const selectedProject = useProjectStore((state) => state.selectedProject)
  const entityAttributes = useProjectStore((state) => state.entityAttributes)
  const { results, hasSearched, setResults, removeResult } =
    useSearchResultsStore()
  const [pendingDelete, setPendingDelete] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(5)
  const [selectedIdentifier, setSelectedIdentifier] = useState('')
  const [selectedEditMode, setSelectedEditMode] = useState(false)

  const schemaAttributes = useMemo(
    () =>
      entityAttributes.find(
        (definition) =>
          definition.name?.toLowerCase() === entityTypeName.toLowerCase()
      )?.typeDefinition?.attributes ?? [],
    [entityAttributes, entityTypeName]
  )

  const summaryAttributes = useMemo(
    () => selectSummaryAttributes(schemaAttributes, i18n.language, 3),
    [i18n.language, schemaAttributes]
  )

  const selectedEntity = useMemo(
    () =>
      results.find(
        (result) => resolveTrustDeckId(result) === selectedIdentifier
      ),
    [results, selectedIdentifier]
  )

  const sortedResults = useMemo(
    () =>
      [...results].sort((left, right) =>
        resolveTrustDeckId(left).localeCompare(resolveTrustDeckId(right))
      ),
    [results]
  )

  useEffect(() => {
    setPage(0)
    setSelectedIdentifier('')
  }, [entityTypeName])

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(results.length / pageSize) - 1)
    if (page > maxPage) setPage(maxPage)
  }, [page, pageSize, results.length])

  if (!hasSearched) return null

  if (selectedEntity) {
    return (
      <InlineEntityDetail
        entity={selectedEntity}
        entityTypeName={entityTypeName}
        initialEditMode={selectedEditMode}
        onClose={() => setSelectedIdentifier('')}
        onUpdated={(updatedEntity) => {
          setSelectedEditMode(false)
          setResults(
            results.map((result) =>
              resolveTrustDeckId(result) === selectedIdentifier
                ? updatedEntity
                : result
            ),
            entityTypeName
          )
        }}
        onDeleted={(identifier) => {
          removeResult(identifier)
          setSelectedIdentifier('')
        }}
      />
    )
  }

  const openResult = (result: any, edit: boolean) => {
    const identifier = resolveTrustDeckId(result)
    if (!identifier) return
    setSelectedEditMode(edit)
    setSelectedIdentifier(identifier)
  }

  const generatePseudonymForEntity = (result: any) => {
    const identifier = resolveTrustDeckId(result)
    if (!identifier) return
    navigate('/pseudonym-management', {
      state: {
        entity: {
          identifier,
          identifierType: 'TrustDeckID',
          entityTypeName,
          displayName: identifier
        }
      }
    })
  }

  const deleteResult = async () => {
    const identifier = resolveTrustDeckId(pendingDelete)
    if (!identifier || !entityTypeName) return

    setDeleting(true)
    try {
      await TrustDeck.instance().deleteEntity(
        entityTypeName,
        identifier,
        selectedProject?.abbreviation
      )
      removeResult(identifier)
      setPendingDelete(null)
      showToast({
        severity: 'success',
        summary: t('deleteEntity'),
        detail: t('deleteSuccess'),
        life: 3000
      })
    } catch (error) {
      console.error('Failed to delete entity search result', error)
      showToast({
        severity: 'error',
        summary: t('deleteEntity'),
        detail: error instanceof Error ? error.message : t('deleteFailed'),
        life: 4500
      })
    } finally {
      setDeleting(false)
    }
  }

  const pageStart = page * pageSize
  const pageResults = sortedResults.slice(pageStart, pageStart + pageSize)
  const entityPageCount = Math.ceil(results.length / pageSize)
  const entityFillerRows =
    entityPageCount > 1 ? Math.max(0, pageSize - pageResults.length) : 0
  const entityColumnCount = (summaryAttributes.length || 1) + 3

  return (
    <>
      <Panel className="mt-6 !w-full !p-0 !shadow-none overflow-hidden">
        <div className="border-b border-gray-200 px-5 py-4 dark:border-slate-700">
          <h3 className="td-panel-title">{t('results')}</h3>
          <p className="td-section-subtitle mt-1">
            {t('entityResultsDescription', { count: results.length })}
          </p>
        </div>

        {results.length === 0 ? (
          <p className="px-5 py-8 text-center text-lg text-gray-600 dark:text-gray-300">
            {t('noResults')}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] table-fixed border-collapse text-left">
            <thead className="bg-gray-50 dark:bg-slate-800/70">
              <tr>
                <th className="w-20 px-4 py-3 text-center text-base font-semibold">
                  {t('resultNumber')}
                </th>
                <th className="w-[25%] px-5 py-3 text-base font-semibold">
                  {t('trustDeckId')}
                </th>
                {summaryAttributes.map((attribute) => (
                  <th
                    key={attribute.key}
                    className="px-4 py-3 text-base font-semibold"
                  >
                    {attribute.label}
                  </th>
                ))}
                {summaryAttributes.length === 0 && (
                  <th className="px-4 py-3 text-base font-semibold">
                    {t('entitySummary')}
                  </th>
                )}
                <th className="w-60 px-5 py-3 text-right text-base font-semibold">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {pageResults.map((result, resultIndex) => {
                const identifier = resolveTrustDeckId(result)
                const data = result?.data ?? {}
                return (
                  <tr
                    key={identifier}
                    className={`border-t border-gray-200 align-middle transition hover:bg-blue-50/70 dark:border-slate-700 dark:hover:bg-slate-700/60 ${
                      resultIndex % 2 === 0
                        ? 'bg-white dark:bg-slate-900'
                        : 'bg-gray-50/80 dark:bg-slate-800/45'
                    }`}
                  >
                    <td className="px-4 py-4 text-center text-base font-semibold text-gray-600 dark:text-gray-300">
                      {pageStart + resultIndex + 1}
                    </td>
                    <td className="break-all px-5 py-4 font-mono text-lg font-semibold">
                      {identifier || '—'}
                    </td>
                    {summaryAttributes.map((attribute) => (
                      <td
                        key={`${identifier}-${attribute.key}`}
                        className="break-words px-4 py-4 text-base"
                      >
                        {formatDisplayValue(
                          readDisplayValue(data, attribute.path)
                        )}
                      </td>
                    ))}
                    {summaryAttributes.length === 0 && (
                      <td className="px-4 py-4 text-base text-gray-500">—</td>
                    )}
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <IconActionButton
                          title={t('view')}
                          onClick={() => openResult(result, false)}
                        >
                          <EyeIcon className="h-5 w-5" />
                        </IconActionButton>
                        <IconActionButton
                          title={t('edit')}
                          onClick={() => openResult(result, true)}
                        >
                          <PencilSquareIcon className="h-5 w-5" />
                        </IconActionButton>
                        <IconActionButton
                          title={t('identity:crud.generatePseudonym')}
                          onClick={() => generatePseudonymForEntity(result)}
                          disabled={
                            Array.isArray(result?.links) &&
                            result.links.length > 0
                          }
                        >
                          <FingerPrintIcon className="h-5 w-5" />
                        </IconActionButton>
                        <IconActionButton
                          title={t('delete')}
                          variant="danger"
                          onClick={() => setPendingDelete(result)}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </IconActionButton>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {Array.from({ length: entityFillerRows }, (_, fillerIndex) => (
                <tr
                  key={`entity-filler-${fillerIndex}`}
                  aria-hidden="true"
                  className={`h-[73px] border-t border-gray-200 dark:border-slate-700 ${
                    (pageResults.length + fillerIndex) % 2 === 0
                      ? 'bg-white dark:bg-slate-900'
                      : 'bg-gray-50/80 dark:bg-slate-800/45'
                  }`}
                >
                  <td colSpan={entityColumnCount}>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Panel>

      {results.length > 0 && (
        <div className="w-full">
          <Pagination
            total={results.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            alwaysShowPageSize
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize)
              setPage(0)
            }}
          />
        </div>
      )}

      <Dialog
        visible={Boolean(pendingDelete)}
        onHide={() => setPendingDelete(null)}
        header={t('confirmDeleteTitle')}
        className="w-full max-w-lg"
        dismissableMask={!deleting}
      >
        <div className="space-y-4">
          <p>{t('confirmDeleteEntity')}</p>
          <div className="flex justify-end gap-2">
            <SecondaryOutlinedButton
              label={t('cancel')}
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
            />
            <PrimaryButton
              label={t('delete')}
              onClick={deleteResult}
              loading={deleting}
              className="bg-color-coral border-color-coral hover:bg-color-coral/80"
            />
          </div>
        </div>
      </Dialog>
    </>
  )
}

export function InlinePseudonymResults({
  fallbackDomain
}: {
  fallbackDomain: string
}) {
  const { t } = useTranslation('search')
  const navigate = useNavigate()
  const showToast = useToastStore((state) => state.show)
  const {
    results,
    hasSearched,
    setResults,
    setPseudonymValue,
    selectedResult,
    selectResult,
    clearSelectedResult,
    removeResult
  } = usePseudonymStore()
  const [pendingDelete, setPendingDelete] = useState<Pseudonym | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(5)
  const selectedPseudonym = useMemo(
    () =>
      results.find(
        (result) =>
          Boolean(selectedResult) &&
          (result.domainName || fallbackDomain) ===
            selectedResult?.domainName &&
          result.psn === selectedResult?.psn
      ),
    [fallbackDomain, results, selectedResult]
  )

  const sortedResults = useMemo(
    () =>
      [...results].sort((left, right) => {
        const pseudonymOrder = String(left.psn ?? '').localeCompare(
          String(right.psn ?? '')
        )
        if (pseudonymOrder !== 0) return pseudonymOrder
        return String(left.domainName || fallbackDomain).localeCompare(
          String(right.domainName || fallbackDomain)
        )
      }),
    [fallbackDomain, results]
  )

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(results.length / pageSize) - 1)
    if (page > maxPage) setPage(maxPage)
  }, [page, pageSize, results.length])

  if (!hasSearched) return null

  const openResult = (result: Pseudonym, edit: boolean) => {
    setPseudonymValue(result)
    selectResult(result.domainName || fallbackDomain, result.psn, edit)
  }

  const generateSecondaryPseudonym = (result: Pseudonym) => {
    navigate('/pseudonym-management', {
      state: {
        secondaryPseudonym: {
          domainName: result.domainName || fallbackDomain,
          psn: result.psn
        }
      }
    })
  }

  const deleteResult = async () => {
    if (!pendingDelete) return
    const domain = pendingDelete.domainName || fallbackDomain
    setDeleting(true)
    try {
      await TrustDeck.instance().deletePseudonym(domain, {
        psn: pendingDelete.psn
      })
      removeResult(domain, pendingDelete.psn)
      setPendingDelete(null)
      showToast({
        severity: 'success',
        summary: t('pseudonym.title'),
        detail: t('pseudonym.deleteSuccess'),
        life: 3000
      })
    } catch (error) {
      console.error('Failed to delete pseudonym search result', error)
      showToast({
        severity: 'error',
        summary: t('pseudonym.title'),
        detail:
          error instanceof Error ? error.message : t('pseudonym.deleteFailed'),
        life: 4500
      })
    } finally {
      setDeleting(false)
    }
  }

  const pageStart = page * pageSize
  const pageResults = sortedResults.slice(pageStart, pageStart + pageSize)
  const pseudonymPageCount = Math.ceil(results.length / pageSize)
  const pseudonymFillerRows =
    pseudonymPageCount > 1 ? Math.max(0, pageSize - pageResults.length) : 0

  return (
    <>
      <Panel className="mt-6 !w-full !p-0 !shadow-none overflow-hidden">
        {results.length === 0 ? (
          <p className="px-5 py-8 text-center text-lg text-gray-600 dark:text-gray-300">
            {t('noResults')}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left">
            <thead className="bg-gray-50 dark:bg-slate-800/70">
              <tr>
                <th className="w-20 whitespace-nowrap px-4 py-3 text-center text-base font-semibold">
                  {t('resultNumber')}
                </th>
                <th className="min-w-56 whitespace-nowrap px-5 py-3 text-base font-semibold">
                  {t('pseudonym.value')}
                </th>
                <th className="min-w-48 whitespace-nowrap px-5 py-3 text-base font-semibold">
                  {t('pseudonym.id')}
                </th>
                <th className="min-w-32 whitespace-nowrap px-5 py-3 text-base font-semibold">
                  {t('pseudonym.idType')}
                </th>
                <th className="min-w-48 whitespace-nowrap px-5 py-3 text-base font-semibold">
                  {t('pseudonym.group')}
                </th>
                <th className="w-60 whitespace-nowrap px-5 py-3 text-right text-base font-semibold">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {pageResults.map((result, resultIndex) => {
                const domain = result.domainName || fallbackDomain
                const expanded = selectedPseudonym === result
                return (
                  <Fragment key={`${domain}:${result.psn}`}>
                    <tr
                    className={`border-t border-gray-200 align-middle transition hover:bg-blue-50/70 dark:border-slate-700 dark:hover:bg-slate-700/60 ${
                      expanded
                        ? 'bg-blue-50/70 dark:bg-blue-950/20'
                        : resultIndex % 2 === 0
                        ? 'bg-white dark:bg-slate-900'
                        : 'bg-gray-50/80 dark:bg-slate-800/45'
                    }`}
                  >
                    <td className="px-4 py-4 text-center text-base font-semibold text-gray-600 dark:text-gray-300">
                      {pageStart + resultIndex + 1}
                    </td>
                    <td className="break-all px-5 py-4 font-mono text-lg font-normal">
                      {result.psn || '—'}
                    </td>
                    <td className="break-all px-5 py-4 text-base">
                      {result.identifierItem?.identifier || '—'}
                    </td>
                    <td className="px-5 py-4 text-base">
                      {result.identifierItem?.idType || '—'}
                    </td>
                    <td className="px-5 py-4 text-base">{domain || '—'}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <IconActionButton
                          title={t('view')}
                          onClick={() => openResult(result, false)}
                        >
                          <EyeIcon className="h-5 w-5" />
                        </IconActionButton>
                        <IconActionButton
                          title={t('edit')}
                          onClick={() => openResult(result, true)}
                        >
                          <PencilSquareIcon className="h-5 w-5" />
                        </IconActionButton>
                        <IconActionButton
                          title={t('pseudonyms:management.secondaryTitle')}
                          onClick={() => generateSecondaryPseudonym(result)}
                        >
                          <FingerPrintIcon className="h-5 w-5" />
                        </IconActionButton>
                        <IconActionButton
                          title={t('delete')}
                          variant="danger"
                          onClick={() => setPendingDelete(result)}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </IconActionButton>
                      </div>
                    </td>
                    </tr>
                    {expanded && (
                      <tr className="border-t border-blue-100 bg-blue-50/30 dark:border-blue-950 dark:bg-slate-900/80">
                        <td colSpan={6} className="p-0">
                          <div className="px-5 py-6">
                            <InlinePseudonymDetail
                              embedded
                              tableDetail
                              pseudonym={result}
                              fallbackDomain={fallbackDomain}
                              initialEditMode={Boolean(selectedResult?.editMode)}
                              onClose={clearSelectedResult}
                              onUpdated={(
                                previousDomain,
                                previousPseudonym,
                                updated
                              ) => {
                                const normalized = {
                                  ...updated,
                                  domainName: updated.domainName || previousDomain
                                }
                                setResults(
                                  results.map((entry) => {
                                    const entryDomain =
                                      entry.domainName || fallbackDomain
                                    return entryDomain === previousDomain &&
                                      entry.psn === previousPseudonym
                                      ? normalized
                                      : entry
                                  })
                                )
                                setPseudonymValue(normalized)
                                selectResult(
                                  normalized.domainName || previousDomain,
                                  normalized.psn,
                                  false
                                )
                              }}
                              onDeleted={(deletedDomain, pseudonym) => {
                                removeResult(deletedDomain, pseudonym)
                                clearSelectedResult()
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
              {Array.from({ length: pseudonymFillerRows }, (_, fillerIndex) => (
                <tr
                  key={`pseudonym-filler-${fillerIndex}`}
                  aria-hidden="true"
                  className={`h-[73px] border-t border-gray-200 dark:border-slate-700 ${
                    (pageResults.length + fillerIndex) % 2 === 0
                      ? 'bg-white dark:bg-slate-900'
                      : 'bg-gray-50/80 dark:bg-slate-800/45'
                  }`}
                >
                  <td colSpan={6}>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Panel>

      {results.length > 0 && (
        <div className="w-full">
          <Pagination
            total={results.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            alwaysShowPageSize
            offerAllPageSizes
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize)
              setPage(0)
            }}
          />
        </div>
      )}

      <Dialog
        visible={Boolean(pendingDelete)}
        onHide={() => setPendingDelete(null)}
        header={t('confirmDeleteTitle')}
        className="w-full max-w-lg"
        dismissableMask={!deleting}
      >
        <div className="space-y-4">
          <p>{t('pseudonym.confirmDeleteText')}</p>
          <div className="flex justify-end gap-2">
            <SecondaryOutlinedButton
              label={t('cancel')}
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
            />
            <PrimaryButton
              label={t('delete')}
              onClick={deleteResult}
              loading={deleting}
              className="bg-color-coral border-color-coral hover:bg-color-coral/80"
            />
          </div>
        </div>
      </Dialog>
    </>
  )
}
