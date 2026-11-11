import { useCallback, useEffect, useRef, useState } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

import Pagination from '../../../core/components/common/Pagination'
import TrustDeck from '../../../core/services/TrustDeck'
import type { Domain } from '../../../core/types/Domain'

type DomainSearchResult = {
  domain: Domain
  hierarchy: string[]
}

type DomainSearchSelectProps = {
  value: string
  onChange: (domainName: string) => void
  projectAbbreviation: string
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
  cache: Map<string, Domain>,
  projectAbbreviation: string
): Promise<string[]> {
  const hierarchy = [domain.name]
  const visited = new Set<string>([domain.name])
  let parentName = domain.superDomainName

  while (parentName && !visited.has(parentName) && hierarchy.length < 20) {
    visited.add(parentName)
    let parent = cache.get(parentName)
    if (!parent) {
      try {
        parent = await TrustDeck.instance().getDomain(parentName)
        if (
          parent.projectAbbreviation?.toLowerCase() !==
          projectAbbreviation.toLowerCase()
        ) {
          break
        }
        cache.set(parentName, parent)
      } catch {
        break
      }
    }
    if (
      parent.projectAbbreviation?.toLowerCase() !==
      projectAbbreviation.toLowerCase()
    ) {
      break
    }
    hierarchy.unshift(parentName)
    parentName = parent.superDomainName
  }

  return hierarchy
}

export default function DomainSearchSelect({
  value,
  onChange,
  projectAbbreviation
}: DomainSearchSelectProps) {
  const { t } = useTranslation('pseudonyms')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DomainSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(5)
  const requestId = useRef(0)
  const domainCache = useRef(new Map<string, Domain>())
  const previousProject = useRef(projectAbbreviation)

  const getProjectDomains = useCallback(
    async (searchQuery: string) => {
      if (!projectAbbreviation) return []
      const query = searchQuery.trim().toLowerCase()
      let domains: Domain[]
      try {
        domains =
          await TrustDeck.instance().getProjectDomains(projectAbbreviation)
      } catch {
        domains = await TrustDeck.instance().searchReadableDomains('*')
        domains = domains.filter(
          (domain) =>
            domain.projectAbbreviation?.toLowerCase() ===
            projectAbbreviation.toLowerCase()
        )
      }

      domains = domains.filter(
        (domain) =>
          domain.projectAbbreviation?.toLowerCase() ===
          projectAbbreviation.toLowerCase()
      )

      return domains
        .filter(
          (domain) =>
            !query || query === '*' || domain.name.toLowerCase().includes(query)
        )
        .sort((left, right) => left.name.localeCompare(right.name))
    },
    [projectAbbreviation]
  )

  useEffect(() => {
    const projectChanged = previousProject.current !== projectAbbreviation
    previousProject.current = projectAbbreviation
    requestId.current += 1
    setResults([])
    setPage(0)
    setLoading(false)
    setError('')
    domainCache.current.clear()
    if (projectChanged) onChange('')
  }, [onChange, projectAbbreviation])

  useEffect(() => {
    setPage(0)
  }, [query])

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(results.length / pageSize) - 1)
    if (page > maxPage) setPage(maxPage)
  }, [page, pageSize, results.length])

  useEffect(() => {
    const normalized = query.trim()
    const currentRequest = ++requestId.current
    const requestCache = new Map<string, Domain>()
    const timer = window.setTimeout(async () => {
      if (!projectAbbreviation) {
        setResults([])
        setLoading(false)
        return
      }
      setLoading(true)
      setError('')
      try {
        const domains = await getProjectDomains(normalized)
        domains.forEach((domain) => requestCache.set(domain.name, domain))
        const enriched = await Promise.all(
          domains.map(async (domain) => ({
            domain,
            hierarchy: await resolveHierarchy(
              domain,
              requestCache,
              projectAbbreviation
            )
          }))
        )
        if (currentRequest === requestId.current) {
          domainCache.current = requestCache
          setResults(enriched)
        }
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
  }, [getProjectDomains, projectAbbreviation, query, t])

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

      {!loading && results.length === 0 && !error && (
        <p className="rounded-xl border border-dashed border-gray-300 px-4 py-5 text-center text-sm text-gray-600 dark:border-slate-700 dark:text-gray-300">
          {t('domainContext.noResults')}
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
                      ? 'td-row-selected'
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
          <Pagination
            className="!py-1"
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(0)
            }}
            alwaysShowPageSize
          />
        </div>
      )}
    </div>
  )
}
