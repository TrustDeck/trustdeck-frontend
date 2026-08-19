import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  EyeIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import Panel from '../../core/components/common/Panel'
import useProjectStore from '../../core/stores/ProjectStore'
import TrustDeck from '../../core/services/TrustDeck'
import PrimaryButton from '../../core/components/form/buttons/PrimaryButton'
import SecondaryButton from '../../core/components/form/buttons/SecondaryButton'
import SecondaryOutlinedButton from '../../core/components/form/buttons/SecondaryOutlinedButton'
import useToastStore from '../../core/stores/ToastStore'
import Builder, { type EntityTypePayload } from './Builder'
import PageHeader from '../../core/components/common/PageHeader'

type DetailMode = 'view' | 'edit' | 'create' | null

function IconActionButton({
  title,
  onClick,
  danger = false,
  children
}: {
  title: string
  onClick: () => void
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition ${
        danger
          ? 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30'
          : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-color-blue dark:border-slate-700 dark:text-gray-200 dark:hover:border-blue-700 dark:hover:bg-blue-950/30 dark:hover:text-blue-200'
      }`}
    >
      {children}
    </button>
  )
}

export default function EntityManager() {
  const { t } = useTranslation(['entityBuilder', 'common'])
  const showToast = useToastStore((state) => state.show)
  const setEntities = useProjectStore((state) => state.setEntities)
  const selectedProject = useProjectStore((state) => state.selectedProject)
  const [entityDefinitions, setEntityDefinitions] = useState<
    EntityTypePayload[]
  >([])
  const [selectedTypeName, setSelectedTypeName] = useState('')
  const [detailMode, setDetailMode] = useState<DetailMode>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<EntityTypePayload | null>(
    null
  )

  const selectedType = useMemo(
    () =>
      entityDefinitions.find(
        (definition) => definition.name === selectedTypeName
      ) ?? null,
    [entityDefinitions, selectedTypeName]
  )

  const loadEntities = useCallback(
    async (preferredName?: string) => {
      if (!selectedProject?.abbreviation) {
        setLoading(false)
        setEntityDefinitions([])
        setEntities([])
        setSelectedTypeName('')
        setDetailMode(null)
        return
      }

      setLoading(true)
      try {
        const response = await TrustDeck.instance().getProjectEntities('*')
        const definitions = (
          Array.isArray(response) ? response : []
        ) as EntityTypePayload[]
        setEntityDefinitions(definitions)
        setEntities(
          Array.from(
            new Set(
              definitions
                .map((entry) => entry?.name)
                .filter(
                  (name: unknown): name is string =>
                    typeof name === 'string' && name.length > 0
                )
            )
          )
        )

        if (
          preferredName &&
          definitions.some((entry) => entry.name === preferredName)
        ) {
          setSelectedTypeName(preferredName)
        } else if (
          selectedTypeName &&
          !definitions.some((entry) => entry.name === selectedTypeName)
        ) {
          setSelectedTypeName('')
          setDetailMode(null)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (!message.includes('404')) {
          console.error('Failed to load project entities', error)
          showToast({
            severity: 'error',
            summary: t('common:error'),
            detail: t('loadFailed'),
            life: 4000
          })
        }
        setEntityDefinitions([])
        setEntities([])
        setSelectedTypeName('')
        setDetailMode(null)
      } finally {
        setLoading(false)
      }
    },
    [
      selectedProject?.abbreviation,
      selectedTypeName,
      setEntities,
      showToast,
      t
    ]
  )

  useEffect(() => {
    void loadEntities()
    // Loading is intentionally tied to the selected project only. Keeping the
    // selected row out of this dependency prevents a row click from refetching.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject?.abbreviation])

  const openEntity = (definition: EntityTypePayload, mode: 'view' | 'edit') => {
    setSelectedTypeName(definition.name)
    setDetailMode(mode)
  }

  const handleSaved = (savedEntity: EntityTypePayload) => {
    setSelectedTypeName(savedEntity.name)
    setDetailMode('view')
    void loadEntities(savedEntity.name)
  }

  const deleteEntity = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await TrustDeck.instance().deleteEntityConfig(deleteTarget.name)
      showToast({
        severity: 'success',
        summary: t('toast.deletedSummary'),
        detail: t('toast.projectDeletedDetail'),
        life: 3500
      })
      if (selectedTypeName === deleteTarget.name) {
        setSelectedTypeName('')
        setDetailMode(null)
      }
      setDeleteTarget(null)
      await loadEntities()
    } catch (error) {
      console.error('Could not delete project entity', error)
      showToast({
        severity: 'error',
        summary: t('toast.deleteFailed'),
        detail: error instanceof Error ? error.message : String(error),
        life: 6000
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="td-page-shell">
      <PageHeader
        title={t('entityManagementTitle')}
        description={t('entityManagementSubtitle')}
      />

      <div className="td-page-content flex w-full flex-col gap-6">
        <Panel noMaxWidth className="mx-auto !w-full">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="td-panel-title !mb-0">
              {t('projectTypesTitle')}
            </h2>
            <PrimaryButton
              label={
                <span className="inline-flex items-center gap-2">
                  <PlusIcon className="h-5 w-5" />
                  {t('addType')}
                </span>
              }
              onClick={() => {
                setSelectedTypeName('')
                setDetailMode('create')
              }}
            />
          </div>

          {loading ? (
            <div className="py-10 text-center text-gray-500 dark:text-gray-300">
              {t('loadingEntityTypes')}
            </div>
          ) : entityDefinitions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-slate-700 dark:bg-slate-900">
              <h3 className="td-section-title">{t('noEntityTypesTitle')}</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                {t('noEntityTypesManagerDetail')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
              <table className="w-full table-fixed text-left">
                <thead className="bg-gray-50 text-gray-600 dark:bg-slate-800 dark:text-gray-200">
                  <tr>
                    <th className="px-5 py-3 text-base font-semibold">
                      {t('entityName')}
                    </th>
                    <th className="px-5 py-3 text-base font-semibold">
                      {t('associatedGroupName')}
                    </th>
                    <th className="w-44 px-5 py-3 text-right text-base font-semibold">
                      {t('common:actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {entityDefinitions.map((definition) => {
                    const selected = selectedTypeName === definition.name
                    return (
                      <tr
                        key={definition.name}
                        role="button"
                        tabIndex={0}
                        onClick={() => openEntity(definition, 'view')}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            openEntity(definition, 'view')
                          }
                        }}
                        className={`cursor-pointer text-base transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 dark:hover:bg-slate-800 ${
                          selected
                            ? 'bg-blue-50 dark:bg-blue-950/30'
                            : 'dark:text-gray-100'
                        }`}
                      >
                        <td className="px-5 py-4 font-semibold text-gray-900 dark:text-gray-100">
                          {definition.name}
                        </td>
                        <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                          {definition.associatedDomainName ?? '—'}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <IconActionButton
                              title={t('common:view')}
                              onClick={() => openEntity(definition, 'view')}
                            >
                              <EyeIcon className="h-5 w-5" />
                            </IconActionButton>
                            <IconActionButton
                              title={t('common:edit')}
                              onClick={() => openEntity(definition, 'edit')}
                            >
                              <PencilSquareIcon className="h-5 w-5" />
                            </IconActionButton>
                            <IconActionButton
                              title={t('common:delete')}
                              danger
                              onClick={() => setDeleteTarget(definition)}
                            >
                              <TrashIcon className="h-5 w-5" />
                            </IconActionButton>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {detailMode === 'create' && (
          <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 text-left dark:border-slate-700 dark:bg-slate-900">
            <h2 className="td-panel-title !mb-1">{t('createEntityType')}</h2>
            <p className="mb-5 text-sm text-gray-500 dark:text-gray-300">
              {t('projectTypeCreateHelp')}
            </p>
            <Builder
              embedded
              scope="project"
              mode="create"
              onSaved={handleSaved}
              onCancel={() => setDetailMode(null)}
            />
          </div>
        )}

        {selectedType && (detailMode === 'view' || detailMode === 'edit') && (
          <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 text-left dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="td-panel-title !mb-0">{selectedType.name}</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">
                  {detailMode === 'edit'
                    ? t('editEntityHelp')
                    : t('viewEntityHelp')}
                </p>
              </div>
              {detailMode === 'view' && (
                <button
                  type="button"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-gray-200 dark:hover:bg-slate-800"
                  onClick={() => setDetailMode(null)}
                >
                  {t('common:close')}
                </button>
              )}
            </div>

            {detailMode === 'view' ? (
              <>
                <dl className="mb-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                    <dt className="td-field-label">
                      {t('associatedGroupName')}
                    </dt>
                    <dd className="mt-2 text-base font-medium text-gray-900 dark:text-gray-100">
                      {selectedType.associatedDomainName ?? '—'}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                    <dt className="td-field-label">{t('baseType')}</dt>
                    <dd className="mt-2 text-base font-medium text-gray-900 dark:text-gray-100">
                      {selectedType.baseTypeName ?? '—'}
                    </dd>
                  </div>
                </dl>
                <Builder
                  embedded
                  readOnly
                  hideBasicSettings
                  scope="project"
                  mode="edit"
                  initialType={selectedType}
                />
              </>
            ) : (
              <Builder
                embedded
                hideEntityName
                scope="project"
                mode="edit"
                initialType={selectedType}
                onSaved={handleSaved}
                onCancel={() => setDetailMode('view')}
              />
            )}
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <h2 className="td-panel-title !mb-0">
              {t('confirmDeleteTitle')}
            </h2>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              {t('confirmDeleteProjectType', { type: deleteTarget.name })}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <SecondaryOutlinedButton
                label={t('common:cancel')}
                onClick={() => setDeleteTarget(null)}
              />
              <SecondaryButton
                label={t('common:delete')}
                loading={deleting}
                onClick={deleteEntity}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
