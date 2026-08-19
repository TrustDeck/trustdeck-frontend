import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useSearchResultsStore from './stores/SearchResultsStore'
import PrimaryButton from '../../core/components/form/buttons/PrimaryButton'
import PrimaryOutlinedButton from '../../core/components/form/buttons/PrimaryOutlinedButton'
import SecondaryButton from '../../core/components/form/buttons/SecondaryButton'
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
import InlinePseudonymDetail from './components/InlinePseudonymDetail'
import PseudonymService from './services/PseudonymService'
import { pickSchemaData } from './utils/schemaData'
import SecondaryOutlinedButton from '../../core/components/form/buttons/SecondaryOutlinedButton'
import type { Link } from '../../core/types/Link'
import type { Pseudonym } from '../../core/types/Pseudonym'

function resolveTrustDeckId(entity: any): string {
  return String(
    entity?.trustdeckID ??
      entity?.trustdeckId ??
      entity?.trustDeckId ??
      entity?.data?.trustdeckID ??
      entity?.data?.trustdeckId ??
      entity?.id ??
      ''
  )
}

function normalizeLinks(links: unknown): Link[] {
  if (Array.isArray(links)) return links as Link[]
  return links ? [links as Link] : []
}

function replaceLinkedPseudonym(
  links: unknown,
  previousDomain: string,
  previousPseudonym: string,
  nextDomain: string,
  nextPseudonym: string
): Link[] {
  return normalizeLinks(links).map((link) => {
    const matches =
      String(link.group ?? '') === previousDomain &&
      String(link.pseudonym ?? '') === previousPseudonym

    return {
      ...link,
      group: matches ? nextDomain : link.group,
      pseudonym: matches ? nextPseudonym : link.pseudonym,
      children: link.children?.length
        ? replaceLinkedPseudonym(
            link.children,
            previousDomain,
            previousPseudonym,
            nextDomain,
            nextPseudonym
          )
        : link.children
    }
  })
}

function removeLinkedPseudonym(
  links: unknown,
  domainName: string,
  pseudonym: string
): Link[] {
  return normalizeLinks(links).flatMap((link) => {
    const matches =
      String(link.group ?? '') === domainName &&
      String(link.pseudonym ?? '') === pseudonym
    if (matches) return []

    return [
      {
        ...link,
        children: link.children?.length
          ? removeLinkedPseudonym(link.children, domainName, pseudonym)
          : link.children
      }
    ]
  })
}

