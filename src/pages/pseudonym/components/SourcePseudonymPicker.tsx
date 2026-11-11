import { FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

import Pagination from '../../../core/components/common/Pagination'
import PrimaryButton from '../../../core/components/form/buttons/PrimaryButton'
import TrustDeck, { type PseudonymPage } from '../../../core/services/TrustDeck'
import type { Pseudonym } from '../../../core/types/Pseudonym'

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const

type SourcePseudonymPickerProps = {
  /** The domain to search in; the search is disabled without one. */
  domainName: string
  /** The pseudonym currently chosen as source. */
  selectedPsn?: string
  onSelect: (pseudonym: Pseudonym) => void
  /** Prefills the search field, e.g. with a pseudonym chosen on the search page. */
  initialQuery?: string
}

/**
 * Searches the pseudonyms of a domain page by page and lets the user pick one, e.g. as the
 * source of a secondary pseudonym. Each page is searched in the backend, so that this also
 * works for domains with millions of pseudonyms.
 */
export default function SourcePseudonymPicker({
  domainName,
  selectedPsn,
  onSelect,
  initialQuery = ''
}: SourcePseudonymPickerProps) {
  const { t } = useTranslation(['pseudonyms', 'search'])
  const [query, setQuery] = useState(initialQuery)
  const [searchedQuery, setSearchedQuery] = useState('')
  const [result, setResult] = useState<PseudonymPage | null>(null)
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchedDomain, setSearchedDomain] = useState(domainName)

  // A different domain invalidates the shown results
  if (searchedDomain !== domainName) {
    setSearchedDomain(domainName)
    setResult(null)
    setError('')
  }

  const search = async (searchQuery: string, page: number, size: number) => {
    setLoading(true)
    setError('')
    try {
      const pageResult = await TrustDeck.instance().searchPseudonymsPage(
        domainName,
        searchQuery,
        page,
        size
      )
      setResult(pageResult)
      setSearchedQuery(searchQuery)
    } catch (searchError) {
      console.error('Error searching source pseudonyms:', searchError)
      setResult(null)
      setError(t('pseudonyms:management.sourceSearchFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (!domainName) {
      setError(t('pseudonyms:management.sourceGroupRequired'))
      return
    }
    const trimmed = query.trim()
    if (!trimmed) {
      setError(t('pseudonyms:management.sourceQueryRequired'))
      return
    }
    void search(trimmed, 0, pageSize)
  }

  const pageCount = result ? Math.ceil(result.total / result.size) : 0

  return (
    <div className="space-y-3">
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
      >
        <label className="block min-w-0">
          <span className="td-field-label mb-1 block">
            {t('pseudonyms:management.sourceQuery')}
          </span>
          <input
            id="source-pseudonym-query"
            type="search"
            value={query}
            placeholder={t('search:pseudonym.searchInputPlaceholder')}
            disabled={!domainName}
            onChange={(event) => {
              setQuery(event.target.value)
              if (error) setError('')
            }}
            className="h-[44px] w-full rounded-lg border border-color-light-gray bg-white px-3 text-lg text-gray-900 outline-none focus:border-color-blue focus:ring-1 focus:ring-color-blue disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-900 dark:text-gray-100"
          />
        </label>
        <PrimaryButton
          type="submit"
          label={t('pseudonyms:management.sourceSearch')}
          loading={loading}
          disabled={loading || !domainName}
          icon={<MagnifyingGlassIcon className="mr-1 h-5 w-5" />}
        />
      </form>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}

      {result && (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
          {result.items.length === 0 ? (
            <p className="px-4 py-6 text-center text-gray-600 dark:text-gray-300">
              {t('search:pseudonym.notFound')}
            </p>
          ) : (
            <ul>
              <li className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_2rem] gap-3 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 sm:grid dark:bg-slate-800/70 dark:text-gray-200">
                <span>{t('search:pseudonym.value')}</span>
                <span>{t('search:pseudonym.id')}</span>
                <span>{t('search:pseudonym.idType')}</span>
                <span />
              </li>
              {result.items.map((pseudonym) => {
                const selected = pseudonym.psn === selectedPsn
                return (
                  <li key={pseudonym.psn}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onSelect(pseudonym)}
                      className={`grid w-full grid-cols-1 gap-1 border-t border-gray-200 px-4 py-3 text-left transition hover:bg-blue-50/70 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_2rem] sm:items-center sm:gap-3 dark:border-slate-700 dark:hover:bg-slate-700/60 ${
                        selected ? 'td-row-selected' : ''
                      }`}
                    >
                      <span className="break-all font-semibold text-gray-900 dark:text-gray-100">
                        {pseudonym.psn}
                      </span>
                      <span className="break-all text-gray-700 dark:text-gray-200">
                        {pseudonym.identifierItem?.identifier}
                      </span>
                      <span className="break-all text-gray-600 dark:text-gray-300">
                        {pseudonym.identifierItem?.idType}
                      </span>
                      <span className="flex justify-end">
                        {selected && (
                          <CheckCircleIcon
                            className="h-6 w-6"
                            aria-label={t('pseudonyms:management.sourceSelected')}
                          />
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <Pagination
            className="!py-2"
            page={result.page}
            pageCount={Math.max(1, pageCount)}
            morePagesExist={result.totalIsLowerBound}
            onPageChange={(page) => void search(searchedQuery, page, result.size)}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={(size) => {
              setPageSize(size)
              void search(searchedQuery, 0, size)
            }}
            disabled={loading}
          />
        </div>
      )}
    </div>
  )
}
