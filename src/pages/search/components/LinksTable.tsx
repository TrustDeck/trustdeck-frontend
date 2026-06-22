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
    if (!entity) {
      setNodes([])
      return
    }
    const normalizedLinks = Array.isArray(entity.links) ? entity.links : entity.links ? [entity.links] : []
    setNodes(transformLinks(normalizedLinks, entity.id))
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

  // Template to add a link to each entry in the table. 
  const pseudonymTemplate = (node: TreeNode) => {
    return (
      <button
        onClick={() => navigate(`/search/${entity.id}/${node.data.pseudonym}`)}
        className="text-blue-500 hover:underline"
      >
        {node.data.pseudonym}
      </button>
    )
  }

  return (
    <TreeTable className="w-full" value={nodes}>
      <Column field="group" header={t('search:group.title')} expander />
      <Column field="pseudonym" header={t('search:pseudonym.title')} body={pseudonymTemplate}/>
    </TreeTable>
  )
}