import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

import TrustDeck from '../../../core/services/TrustDeck'
import type { Domain } from '../../../core/types/Domain'

type DomainSearchResult = {
  domain: Domain
  hierarchy: string[]
}

type DomainPermissionSearchProps = {
  availableDomainNames: string[]
  selectedDomainName?: string
  onSelect: (domainName: string) => void
  pageSize?: number
}

function DomainHierarchyTree({ hierarchy }: { hierarchy: string[] }) {
  return (
    <div className="space-y-0.5 text-sm" aria-label={hierarchy.join(' / ')}>
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

export default function DomainPermissionSearch({
  availableDomainNames,
  selectedDomainName,
  onSelect,
  pageSize = 8
}: DomainPermissionSearchProps) {
  const { t } = useTranslation('permission')
  const [query, setQuery] = useState('*')
  const [results, setResults] = useState<DomainSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const requestId = useRef(0)
  const domainCache = useRef(new Map<string, Domain>())

  const availableSet = useMemo(
    () => new Set(availableDomainNames),
    [availableDomainNames]
  )

  useEffect(() => {
    const normalized = query.trim()
    if (normalized.length < 2 && normalized !== '*') {
      setResults([])
      setLoading(false)
      setError('')
      setPage(0)
      return
    }

    const currentRequest = ++requestId.current
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const domains = await TrustDeck.instance().searchReadableDomains(normalized)
        const allowedDomains = domains
          .filter((domain) => availableSet.has(domain.name))
          .sort((left, right) => left.name.localeCompare(right.name))

        allowedDomains.forEach((domain) =>
          domainCache.current.set(domain.name, domain)
        )

        const enriched = await Promise.all(
          allowedDomains.map(async (domain) => ({
            domain,
            hierarchy: await resolveHierarchy(domain, domainCache.current)
          }))
        )

        if (currentRequest === requestId.current) {
          setResults(enriched)
          setPage(0)
        }
      } catch (searchError) {
        console.error('Failed to search permission domains', searchError)
        if (currentRequest === requestId.current) {
          setResults([])
          setError(t('domainSearch.searchFailed'))
          setPage(0)
        }
      } finally {
        if (currentRequest === requestId.current) setLoading(false)
      }
    }, 300)

    return () => window.clearTimeout(timer)
  }, [availableSet, query, t])

  const pageCount = Math.max(1, Math.ceil(results.length / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const visibleResults = results.slice(
    safePage * pageSize,
    safePage * pageSize + pageSize
  )

  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1))
  }, [page, pageCount])

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="td-field-label mb-1 block">
          {t('domainSearch.label')}
        </span>
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('domainSearch.placeholder')}
            className="h-11 w-full rounded-lg border border-color-light-gray bg-white pl-10 pr-3 text-base text-gray-900 outline-none transition focus:border-color-blue focus:ring-1 focus:ring-color-blue dark:bg-slate-900 dark:text-gray-100"
          />
        </div>
      </label>

      {loading && (
        <p className="text-sm text-gray-500 dark:text-gray-300">
          {t('domainSearch.loading')}
        </p>
      )}
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      {!loading &&
        query.trim().length > 0 &&
        results.length === 0 &&
        !error && (
          <p className="rounded-xl border border-dashed border-gray-300 px-4 py-5 text-center text-sm text-gray-600 dark:border-slate-700 dark:text-gray-300">
            {query.trim().length < 2 && query.trim() !== '*'
              ? t('domainSearch.enterMoreCharacters')
              : t('domainSearch.noResults')}
          </p>
        )}

      {results.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
          <div className="grid gap-px bg-gray-200 dark:bg-slate-700 md:grid-cols-2 xl:grid-cols-3">
            {visibleResults.map(({ domain, hierarchy }) => {
              const selected = domain.name === selectedDomainName
              return (
                <button
                  key={domain.name}
                  type="button"
                  onClick={() => onSelect(domain.name)}
                  aria-pressed={selected}
                  className={`min-h-28 bg-white px-4 py-3 text-left transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-color-blue dark:bg-slate-900 dark:hover:bg-slate-800 ${
                    selected ? '!bg-blue-50 dark:!bg-blue-950/40' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <DomainHierarchyTree hierarchy={hierarchy} />
                    {selected && (
                      <CheckCircleIcon className="h-5 w-5 shrink-0 text-color-blue" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-950 dark:text-gray-300">
            <span>
              {t('domainSearch.resultCount', { count: results.length })}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                disabled={safePage === 0}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800"
                aria-label={t('domainSearch.previousPage')}
                title={t('domainSearch.previousPage')}
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <span className="min-w-24 text-center font-medium">
                {t('domainSearch.page', {
                  page: safePage + 1,
                  pageCount
                })}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(pageCount - 1, current + 1))
                }
                disabled={safePage >= pageCount - 1}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800"
                aria-label={t('domainSearch.nextPage')}
                title={t('domainSearch.nextPage')}
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
