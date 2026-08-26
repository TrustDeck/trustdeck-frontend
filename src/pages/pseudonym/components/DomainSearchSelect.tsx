import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

import TrustDeck from '../../../core/services/TrustDeck'
import useProjectStore from '../../../core/stores/ProjectStore'
import type { Domain } from '../../../core/types/Domain'

type DomainSearchResult = {
  domain: Domain
  hierarchy: string[]
}

type DomainSearchSelectProps = {
  value: string
  onChange: (domainName: string) => void
}

function DomainHierarchyTree({
  hierarchy,
  compact = false
}: {
  hierarchy: string[]
  compact?: boolean
}) {
  return (
    <div
      className={`mt-2 space-y-0.5 ${compact ? 'text-xs' : 'text-sm'}`}
      aria-label={hierarchy.join(' / ')}
    >
      {hierarchy.map((segment, index) => {
        const isLeaf = index === hierarchy.length - 1
        return (
          <div
            key={`${segment}-${index}`}
            className="flex min-w-0 items-center text-gray-600 dark:text-gray-300"
            style={{ paddingLeft: `${index * 1.1}rem` }}
          >
            {index > 0 && (
              <span
                aria-hidden="true"
                className="mr-1.5 shrink-0 font-mono text-gray-400 dark:text-slate-500"
              >
                └─
              </span>
            )}
            <span
              className={`truncate ${
                isLeaf ? 'font-semibold text-gray-900 dark:text-gray-100' : ''
              }`}
            >
              {segment}
            </span>
          </div>
        )
      })}
    </div>
  )
}

async function resolveHierarchy(
  domain: Domain,
  cache: Map<string, Domain>
): Promise<string[]> {
  const hierarchy = [domain.name]
  const visited = new Set<string>([domain.name])
  let parentName = domain.superDomainName

  while (parentName && !visited.has(parentName) && hierarchy.length < 20) {
    visited.add(parentName)
    hierarchy.unshift(parentName)

    let parent = cache.get(parentName)
    if (!parent) {
      try {
        parent = await TrustDeck.instance().getDomain(parentName)
        cache.set(parentName, parent)
      } catch {
        break
      }
    }
    parentName = parent.superDomainName
  }

  return hierarchy
}

