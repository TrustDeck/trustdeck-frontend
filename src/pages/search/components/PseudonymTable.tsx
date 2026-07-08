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
      setExpandedKeys(getAllKeys(treeNodes))
    } else {
      setNodes([])
      setExpandedKeys({})
    }
  }, [pseudonym])

  const transformPseudonymToTree = (current: Pseudonym): TreeNode[] => [
    {
      key: `${current.domainName}-${current.psn}`,
      data: { group: current.domainName, pseudonym: current.psn },
      children: current.children
        ? current.children.flatMap((child) => transformPseudonymToTree(child))
        : []
    }
  ]

  const getAllKeys = (
    treeNodes: TreeNode[],
    keys: { [key: string]: boolean } = {}
  ): { [key: string]: boolean } => {
    treeNodes.forEach((node) => {
      keys[node.key] = true
      if (node.children && node.children.length > 0) {
        getAllKeys(node.children, keys)
      }
    })
    return keys
  }

  const groupTemplate = (node: TreeNode) => (
    <span className="inline-flex min-h-[2.75rem] min-w-0 items-center truncate text-left" title={node.data.group}>
      {node.data.group || '-'}
    </span>
  )

  const pseudonymTemplate = (node: TreeNode) => (
    <span className="inline-flex min-h-[2.75rem] items-center break-all font-mono text-sm">
      {node.data.pseudonym || '-'}
    </span>
  )

  return (
    <TreeTable
      className="w-full linked-pseudonym-table"
      value={nodes}
      expandedKeys={expandedKeys}
      onToggle={(e) => setExpandedKeys(e.value)}
    >
      <Column field="group" header={t('search:group.title')} expander body={groupTemplate} />
      <Column field="pseudonym" header={t('search:pseudonym.title')} body={pseudonymTemplate} />
    </TreeTable>
  )
}
