import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronUpDownIcon
} from '@heroicons/react/20/solid'
import type { SortState } from '../../utils/sorting'

type SortButtonProps<Key extends string> = {
  label: ReactNode
  /** The column's text for screen readers and tooltips, when the label is not plain text. */
  columnName: string
  sortKey: Key
  sort: SortState<Key> | null
  onSort: (key: Key) => void
  disabled?: boolean
  className?: string
}

/**
 * Column label that sorts the column when clicked; clicking it again reverses the direction.
 * An icon shows that the column can be sorted and, once it is, in which direction.
 */
export function SortButton<Key extends string>({
  label,
  columnName,
  sortKey,
  sort,
  onSort,
  disabled = false,
  className = ''
}: SortButtonProps<Key>) {
  const { t } = useTranslation('common')
  const direction = sort?.key === sortKey ? sort.direction : null
  const title =
    direction === 'asc'
      ? t('sorting.sortedAscending', { column: columnName })
      : direction === 'desc'
        ? t('sorting.sortedDescending', { column: columnName })
        : t('sorting.sortBy', { column: columnName })
  const Icon =
    direction === 'asc'
      ? ArrowUpIcon
      : direction === 'desc'
        ? ArrowDownIcon
        : ChevronUpDownIcon

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={() => onSort(sortKey)}
      className={`group -mx-1 inline-flex items-center gap-1 rounded px-1 font-semibold transition hover:text-color-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:text-blue-300 ${className}`}
    >
      <span>{label}</span>
      <Icon
        aria-hidden="true"
        className={`h-4 w-4 shrink-0 ${
          direction
            ? 'text-color-blue dark:text-blue-300'
            : 'text-gray-400 group-hover:text-color-blue dark:text-gray-500 dark:group-hover:text-blue-300'
        }`}
      />
    </button>
  )
}

type SortableHeaderProps<Key extends string> = Omit<
  SortButtonProps<Key>,
  'columnName' | 'label'
> & {
  label: string
  /** Classes of the header cell. */
  cellClassName?: string
}

/** Table header cell whose column can be sorted by clicking it. */
export default function SortableHeader<Key extends string>({
  label,
  sortKey,
  sort,
  onSort,
  disabled,
  cellClassName = ''
}: SortableHeaderProps<Key>) {
  const direction = sort?.key === sortKey ? sort.direction : null
  return (
    <th
      scope="col"
      aria-sort={
        direction === 'asc'
          ? 'ascending'
          : direction === 'desc'
            ? 'descending'
            : 'none'
      }
      className={cellClassName}
    >
      <SortButton
        label={label}
        columnName={label}
        sortKey={sortKey}
        sort={sort}
        onSort={onSort}
        disabled={disabled}
      />
    </th>
  )
}
