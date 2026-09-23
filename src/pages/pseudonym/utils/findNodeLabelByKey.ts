// Recursively search a tree for a node with a specific key
export const findNodeLabelByKey = (
  nodes: any[],
  key: string
): string | null => {
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
  selectedGroup:
    | string
    | Record<string, { checked: boolean; partialChecked: boolean }>,
  groups: any[] | null | undefined,
  projectAbbreviation?: string
): string[] => {
  if (!selectedGroup || !groups?.length) return []

  const belongsToProject = (node: any): boolean =>
    Boolean(
      projectAbbreviation &&
        node.data?.raw?.projectAbbreviation &&
        node.data.raw.projectAbbreviation.toLowerCase() ===
          projectAbbreviation.toLowerCase()
    )

  const findLabel = (nodes: any[], key: string): string | null => {
    for (const node of nodes) {
      if (node.key === key) {
        return !projectAbbreviation || belongsToProject(node)
          ? node.label
          : null
      }
      if (node.children) {
        const found = findLabel(node.children, key)
        if (found) return found
      }
    }
    return null
  }

  if (typeof selectedGroup === 'string') {
    const label = findLabel(groups, selectedGroup)
    return label ? [label] : []
  }

  return Object.entries(selectedGroup)
    .filter((entry) => entry[1].checked)
    .map(([key]) => findLabel(groups, key))
    .filter((label): label is string => Boolean(label))
}
