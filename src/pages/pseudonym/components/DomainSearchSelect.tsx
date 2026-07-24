import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircleIcon,
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

import TrustDeck from '../../../core/services/TrustDeck'
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
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DomainSearchResult[]>([])
  const [selectedHierarchy, setSelectedHierarchy] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const requestId = useRef(0)
  const domainCache = useRef(new Map<string, Domain>())

  useEffect(() => {
    if (!value) {
      setSelectedHierarchy([])
      return
    }

    let active = true
    const loadSelectedDomain = async () => {
      try {
        let domain = domainCache.current.get(value)
        if (!domain) {
          domain = await TrustDeck.instance().getDomain(value)
          domainCache.current.set(value, domain)
        }
        const hierarchy = await resolveHierarchy(domain, domainCache.current)
        if (active) setSelectedHierarchy(hierarchy)
      } catch {
        if (active) setSelectedHierarchy([value])
      }
    }
    void loadSelectedDomain()
    return () => {
      active = false
    }
  }, [value])

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
        const domains =
          await TrustDeck.instance().searchReadableDomains(normalized)
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
  }, [query, t])

  const selectedPath = useMemo(
    () =>
      selectedHierarchy.length > 0 ? selectedHierarchy : value ? [value] : [],
    [selectedHierarchy, value]
  )

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

      {value && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-blue-950/35">
          <div className="flex min-w-0 items-start gap-2">
            <CheckCircleIcon className="mt-2 h-5 w-5 shrink-0 text-color-blue" />
            <DomainHierarchyTree hierarchy={selectedPath} compact />
          </div>
          <button
            type="button"
            title={t('domainContext.clearSelection')}
            aria-label={t('domainContext.clearSelection')}
            onClick={() => onChange('')}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-white hover:text-gray-900 dark:hover:bg-slate-800 dark:hover:text-gray-100"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}

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
        <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-200 dark:border-slate-700">
          {results.map(({ domain, hierarchy }) => {
            const selected = domain.name === value
            return (
              <button
                key={domain.name}
                type="button"
                onClick={() => {
                  onChange(domain.name)
                  setSelectedHierarchy(hierarchy)
                  setQuery('')
                  setResults([])
                }}
                className={`block w-full border-b border-gray-100 px-4 py-3 text-left last:border-b-0 hover:bg-blue-50 dark:border-slate-800 dark:hover:bg-slate-800 ${
                  selected
                    ? 'bg-blue-50 dark:bg-slate-800'
                    : 'bg-white dark:bg-slate-900'
                }`}
              >
                <DomainHierarchyTree hierarchy={hierarchy} />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
