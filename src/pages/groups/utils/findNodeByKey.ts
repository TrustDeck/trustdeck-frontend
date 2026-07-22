//May cut this to utilitites
import { CustomTreeNode } from '../types/CustomTreeNode'
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

export function findNodeByLabel(
  nodes: any[] | undefined,
  label?: string | null
): CustomTreeNode | undefined {
  if (!nodes || label == null || label === '') return undefined
  const stack = [...nodes]
  while (stack.length) {
    const node = stack.shift()
    if (!node) continue
    if (node.label === label) return node as CustomTreeNode
    if (node.children && Array.isArray(node.children)) {
      stack.push(...node.children)
    }
  }
  return undefined
}