const EntityDetails: React.FC = () => {
  const { results, setResults } = useSearchResultsStore()
  const { entityAttributes } = useProjectStore()
  const { editMode, setEditMode } = useLayoutStore()
  const { entityId } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const showToast = useToastStore((state) => state.show)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [linkedPseudonym, setLinkedPseudonym] = useState<Pseudonym | null>(null)
  const [linkedPseudonymDomain, setLinkedPseudonymDomain] = useState('')
  const [loadingLinkedPseudonym, setLoadingLinkedPseudonym] = useState(false)
  const returnTo =
    typeof (location.state as { returnTo?: unknown } | null)?.returnTo ===
    'string'
      ? String((location.state as { returnTo?: string }).returnTo)
      : '/search'

  const entity = useMemo(
    () => results.find((entry) => resolveTrustDeckId(entry) === entityId),
    [results, entityId]
  )

  const schema = useMemo(() => {
    if (!entity) return undefined
    return entityAttributes.find(
      (definition) =>
        definition.name?.toLowerCase() ===
          entity.entityTypeName?.toLowerCase() ||
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

  useEffect(() => {
    setLinkedPseudonym(null)
    setLinkedPseudonymDomain('')
  }, [entityId])

  if (!entity) {
    return <p>{t('search:entityNotFoundById', { id: entityId ?? '—' })}</p>
  }

  const setValueAtPath = (
    source: Record<string, any>,
    path: Array<string | number>,
    value: any
  ): Record<string, any> => {
    if (!path.length) return source
    const next = structuredClone(source ?? {})
    let cursor: any = next

    for (let index = 0; index < path.length - 1; index += 1) {
      const current = path[index]
      const following = path[index + 1]

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
    setFormData((previous) => setValueAtPath(previous, path, value))
  }

  const openLinkedPseudonym = async (
    domainName: string,
    pseudonymValue: string
  ) => {
    if (!pseudonymValue || loadingLinkedPseudonym) return

    setLoadingLinkedPseudonym(true)
    try {
      const result = await PseudonymService.searchPseudonym(
        pseudonymValue,
        domainName || undefined
      )
      if (!result) throw new Error(t('search:pseudonym.notFound'))

      const normalized = {
        ...result,
        domainName: result.domainName || domainName
      }
      setLinkedPseudonym(normalized)
      setLinkedPseudonymDomain(normalized.domainName)
    } catch (error) {
      console.error('Failed to open linked pseudonym inline', error)
      showToast({
        severity: 'error',
        summary: t('search:pseudonymView'),
        detail:
          error instanceof Error
            ? error.message
            : t('search:pseudonym.loadFailed'),
        life: 4500
      })
    } finally {
      setLoadingLinkedPseudonym(false)
    }
  }

  const updateEntityLinks = (links: Link[]) => {
    const updatedEntity = { ...entity, links }
    setResults(
      results.map((entry) =>
        resolveTrustDeckId(entry) === resolveTrustDeckId(entity)
          ? updatedEntity
          : entry
      )
    )
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
    const identifier = resolveTrustDeckId(entity)
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
          resolveTrustDeckId(entry) === resolveTrustDeckId(entity)
            ? { ...entry, data: dataToSave }
            : entry
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
    const identifier = resolveTrustDeckId(entity)
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
      await TrustDeck.instance().deleteEntity(entityType, identifier)
      setResults(
        results.filter(
          (entry) => resolveTrustDeckId(entry) !== resolveTrustDeckId(entity)
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
      navigate(returnTo)
    } catch (error) {
      console.error(error)
      showToast({
        severity: 'error',
        summary: t('search:deleteEntity'),
        detail:
          error instanceof Error ? error.message : t('search:deleteFailed'),
        life: 5000
      })
    } finally {
      setDeleting(false)
    }
  }

  const closeLinkedPseudonym = () => {
    setLinkedPseudonym(null)
    setLinkedPseudonymDomain('')
  }

  return (
    <div>
      <div className="relative mb-4 flex w-full items-center justify-between">
        <div className="flex-shrink-0">
          <PrimaryOutlinedButton
            label={<span className="hidden sm:inline">{t('search:back')}</span>}
            onClick={() =>
              linkedPseudonym ? closeLinkedPseudonym() : navigate(returnTo)
            }
            icon={<ArrowLeftIcon className="mr-1 h-5 w-5" />}
          />
        </div>

        <h1 className="td-panel-title absolute left-1/2 !mb-0 -translate-x-1/2 text-center">
          {linkedPseudonym ? t('search:pseudonymView') : t('search:entityView')}
        </h1>

        {!linkedPseudonym && (
          <div className="flex flex-shrink-0 gap-2">
            {!editMode ? (
              <>
                <PrimaryButton
                  label={
                    <span className="hidden sm:inline">{t('search:edit')}</span>
                  }
                  onClick={() => setEditMode(true)}
                  icon={<PencilIcon className="mr-1 h-5 w-5" />}
                />
                <SecondaryButton
                  label={
                    <span className="hidden sm:inline">
                      {t('search:delete')}
                    </span>
                  }
                  onClick={() => setDeleteConfirmOpen(true)}
                  icon={<TrashIcon className="mr-1 h-5 w-5" />}
                  loading={deleting}
                />
              </>
            ) : (
              <>
                <SecondaryOutlinedButton
                  label={
                    <span className="hidden sm:inline">
                      {t('search:cancel')}
                    </span>
                  }
                  onClick={handleCancel}
                  icon={<XMarkIcon className="mr-1 h-5 w-5" />}
                />
                <PrimaryButton
                  label={
                    <span className="hidden sm:inline">{t('search:save')}</span>
                  }
                  onClick={handleSave}
                  icon={<CheckIcon className="mr-1 h-5 w-5" />}
                />
              </>
            )}
          </div>
        )}
      </div>

      {linkedPseudonym ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <InlinePseudonymDetail
            embedded
            pseudonym={linkedPseudonym}
            fallbackDomain={linkedPseudonymDomain}
            initialEditMode={false}
            onClose={closeLinkedPseudonym}
            onUpdated={(
              previousDomain,
              previousPseudonym,
              updatedPseudonym
            ) => {
              const normalized = {
                ...updatedPseudonym,
                domainName: updatedPseudonym.domainName || previousDomain
              }
              updateEntityLinks(
                replaceLinkedPseudonym(
                  entity.links,
                  previousDomain,
                  previousPseudonym,
                  normalized.domainName,
                  normalized.psn
                )
              )
              setLinkedPseudonym(normalized)
              setLinkedPseudonymDomain(normalized.domainName)
            }}
            onDeleted={(domainName, pseudonymValue) => {
              updateEntityLinks(
                removeLinkedPseudonym(entity.links, domainName, pseudonymValue)
              )
              closeLinkedPseudonym()
            }}
          />
        </div>
      ) : (
        <DynamicEntity
          entity={entity}
          schemaAttributes={schema?.typeDefinition?.attributes ?? []}
          editMode={editMode}
          formData={formData}
          onFieldChange={handleFieldChange}
          onLinkedPseudonymSelect={openLinkedPseudonym}
        />
      )}

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
            <SecondaryOutlinedButton
              label={t('search:cancel')}
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleting}
            />
            <SecondaryButton
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
