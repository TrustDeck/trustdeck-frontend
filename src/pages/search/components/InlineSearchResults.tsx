import { useState } from 'react'
import { Dialog } from 'primereact/dialog'
import {
  EyeIcon,
  PencilSquareIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import Panel from '../../../core/components/common/Panel'
import PrimaryButton from '../../../core/components/form/buttons/PrimaryButton'
import SecondaryOutlinedButton from '../../../core/components/form/buttons/SecondaryOutlinedButton'
import TrustDeck from '../../../core/services/TrustDeck'
import useLayoutStore from '../../../core/stores/LayoutStore'
import useProjectStore from '../../../core/stores/ProjectStore'
import useToastStore from '../../../core/stores/ToastStore'
import { formatDateTime } from '../../../core/utils/date'
import type { Pseudonym } from '../../../core/types/Pseudonym'
import useSearchResultsStore from '../stores/SearchResultsStore'
import usePseudonymStore from '../stores/PseudonymSearchResults'

type ActionButtonProps = {
  title: string
  onClick: () => void
  children: React.ReactNode
  danger?: boolean
}

function ActionButton({
  title,
  onClick,
  children,
  danger = false
}: ActionButtonProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border-2 bg-white transition dark:bg-slate-950 ${
        danger
          ? 'border-color-coral text-color-coral hover:bg-red-50 dark:hover:bg-red-950/40'
          : 'border-color-blue text-color-blue hover:bg-blue-50 dark:hover:bg-slate-800'
      }`}
    >
      {children}
    </button>
  )
}

function resolveTrustDeckId(result: any): string {
  return String(
    result?.trustdeckID ??
      result?.trustdeckId ??
      result?.trustDeckId ??
      result?.data?.trustdeckID ??
      result?.data?.trustdeckId ??
      result?.data?.trustDeckId ??
      result?.id ??
      ''
  )
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return formatDateTime(value) || value
  }
  return String(value)
}

function entitySummary(result: any): Array<{ label: string; value: string }> {
  const data = result?.data && typeof result.data === 'object' ? result.data : {}
  const ignored = new Set([
    'trustdeckID',
    'trustdeckId',
    'trustDeckId',
    'id',
    'entityTypeName'
  ])

  return Object.entries(data)
    .filter(
      ([key, value]) =>
        !ignored.has(key) &&
        value !== null &&
        value !== undefined &&
        value !== '' &&
        (typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean')
    )
    .slice(0, 3)
    .map(([label, value]) => ({ label, value: displayValue(value) }))
}

export function InlineEntityResults({
  entityTypeName
}: {
  entityTypeName: string
}) {
  const { t } = useTranslation('search')
  const navigate = useNavigate()
  const showToast = useToastStore((state) => state.show)
  const selectedProject = useProjectStore((state) => state.selectedProject)
  const setEditMode = useLayoutStore((state) => state.setEditMode)
  const { results, hasSearched, removeResult } = useSearchResultsStore()
  const [pendingDelete, setPendingDelete] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)

  if (!hasSearched) return null

  const openResult = (result: any, edit: boolean) => {
    const identifier = resolveTrustDeckId(result)
    if (!identifier) return
    setEditMode(edit)
    navigate(`/search/${encodeURIComponent(identifier)}`, {
      state: { returnTo: '/search' }
    })
  }

  const deleteResult = async () => {
    const identifier = resolveTrustDeckId(pendingDelete)
    if (!identifier || !entityTypeName) return

    setDeleting(true)
    try {
      await TrustDeck.instance().deleteEntity(
        entityTypeName,
        identifier,
        selectedProject?.abbreviation
      )
      removeResult(identifier)
      setPendingDelete(null)
      showToast({
        severity: 'success',
        summary: t('deleteEntity'),
        detail: t('deleteSuccess'),
        life: 3000
      })
    } catch (error) {
      console.error('Failed to delete entity search result', error)
      showToast({
        severity: 'error',
        summary: t('deleteEntity'),
        detail: error instanceof Error ? error.message : t('deleteFailed'),
        life: 4500
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Panel className="mt-6 !w-full !p-0 overflow-hidden">
      <div className="border-b border-gray-200 px-5 py-4 dark:border-slate-700">
        <h3 className="td-panel-title">{t('results')}</h3>
        <p className="td-section-subtitle mt-1">
          {t('entityResultsDescription', { count: results.length })}
        </p>
      </div>

      {results.length === 0 ? (
        <p className="px-5 py-8 text-center text-lg text-gray-600 dark:text-gray-300">
          {t('noResults')}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-left">
            <thead className="bg-gray-50 dark:bg-slate-800/70">
              <tr>
                <th className="w-[28%] px-5 py-3 text-base font-semibold">
                  {t('trustDeckId')}
                </th>
                <th className="px-5 py-3 text-base font-semibold">
                  {t('entitySummary')}
                </th>
                <th className="w-40 px-5 py-3 text-right text-base font-semibold">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => {
                const identifier = resolveTrustDeckId(result)
                const summary = entitySummary(result)
                return (
                  <tr
                    key={identifier}
                    className="border-t border-gray-200 align-middle hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-5 py-4 text-lg font-semibold break-all">
                      {identifier || '—'}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-x-6 gap-y-2">
                        {summary.length ? (
                          summary.map((entry) => (
                            <span key={entry.label} className="text-base">
                              <span className="font-semibold text-gray-600 dark:text-gray-300">
                                {entry.label}:
                              </span>{' '}
                              <span>{entry.value}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <ActionButton
                          title={t('view')}
                          onClick={() => openResult(result, false)}
                        >
                          <EyeIcon className="h-5 w-5" />
                        </ActionButton>
                        <ActionButton
                          title={t('edit')}
                          onClick={() => openResult(result, true)}
                        >
                          <PencilSquareIcon className="h-5 w-5" />
                        </ActionButton>
                        <ActionButton
                          title={t('delete')}
                          danger
                          onClick={() => setPendingDelete(result)}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        visible={Boolean(pendingDelete)}
        onHide={() => setPendingDelete(null)}
        header={t('confirmDeleteTitle')}
        className="w-full max-w-lg"
        dismissableMask={!deleting}
      >
        <div className="space-y-4">
          <p>{t('confirmDeleteEntity')}</p>
          <div className="flex justify-end gap-2">
            <SecondaryOutlinedButton
              label={t('cancel')}
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
            />
            <PrimaryButton
              label={t('delete')}
              onClick={deleteResult}
              loading={deleting}
              className="bg-color-coral border-color-coral hover:bg-color-coral/80"
            />
          </div>
        </div>
      </Dialog>
    </Panel>
  )
}

export function InlinePseudonymResults({
  fallbackDomain
}: {
  fallbackDomain: string
}) {
  const { t } = useTranslation('search')
  const navigate = useNavigate()
  const showToast = useToastStore((state) => state.show)
  const {
    results,
    hasSearched,
    setPseudonymValue,
    removeResult
  } = usePseudonymStore()
  const [pendingDelete, setPendingDelete] = useState<Pseudonym | null>(null)
  const [deleting, setDeleting] = useState(false)

  if (!hasSearched) return null

  const openResult = (result: Pseudonym, edit: boolean) => {
    const domain = result.domainName || fallbackDomain
    setPseudonymValue(result)
    navigate(
      `/search/pseudonym/${encodeURIComponent(domain)}/${encodeURIComponent(result.psn)}`,
      { state: { returnTo: '/search', edit } }
    )
  }

  const deleteResult = async () => {
    if (!pendingDelete) return
    const domain = pendingDelete.domainName || fallbackDomain
    setDeleting(true)
    try {
      await TrustDeck.instance().deletePseudonym(domain, {
        psn: pendingDelete.psn
      })
      removeResult(domain, pendingDelete.psn)
      setPendingDelete(null)
      showToast({
        severity: 'success',
        summary: t('pseudonym.title'),
        detail: t('pseudonym.deleteSuccess'),
        life: 3000
      })
    } catch (error) {
      console.error('Failed to delete pseudonym search result', error)
      showToast({
        severity: 'error',
        summary: t('pseudonym.title'),
        detail:
          error instanceof Error ? error.message : t('pseudonym.deleteFailed'),
        life: 4500
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Panel className="mt-6 !w-full !p-0 overflow-hidden">
      <div className="border-b border-gray-200 px-5 py-4 dark:border-slate-700">
        <h3 className="td-panel-title">{t('results')}</h3>
        <p className="td-section-subtitle mt-1">
          {t('pseudonymResultsDescription', { count: results.length })}
        </p>
      </div>

      {results.length === 0 ? (
        <p className="px-5 py-8 text-center text-lg text-gray-600 dark:text-gray-300">
          {t('noResults')}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-gray-50 dark:bg-slate-800/70">
              <tr>
                <th className="px-5 py-3 text-base font-semibold">
                  {t('pseudonym.value')}
                </th>
                <th className="px-5 py-3 text-base font-semibold">
                  {t('pseudonym.id')}
                </th>
                <th className="px-5 py-3 text-base font-semibold">
                  {t('pseudonym.idType')}
                </th>
                <th className="px-5 py-3 text-base font-semibold">
                  {t('pseudonym.group')}
                </th>
                <th className="w-40 px-5 py-3 text-right text-base font-semibold">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => {
                const domain = result.domainName || fallbackDomain
                return (
                  <tr
                    key={`${domain}:${result.psn}`}
                    className="border-t border-gray-200 align-middle hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-5 py-4 text-lg font-semibold break-all">
                      {result.psn || '—'}
                    </td>
                    <td className="px-5 py-4 text-base break-all">
                      {result.identifierItem?.identifier || '—'}
                    </td>
                    <td className="px-5 py-4 text-base">
                      {result.identifierItem?.idType || '—'}
                    </td>
                    <td className="px-5 py-4 text-base">{domain || '—'}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <ActionButton
                          title={t('view')}
                          onClick={() => openResult(result, false)}
                        >
                          <EyeIcon className="h-5 w-5" />
                        </ActionButton>
                        <ActionButton
                          title={t('edit')}
                          onClick={() => openResult(result, true)}
                        >
                          <PencilSquareIcon className="h-5 w-5" />
                        </ActionButton>
                        <ActionButton
                          title={t('delete')}
                          danger
                          onClick={() => setPendingDelete(result)}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        visible={Boolean(pendingDelete)}
        onHide={() => setPendingDelete(null)}
        header={t('confirmDeleteTitle')}
        className="w-full max-w-lg"
        dismissableMask={!deleting}
      >
        <div className="space-y-4">
          <p>{t('pseudonym.confirmDeleteText')}</p>
          <div className="flex justify-end gap-2">
            <SecondaryOutlinedButton
              label={t('cancel')}
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
            />
            <PrimaryButton
              label={t('delete')}
              onClick={deleteResult}
              loading={deleting}
              className="bg-color-coral border-color-coral hover:bg-color-coral/80"
            />
          </div>
        </div>
      </Dialog>
    </Panel>
  )
}
