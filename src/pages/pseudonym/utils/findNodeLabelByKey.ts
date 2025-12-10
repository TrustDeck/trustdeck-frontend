// Recursively search a tree for a node with a specific key
export const findNodeLabelByKey = (nodes: any[], key: string): string | null => {
  for (const node of nodes) {
    if (node.key === key) return node.label
    if (node.children) {
      const found = findNodeLabelByKey(node.children, key)
      if (found) return found
    }
  }
  return null
}

// Get all selected group names from the selectedGroup object returned by TreeSelect
export const getSelectedGroupNames = (
  selectedGroup: string | Record<string, { checked: boolean; partialChecked: boolean }>,
  groups: any[] | null | undefined
): string[] => {
  if (!selectedGroup || !groups?.length) return []

  if (typeof selectedGroup === 'string') {
    const label = findNodeLabelByKey(groups, selectedGroup)
    return label ? [label] : []
  }

  return Object.entries(selectedGroup)
    .filter(([_, value]) => value.checked)
    .map(([key]) => findNodeLabelByKey(groups, key))
    .filter((label): label is string => Boolean(label))
}