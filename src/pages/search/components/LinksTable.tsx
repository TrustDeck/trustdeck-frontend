import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import { Entity } from '../types/Entity'
import { Link } from '../../../core/types/Link'

interface LinksTableProps {
  entity: Entity
}

type FlatLink = {
  key: string
  domain: string
  pseudonym: string
  depth: number
}

function flattenLinks(
  links: Link[] | undefined,
  parentId: string,
  depth = 0
): FlatLink[] {
  if (!links?.length) return []

  return links.flatMap((link, index) => {
    const domain = String(link.group ?? '')
    const pseudonym = String(link.pseudonym ?? '')
    const key = `${parentId}-${depth}-${index}-${domain}-${pseudonym}`
    return [
      { key, domain, pseudonym, depth },
      ...flattenLinks(link.children, key, depth + 1)
    ]
  })
}

export default function LinksTable({ entity }: LinksTableProps) {
  const { t } = useTranslation('search')
  const navigate = useNavigate()
  const location = useLocation()
  const [links, setLinks] = useState<FlatLink[]>([])

  useEffect(() => {
    const normalized = Array.isArray(entity?.links)
      ? entity.links
      : entity?.links
        ? [entity.links]
        : []
    setLinks(flattenLinks(normalized, entity.id))
  }, [entity])

  const hasNestedLinks = useMemo(
    () => links.some((link) => link.depth > 0),
    [links]
  )

  if (!links.length) {
    return (
      <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-base text-gray-500 dark:border-slate-700 dark:bg-slate-950 dark:text-gray-300">
        {t('pseudonym.noLinkedPseudonyms')}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
      <table className="w-full min-w-[430px] table-fixed border-collapse text-left">
        <thead className="bg-gray-50 dark:bg-slate-800/70">
          <tr>
            <th className="w-[44%] px-4 py-3 text-base font-semibold text-gray-700 dark:text-gray-200">
              {t('pseudonym.domain')}
            </th>
            <th className="px-4 py-3 text-base font-semibold text-gray-700 dark:text-gray-200">
              {t('pseudonym.title')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
          {links.map((link) => {
            const target = link.domain
              ? `/search/pseudonym/${encodeURIComponent(link.domain)}/${encodeURIComponent(link.pseudonym)}`
              : `/search/pseudonym/${encodeURIComponent(link.pseudonym)}`

            return (
              <tr key={link.key} className="align-middle">
                <td className="px-4 py-3 text-base text-gray-800 dark:text-gray-100">
                  <div
                    className="flex min-h-11 items-center gap-1.5"
                    style={{ paddingLeft: `${link.depth * 1.1}rem` }}
                    title={link.domain || undefined}
                  >
                    {(hasNestedLinks || link.depth > 0) && (
                      <ChevronRightIcon className="h-4 w-4 shrink-0 text-gray-400" />
                    )}
                    <span className="min-w-0 truncate">
                      {link.domain || '—'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 align-middle">
                  {link.pseudonym ? (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(target, {
                          state: {
                            returnTo: `${location.pathname}${location.search}`
                          }
                        })
                      }
                      className="flex min-h-11 w-full items-center break-all text-left font-mono text-base font-semibold text-blue-600 hover:underline dark:text-blue-300"
                    >
                      {link.pseudonym}
                    </button>
                  ) : (
                    <span className="flex min-h-11 items-center text-base">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
