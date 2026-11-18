export type SortDirection = 'asc' | 'desc'

/** The column a table is sorted by, and in which direction. */
export type SortState<Key extends string = string> = {
  key: Key
  direction: SortDirection
}

/**
 * Determines the sort state after clicking a column header: a new column starts ascending,
 * and clicking the sorted column again reverses its direction.
 */
export function nextSort<Key extends string>(
  current: SortState<Key> | null,
  key: Key
): SortState<Key> {
  if (current?.key === key) {
    return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
  }
  return { key, direction: 'asc' }
}

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base'
})

/**
 * Compares two cell values for sorting. Numbers within texts are compared by value
 * ("ID-2" before "ID-10"), letter case is ignored, and empty values come last in both
 * directions.
 */
export function compareCellValues(
  left: unknown,
  right: unknown,
  direction: SortDirection
): number {
  const leftText = left === null || left === undefined ? '' : String(left)
  const rightText = right === null || right === undefined ? '' : String(right)
  if (!leftText || !rightText) {
    if (leftText === rightText) return 0
    return leftText ? -1 : 1
  }
  const order = collator.compare(leftText, rightText)
  return direction === 'asc' ? order : -order
}
