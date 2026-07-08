import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { TreeTable } from 'primereact/treetable'
import { Column } from 'primereact/column'
import { Entity } from '../types/Entity'
import { TreeNode } from '../types/TreeNode'
import { Link } from '../../../core/types/Link'



interface LinksTableProps {
  entity: Entity
}

export default function LinksTable({ entity }: LinksTableProps) {
  const [nodes, setNodes] = useState<TreeNode[]>([])
  const { t } = useTranslation()
  const navigate = useNavigate()

  // Transform links when the selected entity changes
  useEffect(() => {
  if (entity && entity.links) {
    const normalizedLinks = Array.isArray(entity.links) ? entity.links : [entity.links]
    const transformedLinks = transformLinks(normalizedLinks, entity.id)
    setNodes(transformedLinks)
  }
}, [entity])

// Recursive function to transform links into a tree structure
const transformLinks = (links: Link[], parentId: string): TreeNode[] => {
  if (!links || links.length === 0) return []

  return links.map((link) => ({
    key: `${parentId}-${link.pseudonym}`,
    data: { group: link.group, pseudonym: link.pseudonym },
    children: link.children ? transformLinks(link.children, parentId) : [],
  }))
}

  const groupTemplate = (node: TreeNode) => (
    <span className="block min-w-0 truncate text-left align-middle" title={node.data.group}>
      {node.data.group || '-'}
    </span>
  )

  // Template to add a link to each entry in the table.
  const pseudonymTemplate = (node: TreeNode) => {
    if (!node.data.pseudonym) return <span>-</span>

    const target = node.data.group
      ? `/search/pseudonym/${encodeURIComponent(node.data.group)}/${encodeURIComponent(node.data.pseudonym)}`
      : `/search/pseudonym/${encodeURIComponent(node.data.pseudonym)}`

    return (
      <button
        type="button"
        onClick={() => navigate(target)}
        className="break-all text-left text-blue-500 hover:underline"
      >
        {node.data.pseudonym}
      </button>
    )
  }

  return (
    <TreeTable className="w-full linked-pseudonym-table" value={nodes}>
      <Column field="group" header={t('search:group.title')} expander body={groupTemplate} />
      <Column field="pseudonym" header={t('search:pseudonym.title')} body={pseudonymTemplate}/>
    </TreeTable>
  )
}