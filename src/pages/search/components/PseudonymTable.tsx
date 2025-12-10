import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { TreeTable } from 'primereact/treetable'
import { Column } from 'primereact/column'
import { Pseudonym } from '../../../core/types/Pseudonym'
import { TreeNode } from '../types/TreeNode'

interface PseudonymTableProps {
  pseudonym: Pseudonym
}

export default function PseudonymTable({ pseudonym }: PseudonymTableProps) {
  const [nodes, setNodes] = useState<TreeNode[]>([])
  const [expandedKeys, setExpandedKeys] = useState<{ [key: string]: boolean }>({})
  const { t } = useTranslation()

  useEffect(() => {
    if (pseudonym) {
      const treeNodes = transformPseudonymToTree(pseudonym)
      setNodes(treeNodes)

      // Automatically expand all nodes
      const allExpandedKeys = getAllKeys(treeNodes)
      setExpandedKeys(allExpandedKeys)
    }
  }, [pseudonym])

  // Function to transform the pseudonym object into a tree
  const transformPseudonymToTree = (pseudonym: Pseudonym): TreeNode[] => {
    const currentNode: TreeNode = {
      key: pseudonym.id,
      data: { group: pseudonym.group, pseudonym: pseudonym.pseudonym },
      children: pseudonym.children
        ? pseudonym.children.map((child) => transformPseudonymToTree(child)).flat()
        : [],
    }

    // If the pseudonym has a parent, make the parent the root and nest the pseudonym under it
    if (pseudonym.parent) {
      return [
        {
          key: `parent-${pseudonym.parent}`,
          data: { group: pseudonym.parent, pseudonym: "" },
          children: [currentNode], // Nest current pseudonym under parent
        },
      ]
    }

    return [currentNode]
  }

  // Function to get all keys recursively for expanding nodes
  const getAllKeys = (nodes: TreeNode[], keys: { [key: string]: boolean } = {}): { [key: string]: boolean } => {
    nodes.forEach((node) => {
      keys[node.key] = true // Expand current node
      if (node.children && node.children.length > 0) {
        getAllKeys(node.children, keys) // Recursively expand children
      }
    })
    return keys
  }

  return (
    <TreeTable className="w-full" value={nodes} expandedKeys={expandedKeys} onToggle={(e) => setExpandedKeys(e.value)}>
      <Column field="group" header={t('search:group.title')} expander />
      <Column field="pseudonym" header={t('search:pseudonym.title')} />
    </TreeTable>
  )
}
