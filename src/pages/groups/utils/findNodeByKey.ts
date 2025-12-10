//May cut this to utilitites
import { CustomTreeNode } from '../types/CustomTreeNode.ts'
export function findNodeByKey(
  nodes: any[] | undefined,
  key?: string | null
): CustomTreeNode | undefined {
  if (!nodes || !key) return undefined
  const stack = [...nodes]
  while (stack.length) {
    const node = stack.shift()
    if (!node) continue
    if (node.key === key) {
      return node
    }
    if (node.children && Array.isArray(node.children)) {
      stack.push(...node.children)
    }
  }
  return undefined
}