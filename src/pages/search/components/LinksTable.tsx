import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { TreeTable } from 'primereact/treetable'
import { Column } from 'primereact/column'
import { Entity } from '../types/Entity'
import { TreeNode } from '../types/TreeNode'
import { Link } from '../../../core/types/Link'

interface LinksTableProps {
  entity: Entity
}

function transformLinks(links: Link[], parentId: string): TreeNode[] {
  if (!links || links.length === 0) return []

  return links.map((link) => ({
    key: `${parentId}-${link.group}-${link.pseudonym}`,
    data: { group: link.group, pseudonym: link.pseudonym },
    children: link.children ? transformLinks(link.children, parentId) : []
  }))
}

export default function LinksTable({ entity }: LinksTableProps) {
  const [nodes, setNodes] = useState<TreeNode[]>([])
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (entity && entity.links) {
      const normalizedLinks = Array.isArray(entity.links)
        ? entity.links
        : [entity.links]
      setNodes(transformLinks(normalizedLinks, entity.id))
    } else {
      setNodes([])
    }
  }, [entity])

  const groupTemplate = (node: TreeNode) => (
    <span
      className="inline-flex min-h-[2.75rem] min-w-0 items-center truncate text-left text-base"
      title={node.data.group}
    >
      {node.data.group || '—'}
    </span>
  )

  const pseudonymTemplate = (node: TreeNode) => {
    if (!node.data.pseudonym) {
      return (
        <span className="inline-flex min-h-[2.75rem] items-center text-base">
          —
        </span>
      )
    }

    const target = node.data.group
      ? `/search/pseudonym/${encodeURIComponent(node.data.group)}/${encodeURIComponent(node.data.pseudonym)}`
      : `/search/pseudonym/${encodeURIComponent(node.data.pseudonym)}`

    return (
      <button
        type="button"
        onClick={() =>
          navigate(target, {
            state: {
              returnTo: `${location.pathname}${location.search}`
            }
          })
        }
        className="inline-flex min-h-[2.75rem] items-center break-all text-left font-mono text-base text-blue-500 hover:underline"
      >
        {node.data.pseudonym}
      </button>
    )
  }

  return (
    <TreeTable className="w-full linked-pseudonym-table" value={nodes}>
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
