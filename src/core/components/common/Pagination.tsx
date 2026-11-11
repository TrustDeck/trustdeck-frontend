import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

const DEFAULT_PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100] as const

type PaginationProps = {
  /** Zero-based index of the current page. */
  page: number
  /** Number of known pages. */
  pageCount: number
  onPageChange: (page: number) => void
  /** True when more pages exist than counted, e.g. when the backend caps its count. */
  morePagesExist?: boolean
  pageSize?: number
  pageSizeOptions?: readonly number[]
  onPageSizeChange?: (pageSize: number) => void
  /** Shows the page-size selection even when everything fits on one page. */
  alwaysShowPageSize?: boolean
  disabled?: boolean
  className?: string
}

const arrowClassName =
  'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-color-blue text-color-blue transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800'

/**
 * Pager shared by all paged lists: previous/next arrows, a page number field for jumping
 * directly to a page, and an optional page-size selection.
 */
export default function Pagination({
  page,
  pageCount,
  onPageChange,
  morePagesExist = false,
  pageSize,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  onPageSizeChange,
  alwaysShowPageSize = false,
  disabled = false,
  className = ''
}: PaginationProps) {
  const { t } = useTranslation('common')
  const lastPage = Math.max(0, pageCount - 1)
  const showPager = pageCount > 1 || morePagesExist
  const showPageSize =
    Boolean(onPageSizeChange && pageSize) && (alwaysShowPageSize || showPager)
  const [pageInput, setPageInput] = useState(String(page + 1))
  const [shownPage, setShownPage] = useState(page)

  // Resets the page number field whenever the page changes from outside
  if (shownPage !== page) {
    setShownPage(page)
    setPageInput(String(page + 1))
  }

  if (!showPager && !showPageSize) return null

  const goTo = (target: number) => {
    const clamped = Math.min(lastPage, Math.max(0, target))
    if (clamped !== page) onPageChange(clamped)
    else setPageInput(String(page + 1))
  }

  const commitPageInput = () => {
    const requested = Number.parseInt(pageInput, 10)
    if (!Number.isFinite(requested)) {
      setPageInput(String(page + 1))
      return
    }
    goTo(requested - 1)
  }

  return (
    <div
      className={`grid grid-cols-1 items-center gap-4 px-5 py-4 sm:grid-cols-[1fr_auto_1fr] ${className}`}
    >
      {showPager && (
        <div className="flex items-center justify-self-center gap-3 text-base font-medium text-gray-700 sm:col-start-2 dark:text-gray-200">
          <button
            type="button"
            title={t('pagination.previous')}
            aria-label={t('pagination.previous')}
            disabled={disabled || page === 0}
            onClick={() => goTo(page - 1)}
            className={arrowClassName}
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <label className="flex items-center gap-2">
            <span>{t('pagination.page')}</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={lastPage + 1}
              value={pageInput}
              disabled={disabled}
              aria-label={t('pagination.pageNumber')}
              onChange={(event) => setPageInput(event.target.value)}
              onBlur={commitPageInput}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  commitPageInput()
                }
              }}
              className="w-20 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-center dark:border-slate-600 dark:bg-slate-950 dark:text-gray-100"
            />
            <span>
              {morePagesExist
                ? t('pagination.ofAtLeast', { pages: pageCount })
                : t('pagination.of', { pages: pageCount })}
            </span>
          </label>
          <button
            type="button"
            title={t('pagination.next')}
            aria-label={t('pagination.next')}
            disabled={disabled || page >= lastPage}
            onClick={() => goTo(page + 1)}
            className={arrowClassName}
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {showPageSize && pageSize && onPageSizeChange && (
        <label className="flex items-center justify-self-end gap-2 text-base font-medium text-gray-700 sm:col-start-3 dark:text-gray-200">
          <span>{t('pagination.resultsPerPage')}</span>
          <select
            value={pageSize}
            disabled={disabled}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-base dark:border-slate-600 dark:bg-slate-950 dark:text-gray-100"
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
