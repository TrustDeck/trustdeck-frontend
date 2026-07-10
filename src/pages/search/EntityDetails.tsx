import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useSearchResultsStore from './stores/SearchResultsStore'
import PrimaryButton from '../../core/components/form/buttons/PrimaryButton'
import PrimaryOutlinedButton from '../../core/components/form/buttons/PrimaryOutlinedButton'
import {
  ArrowLeftIcon,
  PencilIcon,
  XMarkIcon,
  CheckIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { Dialog } from 'primereact/dialog'
import useProjectStore from '../../core/stores/ProjectStore'
import useLayoutStore from '../../core/stores/LayoutStore'
import useToastStore from '../../core/stores/ToastStore'
import TrustDeck from '../../core/services/TrustDeck'
import DynamicEntity from './components/DynamicEntity'
import { pickSchemaData } from './utils/schemaData'
import SecondaryOutlinedButton from '../../core/components/form/buttons/SecondaryOutlinedButton'

const EntityDetails: React.FC = () => {
  const { results, setResults } = useSearchResultsStore()
  const { entityAttributes } = useProjectStore()
  const { editMode, setEditMode } = useLayoutStore()
  const { entityId } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const showToast = useToastStore((state) => state.show)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const entity = useMemo(
    () => results.find((e) => e.trustdeckID === entityId),
    [results, entityId]
  )

  const schema = useMemo(() => {
    if (!entity) return undefined
    return entityAttributes.find(
      (definition) =>
        definition.name?.toLowerCase() === entity.entityTypeName?.toLowerCase() ||
        definition.name?.toLowerCase() === entity.type?.toLowerCase()
    )
  }, [entity, entityAttributes])

  useEffect(() => {
    if (!entity?.data) return
    const schemaAttributes = schema?.typeDefinition?.attributes ?? []
    setFormData(
      schemaAttributes.length
        ? pickSchemaData(schemaAttributes, entity.data)
        : entity.data
    )
  }, [entity, schema])

  if (!entity) {
    return <p>No result found for ID: {entityId}</p>
  }

  const setValueAtPath = (
    source: Record<string, any>,
    path: Array<string | number>,
    value: any
  ): Record<string, any> => {
    if (!path.length) return source
    const next = structuredClone(source ?? {})
    let cursor: any = next

    for (let i = 0; i < path.length - 1; i++) {
      const current = path[i]
      const following = path[i + 1]

      if (typeof current === 'number') {
        if (!Array.isArray(cursor)) break
        if (cursor[current] === undefined) {
          cursor[current] = typeof following === 'number' ? [] : {}
        }
        cursor = cursor[current]
      } else {
        if (cursor[current] === undefined || cursor[current] === null) {
          cursor[current] = typeof following === 'number' ? [] : {}
        }
        cursor = cursor[current]
      }
    }

    const leaf = path[path.length - 1]
    if (typeof leaf === 'number' && Array.isArray(cursor)) {
      cursor[leaf] = value
    } else if (typeof leaf === 'string') {
      cursor[leaf] = value
    }

    return next
  }

  const handleFieldChange = (path: Array<string | number>, value: any) => {
    setFormData((prev) => setValueAtPath(prev, path, value))
  }

  const handleCancel = () => {
    const schemaAttributes = schema?.typeDefinition?.attributes ?? []
    setFormData(
      schemaAttributes.length
        ? pickSchemaData(schemaAttributes, entity.data ?? {})
        : (entity.data ?? {})
    )
    setEditMode(false)
  }

  const handleSave = async () => {
    const entityType = entity.entityTypeName || entity.type
    const identifier = entity.trustdeckID || entity.id
    if (!entityType || !identifier) {
      showToast({
        severity: 'error',
        summary: t('search:save'),
        detail: t('search:editFailed'),
        life: 4000
      })
      return
    }

    try {
      const schemaAttributes = schema?.typeDefinition?.attributes ?? []
      const dataToSave =
        schemaAttributes.length > 0
          ? pickSchemaData(schemaAttributes, formData)
          : formData
      const payload = { data: dataToSave }
      await TrustDeck.instance().putEntity(entityType, payload, identifier)
      setResults(
        results.map((entry) =>
          entry.trustdeckID === entity.trustdeckID ? { ...entry, data: dataToSave } : entry
        )
      )
      setEditMode(false)
      showToast({
        severity: 'success',
        summary: t('search:save'),
        detail: t('search:editSuccess'),
        life: 3000
      })
    } catch (error) {
      console.error(error)
      showToast({
        severity: 'error',
        summary: t('search:save'),
        detail: t('search:editFailed'),
        life: 4000
      })
    }
  }

  const handleDelete = async () => {
    const entityType = entity.entityTypeName || entity.type
    const identifier = entity.trustdeckID || entity.id
    if (!entityType || !identifier) {
      showToast({
        severity: 'error',
        summary: t('search:deleteEntity'),
        detail: t('search:deleteFailed'),
        life: 4000
      })
      return
    }

    setDeleting(true)
    try {
      await TrustDeck.instance().deleteEntity(entityType, String(identifier))
      setResults(
        results.filter(
          (entry) =>
            entry.trustdeckID !== entity.trustdeckID && entry.id !== entity.id
        )
      )
      setDeleteConfirmOpen(false)
      setEditMode(false)
      showToast({
        severity: 'success',
        summary: t('search:deleteEntity'),
        detail: t('search:deleteSuccess'),
        life: 3000
      })
      navigate('/search/results')
    } catch (error) {
      console.error(error)
      showToast({
        severity: 'error',
        summary: t('search:deleteEntity'),
        detail: error instanceof Error ? error.message : t('search:deleteFailed'),
        life: 5000
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="relative mb-4 flex w-full items-center justify-between">
        {/* Left button */}
        <div className="flex-shrink-0">
          <PrimaryOutlinedButton
            label={<span className="hidden sm:inline">{t('search:back')}</span>}
            onClick={() => navigate('/search/results')}
            icon={<ArrowLeftIcon className="h-5 w-5 mr-1" />}
          />
        </div>

        {/* Centered title */}
        <h1 className="absolute left-1/2 transform -translate-x-1/2 text-center">
          {t('search:entityView')}
        </h1>

        {/* Right buttons */}
        <div className="flex gap-2 flex-shrink-0">
          {!editMode ? (
            <>
              <PrimaryButton
                label={<span className="hidden sm:inline">{t('search:edit')}</span>}
                onClick={() => setEditMode(true)}
                icon={<PencilIcon className="h-5 w-5 mr-1" />}
              />
              <SecondaryOutlinedButton
                label={<span className="hidden sm:inline">{t('search:delete')}</span>}
                onClick={() => setDeleteConfirmOpen(true)}
                icon={<TrashIcon className="h-5 w-5 mr-1" />}
                loading={deleting}
              />
            </>
          ) : (
            <>
              <PrimaryOutlinedButton
                label={<span className="hidden sm:inline">{t('search:cancel')}</span>}
                onClick={handleCancel}
                icon={<XMarkIcon className="h-5 w-5 mr-1" />}
              />
              <PrimaryButton
                label={<span className="hidden sm:inline">{t('search:save')}</span>}
                onClick={handleSave}
                icon={<CheckIcon className="h-5 w-5 mr-1" />}
              />
            </>
          )}
        </div>
      </div>
      <DynamicEntity
        entity={entity}
        schemaAttributes={schema?.typeDefinition?.attributes ?? []}
        editMode={editMode}
        formData={formData}
        onFieldChange={handleFieldChange}
      />

      <Dialog
        visible={deleteConfirmOpen}
        onHide={() => setDeleteConfirmOpen(false)}
        header={t('search:confirmDeleteTitle')}
        closable
        dismissableMask={!deleting}
        style={{ width: '520px', maxWidth: '95vw' }}
      >
        <div className="flex flex-col gap-4">
          <p>{t('search:confirmDeleteEntity')}</p>
          <div className="flex justify-end gap-2">
            <PrimaryOutlinedButton
              label={t('search:cancel')}
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleting}
            />
            <SecondaryOutlinedButton
              label={t('search:delete')}
              onClick={handleDelete}
              loading={deleting}
            />
          </div>
        </div>
      </Dialog>
    </div>
  )
}

export default EntityDetails
