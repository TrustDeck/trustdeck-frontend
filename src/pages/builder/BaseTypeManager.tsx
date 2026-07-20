import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  EyeIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import Panel from '../../core/components/common/Panel'
import TrustDeck from '../../core/services/TrustDeck'
import PrimaryButton from '../../core/components/form/buttons/PrimaryButton'
import PrimaryOutlinedButton from '../../core/components/form/buttons/PrimaryOutlinedButton'
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

export default function BaseTypeManager() {
  const { t } = useTranslation(['entityBuilder', 'common'])
  const showToast = useToastStore((state) => state.show)
  const [baseTypes, setBaseTypes] = useState<EntityTypePayload[]>([])
  const [selectedTypeName, setSelectedTypeName] = useState('')
  const [detailMode, setDetailMode] = useState<DetailMode>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<EntityTypePayload | null>(
    null
  )

  const selectedType = useMemo(
    () =>
      baseTypes.find((definition) => definition.name === selectedTypeName) ??
      null,
    [baseTypes, selectedTypeName]
  )

  const loadBaseTypes = useCallback(
    async (preferredName?: string) => {
      setLoading(true)
      try {
        const response = await TrustDeck.instance().getBaseTypes('*')
        const definitions = (
          Array.isArray(response) ? response : []
        ) as EntityTypePayload[]
        setBaseTypes(definitions)

        setSelectedTypeName((currentName) => {
          if (
            preferredName &&
            definitions.some((entry) => entry.name === preferredName)
          ) {
            return preferredName
          }
          if (
            currentName &&
            !definitions.some((entry) => entry.name === currentName)
          ) {
            setDetailMode(null)
            return ''
          }
          return currentName
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (!message.includes('404')) {
          console.error('Failed to load base entities', error)
          showToast({
            severity: 'error',
            summary: t('common:error'),
            detail: t('loadFailed'),
            life: 4000
          })
        }
        setBaseTypes([])
        setSelectedTypeName('')
        setDetailMode(null)
      } finally {
        setLoading(false)
      }
    },
    [showToast, t]
  )

  useEffect(() => {
    void loadBaseTypes()
  }, [loadBaseTypes])

  const openBaseEntity = (
    definition: EntityTypePayload,
    mode: 'view' | 'edit'
  ) => {
    setSelectedTypeName(definition.name)
    setDetailMode(mode)
  }

  const handleSaved = (savedType: EntityTypePayload) => {
    setSelectedTypeName(savedType.name)
    setDetailMode('view')
    void loadBaseTypes(savedType.name)
  }

  const deleteBaseEntity = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await TrustDeck.instance().deleteBaseType(deleteTarget.name)
      showToast({
        severity: 'success',
        summary: t('toast.deletedSummary'),
        detail: t('toast.baseDeletedDetail'),
        life: 3500
      })
      if (selectedTypeName === deleteTarget.name) {
        setSelectedTypeName('')
        setDetailMode(null)
      }
      setDeleteTarget(null)
      await loadBaseTypes()
    } catch (error) {
      console.error('Could not delete base entity', error)
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
        title={t('globalSettingsTitle')}
        description={t('globalSettingsSubtitle')}
      />

      <div className="td-page-content flex w-full flex-col gap-6">
        <Panel noMaxWidth className="mx-auto !w-full">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="td-panel-title !mb-0">
                {t('baseTypesSectionTitle')}
              </h2>
              <p className="mt-2 text-base text-gray-600 dark:text-gray-300">
                {t('baseTypesSectionDescription')}
              </p>
            </div>
            <PrimaryButton
              label={
                <span className="inline-flex items-center gap-2">
                  <PlusIcon className="h-5 w-5" />
                  {t('addBaseType')}
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
              {t('loadingBaseTypes')}
            </div>
          ) : baseTypes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-slate-700 dark:bg-slate-900">
              <h3 className="td-section-title">{t('noBaseTypesTitle')}</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                {t('noBaseTypesManagerDetail')}
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
                    <th className="w-44 px-5 py-3 text-right text-base font-semibold">
                      {t('common:actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {baseTypes.map((definition) => {
                    const selected = selectedTypeName === definition.name
                    return (
                      <tr
                        key={`${definition.name}-${definition.version ?? ''}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => openBaseEntity(definition, 'view')}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            openBaseEntity(definition, 'view')
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
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <IconActionButton
                              title={t('common:view')}
                              onClick={() => openBaseEntity(definition, 'view')}
                            >
                              <EyeIcon className="h-5 w-5" />
                            </IconActionButton>
                            <IconActionButton
                              title={t('common:edit')}
                              onClick={() => openBaseEntity(definition, 'edit')}
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
            <h2 className="td-panel-title !mb-1">{t('createBaseType')}</h2>
            <p className="mb-5 text-sm text-gray-500 dark:text-gray-300">
              {t('baseTypeCreateHelp')}
            </p>
            <Builder
              embedded
              scope="base"
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
                    ? t('baseTypeEditHelp')
                    : t('baseTypeViewHelp')}
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
              <Builder
                embedded
                readOnly
                hideBasicSettings
                scope="base"
                mode="edit"
                initialType={selectedType}
              />
            ) : (
              <Builder
                embedded
                hideBasicSettings
                scope="base"
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
            <h2 className="td-panel-title !mb-0">{t('confirmDeleteTitle')}</h2>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              {t('confirmDeleteBaseType', {
                type: deleteTarget.name
              })}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <PrimaryOutlinedButton
                label={t('common:cancel')}
                onClick={() => setDeleteTarget(null)}
              />
              <SecondaryOutlinedButton
                label={t('common:delete')}
                loading={deleting}
                onClick={deleteBaseEntity}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
