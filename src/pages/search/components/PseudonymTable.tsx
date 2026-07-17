import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { TreeTable } from 'primereact/treetable'
import { Column } from 'primereact/column'
import { Pseudonym } from '../../../core/types/Pseudonym'
import { TreeNode } from '../types/TreeNode'

interface PseudonymTableProps {
  pseudonym: Pseudonym
}

function transformPseudonymToTree(current: Pseudonym): TreeNode[] {
  return [
    {
      key: `${current.domainName}-${current.psn}`,
      data: { group: current.domainName, pseudonym: current.psn },
      children: current.children
        ? current.children.flatMap((child) => transformPseudonymToTree(child))
        : []
    }
  ]
}

function getAllKeys(
  treeNodes: TreeNode[],
  keys: { [key: string]: boolean } = {}
): { [key: string]: boolean } {
  treeNodes.forEach((node) => {
    keys[node.key] = true
    if (node.children && node.children.length > 0) {
      getAllKeys(node.children, keys)
    }
  })
  return keys
}

export default function PseudonymTable({ pseudonym }: PseudonymTableProps) {
  const [nodes, setNodes] = useState<TreeNode[]>([])
  const [expandedKeys, setExpandedKeys] = useState<{ [key: string]: boolean }>({})
  const { t } = useTranslation()

  useEffect(() => {
    if (pseudonym?.children?.length) {
      const treeNodes = pseudonym.children.flatMap((child) =>
        transformPseudonymToTree(child)
      )
      setNodes(treeNodes)
      setExpandedKeys(getAllKeys(treeNodes))
    } else {
      setNodes([])
      setExpandedKeys({})
    }
  }, [pseudonym])

  const groupTemplate = (node: TreeNode) => (
    <span
      className="inline-flex min-h-[2.75rem] min-w-0 items-center truncate text-left text-xl text-gray-900 dark:text-gray-100"
      title={node.data.group}
    >
      {node.data.group || '—'}
    </span>
  )

  const pseudonymTemplate = (node: TreeNode) => (
    <span className="inline-flex min-h-[2.75rem] items-center break-all font-mono text-xl text-gray-900 dark:text-gray-100">
      {node.data.pseudonym || '—'}
    </span>
  )

  if (nodes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-center text-base text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-300">
        {t('search:pseudonym.noLinkedPseudonyms')}
      </div>
    )
  }

  return (
    <TreeTable
      className="w-full linked-pseudonym-table"
      value={nodes}
      expandedKeys={expandedKeys}
      onToggle={(event) => setExpandedKeys(event.value)}
    >
      <Column
        field="group"
        header={t('search:group.title')}
        expander
        body={groupTemplate}
      />
      <Column
        field="pseudonym"
        header={t('search:pseudonym.title')}
        body={pseudonymTemplate}
      />
    </TreeTable>
  )
}
