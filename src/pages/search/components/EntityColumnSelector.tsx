import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ViewColumnsIcon } from '@heroicons/react/24/outline'
import type { EntityColumn } from '../utils/entityColumns'

type EntityColumnSelectorProps = {
  /** All attributes that can be shown. */
  columns: EntityColumn[]
  /** The attributes currently shown. */
  visibleColumns: EntityColumn[]
  /** Called with the chosen paths, in the order of the entity type definition; null restores the default. */
  onChange: (paths: string[] | null) => void
}

/** Lets the user choose which attributes the result list shows as columns. */
export default function EntityColumnSelector({
  columns,
  visibleColumns,
  onChange
}: EntityColumnSelectorProps) {
  const { t } = useTranslation('search')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const visiblePaths = new Set(visibleColumns.map((column) => column.path))

  useEffect(() => {
    if (!open) return undefined
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const toggle = (path: string) => {
    const next = new Set(visiblePaths)
    if (next.has(path)) next.delete(path)
    else next.add(path)
    onChange(
      columns.filter((column) => next.has(column.path)).map((column) => column.path)
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        disabled={columns.length === 0}
        className="inline-flex items-center gap-2 rounded-lg border border-color-blue px-3 py-1.5 text-sm font-semibold text-color-blue transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
      >
        <ViewColumnsIcon className="h-5 w-5" aria-hidden="true" />
        {t('columns.button', { count: visibleColumns.length })}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={t('columns.title')}
          className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-3 text-left shadow-lg dark:border-slate-600 dark:bg-slate-900"
        >
          <p className="td-field-label mb-2">{t('columns.title')}</p>
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {columns.map((column) => (
              <li key={column.path}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={visiblePaths.has(column.path)}
                    onChange={() => toggle(column.path)}
                    className="h-4 w-4 accent-[#004d9b]"
                  />
                  <span className="min-w-0 flex-1 truncate" title={column.path}>
                    {column.label || column.path}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="mt-2 text-sm font-semibold text-color-blue hover:underline"
          >
            {t('columns.reset')}
          </button>
        </div>
      )}
    </div>
  )
}
