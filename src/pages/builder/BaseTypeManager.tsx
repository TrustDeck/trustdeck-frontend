import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import Panel from '../../core/components/common/Panel'
import TrustDeck from '../../core/services/TrustDeck'
import PrimaryButton from '../../core/components/form/buttons/PrimaryButton'
import PrimaryOutlinedButton from '../../core/components/form/buttons/PrimaryOutlinedButton'
import SecondaryOutlinedButton from '../../core/components/form/buttons/SecondaryOutlinedButton'
import useToastStore from '../../core/stores/ToastStore'
import Builder, { type EntityTypePayload } from './Builder'

function typeLabel(type: EntityTypePayload) {
  return `${type.name}${type.version ? ` (${type.version})` : ''}`
}

function statusLabel(type: EntityTypePayload) {
  if (type.isDeleted) return 'deleted'
  if (type.isDeprecated) return 'deprecated'
  return 'active'
}

function statusText(status: string) {
  if (status === 'deleted') return 'Deleted'
  if (status === 'deprecated') return 'Deprecated'
  return 'Active'
}

export default function BaseTypeManager() {
  const { t } = useTranslation(['entityBuilder', 'common'])
  const showToast = useToastStore((state) => state.show)
  const [baseTypes, setBaseTypes] = useState<EntityTypePayload[]>([])
  const [selectedTypeName, setSelectedTypeName] = useState('')
  const [loading, setLoading] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingType, setEditingType] = useState<EntityTypePayload | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

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
        setSelectedTypeName(
          preferredName &&
            definitions.some((entry) => entry.name === preferredName)
            ? preferredName
            : ''
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (!message.includes('404')) {
          console.error('Failed to load base entity types', error)
          showToast({
            severity: 'error',
            summary: t('common:error'),
            detail: t('loadFailed'),
            life: 4000
          })
        }
        setBaseTypes([])
        setSelectedTypeName('')
      } finally {
        setLoading(false)
      }
    },
    [showToast, t]
  )

  useEffect(() => {
    void loadBaseTypes()
  }, [loadBaseTypes])

  const openCreateModal = () => {
    setEditingType(null)
    setEditorOpen(true)
  }

  const openEditModal = () => {
    if (!selectedType) return
    setEditingType(selectedType)
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditingType(null)
  }

  const handleSaved = (savedType: EntityTypePayload) => {
    closeEditor()
    void loadBaseTypes(savedType.name)
  }

  const deleteSelectedType = async () => {
    if (!selectedType) return
    setDeleting(true)
    try {
      await TrustDeck.instance().deleteBaseType(selectedType.name)
      showToast({
        severity: 'success',
        summary: t('toast.deletedSummary', 'Entity type deleted'),
        detail: t('toast.baseDeletedDetail', 'The base type was deleted.'),
        life: 3500
      })
      setDeleteConfirmOpen(false)
      await loadBaseTypes()
    } catch (error) {
      console.error('Could not delete base entity type', error)
      showToast({
        severity: 'error',
        summary: t('toast.deleteFailed', 'Delete failed'),
        detail: error instanceof Error ? error.message : String(error),
        life: 6000
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="builder-page-shell w-full">
      <div className="builder-content-column mx-auto flex w-full flex-col gap-6">
        <Panel
          noMaxWidth
          className="mx-auto !w-full"
          title={t('globalSettingsTitle', 'Global settings')}
        >
          {loading ? (
            <div className="py-10 text-center text-gray-500 dark:text-gray-300">
              {t('loadingBaseTypes', 'Loading base types...')}
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {t('baseTypesSectionTitle', 'Base types')}
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">
                  {t(
                    'baseTypesSectionDescription',
                    'Manage reusable type blueprints that can be extended by project-specific entity types.'
                  )}
                </p>
              </div>

              {baseTypes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-slate-700 dark:bg-slate-900">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {t('noBaseTypesTitle', 'No base types available')}
                  </h2>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    {t(
                      'noBaseTypesManagerDetail',
                      'Create a base type before project-specific types can extend it.'
                    )}
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                  <div className="grid grid-cols-[1.6fr_0.7fr_0.7fr] gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200">
                    <span>{t('entityName')}</span>
                    <span>{t('version', 'Version')}</span>
                    <span>{t('status', 'Status')}</span>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-slate-700">
                    {baseTypes.map((definition) => {
                      const selected = selectedType?.name === definition.name
                      const status = statusLabel(definition)
                      return (
                        <button
                          key={`${definition.name}-${definition.version ?? ''}`}
                          type="button"
                          onClick={() => setSelectedTypeName(definition.name)}
                          className={`grid w-full grid-cols-[1.6fr_0.7fr_0.7fr] gap-3 px-4 py-3 text-left text-sm transition ${selected ? 'bg-blue-50 text-color-blue dark:bg-blue-950/40 dark:text-blue-100' : 'hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-slate-800'}`}
                        >
                          <span className="min-w-0 truncate font-semibold">
                            {definition.name}
                          </span>
                          <span className="min-w-0 truncate text-gray-600 dark:text-gray-300">
                            {definition.version ?? 'v1.0'}
                          </span>
                          <span>
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-200' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200'}`}
                            >
                              {t(`typeStatus.${status}`, statusText(status))}
                            </span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-center">
                <PrimaryButton
                  label={
                    <span className="inline-flex items-center gap-2">
                      <PlusIcon className="h-5 w-5" />
                      {t('addBaseType', 'Add base type')}
                    </span>
                  }
                  onClick={openCreateModal}
                />
              </div>

              <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 text-left dark:border-slate-700 dark:bg-slate-900">
                {selectedType ? (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                          {selectedType.name}
                        </h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">
                          {t('versionLabel', {
                            version: selectedType.version ?? 'v1.0',
                            defaultValue: `Version ${selectedType.version ?? 'v1.0'}`
                          })}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <PrimaryOutlinedButton
                          label={
                            <span className="inline-flex items-center gap-2">
                              <PencilSquareIcon className="h-5 w-5" />
                              {t('common:edit', 'Edit')}
                            </span>
                          }
                          onClick={openEditModal}
                        />
                        <SecondaryOutlinedButton
                          label={
                            <span className="inline-flex items-center gap-2">
                              <TrashIcon className="h-5 w-5" />
                              {t('common:delete', 'Delete')}
                            </span>
                          }
                          loading={deleting}
                          onClick={() => setDeleteConfirmOpen(true)}
                        />
                      </div>
                    </div>

                    <dl className="grid gap-3 text-sm md:grid-cols-2">
                      <div>
                        <dt className="font-semibold text-gray-500 dark:text-gray-300">
                          {t('entityName')}
                        </dt>
                        <dd className="mt-1 text-gray-900 dark:text-gray-100">
                          {selectedType.name}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-gray-500 dark:text-gray-300">
                          {t('version', 'Version')}
                        </dt>
                        <dd className="mt-1 text-gray-900 dark:text-gray-100">
                          {selectedType.version ?? 'v1.0'}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-gray-500 dark:text-gray-300">
                          {t('status', 'Status')}
                        </dt>
                        <dd className="mt-1 text-gray-900 dark:text-gray-100">
                          {t(
                            `typeStatus.${statusLabel(selectedType)}`,
                            statusText(statusLabel(selectedType))
                          )}
                        </dd>
                      </div>
                    </dl>

                    <div>
                      <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {t('typeDefinition', 'Type definition')}
                      </h3>
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                        <Builder
                          embedded
                          readOnly
                          scope="base"
                          mode="edit"
                          initialType={selectedType}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-10 text-center text-gray-500 dark:text-gray-300">
                    {t(
                      'selectBaseTypeHint',
                      'Select a base type from the list or create a new one.'
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </Panel>
      </div>

      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {editingType
                    ? t('editBaseType', 'Edit base type')
                    : t('addBaseType', 'Add base type')}
                </h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-300">
                  {t(
                    'baseTypeModalHelp',
                    'Create or update a reusable base type.'
                  )}
                </p>
              </div>
              <button
                type="button"
                aria-label={t('common:close', 'Close')}
                onClick={closeEditor}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <Builder
              embedded
              scope="base"
              mode={editingType ? 'edit' : 'create'}
              initialType={editingType}
              onSaved={handleSaved}
              onCancel={closeEditor}
            />
          </div>
        </div>
      )}

      {deleteConfirmOpen && selectedType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {t('confirmDeleteTitle', 'Confirm deletion')}
            </h2>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              {t('confirmDeleteBaseType', {
                type: typeLabel(selectedType),
                defaultValue: `Delete base type ${typeLabel(selectedType)}?`
              })}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <PrimaryOutlinedButton
                label={t('common:cancel', 'Cancel')}
                onClick={() => setDeleteConfirmOpen(false)}
              />
              <SecondaryOutlinedButton
                label={t('common:delete', 'Delete')}
                loading={deleting}
                onClick={deleteSelectedType}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
