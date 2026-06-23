import { Link } from '../../../core/types/Link'

export function collectGroupsWithPseudonyms(links: Link[]): Set<string> {
  const groups = new Set<string>()

  const walk = (items: Link[]) => {
    for (const link of items) {
      if (link.group && link.pseudonym) {
        groups.add(link.group)
      }
      if (link.children?.length) {
        walk(link.children)
      }
    }
  }

  walk(links)
  return groups
}

export function markDisabledGroupsInTree(
  nodes: any[],
  disabledGroups: Set<string>
): any[] {
  return nodes.map((node) => {
    const disabled = disabledGroups.has(node.label)
    const children = node.children
      ? markDisabledGroupsInTree(node.children, disabledGroups)
      : undefined

    return {
      ...node,
      selectable: disabled ? false : node.selectable !== false,
      ...(children ? { children } : {})
    }
  })
}