export default function DomainSearchSelect({
  value,
  onChange
}: DomainSearchSelectProps) {
  const { t } = useTranslation('pseudonyms')
  const selectedProject = useProjectStore((state) => state.selectedProject)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DomainSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(5)
  const requestId = useRef(0)
  const domainCache = useRef(new Map<string, Domain>())
  const defaultDomainRequested = useRef(false)

  const getProjectDomains = useCallback(
    async (searchQuery: string) => {
      const query = searchQuery.trim().toLowerCase()
      let domains: Domain[]
      try {
        domains = selectedProject?.abbreviation
          ? await TrustDeck.instance().getProjectDomains(
              selectedProject.abbreviation
            )
          : await TrustDeck.instance().searchReadableDomains('*')
      } catch {
        domains = await TrustDeck.instance().searchReadableDomains('*')
        if (selectedProject?.abbreviation) {
          domains = domains.filter(
            (domain) =>
              domain.projectAbbreviation?.toLowerCase() ===
              selectedProject.abbreviation.toLowerCase()
          )
        }
      }

      return domains.filter(
        (domain) =>
          !query ||
          query === '*' ||
          domain.name.toLowerCase().includes(query)
      )
    },
    [selectedProject?.abbreviation]
  )

  useEffect(() => {
    defaultDomainRequested.current = false
    setResults([])
  }, [selectedProject?.abbreviation])

  useEffect(() => {
    if (value || defaultDomainRequested.current) return
    defaultDomainRequested.current = true

    getProjectDomains('*')
      .then(async (domains) => {
        const defaultDomains = [...domains].sort((left, right) =>
          left.name.localeCompare(right.name)
        )
        if (defaultDomains.length === 0) return
        defaultDomains.slice(0, 5).forEach((domain) =>
          domainCache.current.set(domain.name, domain)
        )
        const initialResults = await Promise.all(
          defaultDomains.map(async (domain) => ({
            domain,
            hierarchy: await resolveHierarchy(domain, domainCache.current)
          }))
        )
        setResults(initialResults)
      })
      .catch((searchError) => {
        console.error('Failed to load the default pseudonym domain', searchError)
      })
  }, [getProjectDomains, value])

  useEffect(() => {
    setPage(0)
  }, [query])

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(results.length / pageSize) - 1)
    if (page > maxPage) setPage(maxPage)
  }, [page, pageSize, results.length])

  useEffect(() => {
    const normalized = query.trim()
    if (normalized.length < 2 && normalized !== '*') {
      setResults([])
      setLoading(false)
      setError('')
      return
    }

    const currentRequest = ++requestId.current
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const domains = await getProjectDomains(normalized)
        const limited = domains.slice(0, 30)
        limited.forEach((domain) =>
          domainCache.current.set(domain.name, domain)
        )
        const enriched = await Promise.all(
          limited.map(async (domain) => ({
            domain,
            hierarchy: await resolveHierarchy(domain, domainCache.current)
          }))
        )
        if (currentRequest === requestId.current) setResults(enriched)
      } catch (searchError) {
        console.error('Failed to search pseudonym domains', searchError)
        if (currentRequest === requestId.current) {
          setResults([])
          setError(t('domainContext.searchFailed'))
        }
      } finally {
        if (currentRequest === requestId.current) setLoading(false)
      }
    }, 300)

    return () => window.clearTimeout(timer)
  }, [getProjectDomains, query, t])

  const pageCount = Math.max(1, Math.ceil(results.length / pageSize))
  const pageResults = results.slice(page * pageSize, (page + 1) * pageSize)

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="td-field-label mb-1 block">
          {t('domainContext.searchLabel')}
        </span>
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('domainContext.searchPlaceholder')}
            className="h-11 w-full rounded-lg border border-color-light-gray bg-white pl-10 pr-3 text-base text-gray-900 outline-none transition focus:border-color-blue focus:ring-1 focus:ring-color-blue dark:bg-slate-900 dark:text-gray-100"
          />
        </div>
      </label>

      {loading && (
        <p className="text-sm text-gray-500 dark:text-gray-300">
          {t('domainContext.loading')}
        </p>
      )}
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      {!loading &&
        query.trim().length > 0 &&
        results.length === 0 &&
        !error && (
          <p className="rounded-xl border border-dashed border-gray-300 px-4 py-5 text-center text-sm text-gray-600 dark:border-slate-700 dark:text-gray-300">
            {query.trim().length < 2 && query.trim() !== '*'
              ? t('domainContext.enterMoreCharacters')
              : t('domainContext.noResults')}
          </p>
        )}

      {results.length > 0 && (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
          <div className="bg-gray-50 px-4 py-3 text-base font-semibold text-gray-900 dark:bg-slate-800/70 dark:text-gray-100">
            {t('domainContext.resultsTitle')}
          </div>
          {pageResults.map(({ domain, hierarchy }, resultIndex) => {
            const selected = domain.name === value
            return (
              <button
                key={domain.name}
                type="button"
                onClick={() => {
                  onChange(domain.name)
                }}
                className={`block w-full border-t border-gray-200 px-4 py-4 text-left transition hover:bg-blue-50/70 dark:border-slate-700 dark:hover:bg-slate-700/60 ${
                  selected
                    ? 'bg-blue-50 dark:bg-slate-800'
                    : resultIndex % 2 === 0
                      ? 'bg-white dark:bg-slate-900'
                      : 'bg-gray-50/80 dark:bg-slate-800/45'
                }`}
              >
                <DomainHierarchyTree hierarchy={hierarchy} />
              </button>
            )
          })}
          </div>
          <div className="grid grid-cols-1 items-center gap-4 px-5 py-1 sm:grid-cols-[1fr_auto_1fr]">
            {pageCount > 1 && (
              <div className="flex items-center justify-self-center gap-3 sm:col-start-2">
                <button
                  type="button"
                  title={t('search:pagination.previous')}
                  aria-label={t('search:pagination.previous')}
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  disabled={page === 0}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-color-blue text-color-blue transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <span className="text-base font-medium text-gray-700 dark:text-gray-200">
                  {t('search:pagination.pageOf', { page: page + 1, pages: pageCount })}
                </span>
                <button
                  type="button"
                  title={t('search:pagination.next')}
                  aria-label={t('search:pagination.next')}
                  onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
                  disabled={page >= pageCount - 1}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-color-blue text-color-blue transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </div>
            )}
            <label className="flex items-center justify-self-end gap-2 text-base font-medium text-gray-700 dark:text-gray-200 sm:col-start-3">
              <span>{t('search:pagination.resultsPerPage')}</span>
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-base dark:border-slate-700 dark:bg-slate-950 dark:text-gray-100"
              >
                {[5, 10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
