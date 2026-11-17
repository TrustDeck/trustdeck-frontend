import { useCallback, useState } from 'react'
import { resolveAttributeLabel } from './entityDisplay'

/** An attribute of an entity type that can be shown and sorted as a result column. */
export type EntityColumn = {
  /** Dot-separated path in the entity data: named groups followed by the attribute name. */
  path: string
  label: string
  /** The attribute type, e.g. string, number, date. */
  type: string
  required: boolean
  /** Whether the backend keeps an index for sorting this column at any result size. */
  sortIndex: boolean
}

/** Sort key of the TrustDeck ID column. */
export const TRUSTDECK_ID_SORT_KEY = 'trustDeckId'

/** Sort key that orders the results by how well they match the search. */
export const RELEVANCE_SORT_KEY = 'relevance'

/** The number of columns shown before the user chooses columns. */
const DEFAULT_COLUMN_COUNT = 3

/** Sort key of an attribute column, in the form the backend expects. */
export const columnSortKey = (path: string) => `attribute:${path}`

/**
 * Collects the attributes of an entity type definition that hold single values. Named groups
 * become path segments; rows and columns only arrange attributes and add no segment.
 */
export function collectEntityColumns(
  attributes: unknown[] = [],
  language: string,
  parentPath: string[] = []
): EntityColumn[] {
  const columns = attributes.flatMap((attribute) => {
    const attr = (attribute ?? {}) as Record<string, any>
    const nested = Array.isArray(attr.attributes) ? attr.attributes : null

    if (nested) {
      const path =
        attr.layout === 'group' && attr.name ? [...parentPath, attr.name] : parentPath
      return collectEntityColumns(nested, language, path)
    }

    if (!attr.name) return []
    return [
      {
        path: [...parentPath, String(attr.name)].join('.'),
        label: resolveAttributeLabel(attr, language),
        type: String(attr.type ?? 'string'),
        required: Boolean(attr.required),
        sortIndex: Boolean(attr.sortIndex)
      }
    ]
  })

  // The same path can appear in several layouts; keep its first occurrence
  const seen = new Set<string>()
  return columns.filter((column) => {
    if (seen.has(column.path)) return false
    seen.add(column.path)
    return true
  })
}

/** The columns shown before the user chooses columns: required attributes first. */
export function defaultColumnPaths(columns: EntityColumn[]): string[] {
  return [
    ...columns.filter((column) => column.required),
    ...columns.filter((column) => !column.required)
  ]
    .slice(0, DEFAULT_COLUMN_COUNT)
    .map((column) => column.path)
}

const storageKey = (projectAbbreviation: string, entityTypeName: string) =>
  `trustdeck:entity-columns:${projectAbbreviation}:${entityTypeName}`

function readStoredPaths(key: string): string[] | null {
  try {
    const stored = window.localStorage.getItem(key)
    const parsed: unknown = stored ? JSON.parse(stored) : null
    return Array.isArray(parsed) ? parsed.map(String) : null
  } catch {
    // Storage can be unavailable or hold invalid data
    return null
  }
}

/**
 * The columns the user chose for an entity type's result lists, remembered per browser. Columns
 * of attributes that no longer exist are dropped; without a choice, the default columns apply.
 */
export function useVisibleEntityColumns(
  projectAbbreviation: string,
  entityTypeName: string,
  columns: EntityColumn[]
): [EntityColumn[], (paths: string[] | null) => void] {
  const key = storageKey(projectAbbreviation, entityTypeName)
  const [stored, setStored] = useState<{ key: string; paths: string[] | null }>(
    () => ({ key, paths: readStoredPaths(key) })
  )

  // Another entity type or project has its own choice
  let chosenPaths = stored.paths
  if (stored.key !== key) {
    chosenPaths = readStoredPaths(key)
    setStored({ key, paths: chosenPaths })
  }

  const setVisiblePaths = useCallback(
    (paths: string[] | null) => {
      try {
        if (paths) window.localStorage.setItem(key, JSON.stringify(paths))
        else window.localStorage.removeItem(key)
      } catch {
        // The choice then only lasts while the page is open
      }
      setStored({ key, paths })
    },
    [key]
  )

  const paths = chosenPaths ?? defaultColumnPaths(columns)
  const byPath = new Map(columns.map((column) => [column.path, column]))
  const visible = paths.flatMap((path) => {
    const column = byPath.get(path)
    return column ? [column] : []
  })

  return [visible, setVisiblePaths]
}
