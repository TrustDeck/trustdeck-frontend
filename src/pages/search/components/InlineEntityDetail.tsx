import { useEffect, useMemo, useState } from 'react'
import { Dialog } from 'primereact/dialog'
import {
  ArrowLeftIcon,
  CheckIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

import DynamicEntity from './DynamicEntity'
import InlinePseudonymDetail from './InlinePseudonymDetail'
import PseudonymService from '../services/PseudonymService'
import PrimaryButton from '../../../core/components/form/buttons/PrimaryButton'
import PrimaryOutlinedButton from '../../../core/components/form/buttons/PrimaryOutlinedButton'
import SecondaryOutlinedButton from '../../../core/components/form/buttons/SecondaryOutlinedButton'
import TrustDeck from '../../../core/services/TrustDeck'
import useProjectStore from '../../../core/stores/ProjectStore'
import useToastStore from '../../../core/stores/ToastStore'
import { pickSchemaData } from '../utils/schemaData'
import type { Pseudonym } from '../../../core/types/Pseudonym'
import type { Link } from '../../../core/types/Link'

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

function setValueAtPath(
  source: Record<string, any>,
  path: Array<string | number>,
  value: any
): Record<string, any> {
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

type Props = {
  entity: any
  entityTypeName: string
  initialEditMode: boolean
  onClose: () => void
  onUpdated: (updatedEntity: any) => void
  onDeleted: (identifier: string) => void
}

export default function InlineEntityDetail({
  entity,
  entityTypeName,
  initialEditMode,
  onClose,
  onUpdated,
  onDeleted
}: Props) {
  const { t } = useTranslation('search')
  const showToast = useToastStore((state) => state.show)
  const selectedProject = useProjectStore((state) => state.selectedProject)
  const entityAttributes = useProjectStore((state) => state.entityAttributes)
  const [editMode, setEditMode] = useState(initialEditMode)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [linkedPseudonym, setLinkedPseudonym] = useState<Pseudonym | null>(null)
  const [linkedPseudonymDomain, setLinkedPseudonymDomain] = useState('')
  const [loadingLinkedPseudonym, setLoadingLinkedPseudonym] = useState(false)

  const schema = useMemo(
    () =>
      entityAttributes.find(
        (definition) =>
          definition.name?.toLowerCase() === entityTypeName.toLowerCase() ||
          definition.name?.toLowerCase() ===
            String(entity?.entityTypeName ?? entity?.type ?? '').toLowerCase()
      ),
    [entity, entityAttributes, entityTypeName]
  )

  const schemaAttributes = useMemo(
    () => schema?.typeDefinition?.attributes ?? [],
    [schema]
  )
  const identifier = resolveTrustDeckId(entity)

  useEffect(() => {
    const source = entity?.data ?? {}
    setFormData(
      schemaAttributes.length ? pickSchemaData(schemaAttributes, source) : source
    )
    setEditMode(initialEditMode)
  }, [entity, initialEditMode, schemaAttributes])

  useEffect(() => {
    setLinkedPseudonym(null)
    setLinkedPseudonymDomain('')
  }, [identifier])

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
      if (!result) {
        throw new Error(t('pseudonym.notFound'))
      }
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
        summary: t('pseudonymView'),
        detail:
          error instanceof Error ? error.message : t('pseudonym.loadFailed'),
        life: 4500
      })
    } finally {
      setLoadingLinkedPseudonym(false)
    }
  }

  const resetForm = () => {
    const source = entity?.data ?? {}
    setFormData(
      schemaAttributes.length ? pickSchemaData(schemaAttributes, source) : source
    )
    setEditMode(false)
  }

  const save = async () => {
    const typeName = entityTypeName || entity?.entityTypeName || entity?.type
    if (!typeName || !identifier) return

    setSaving(true)
    try {
      const dataToSave = schemaAttributes.length
        ? pickSchemaData(schemaAttributes, formData)
        : formData
      await TrustDeck.instance().putEntity(typeName, { data: dataToSave }, identifier)
      onUpdated({ ...entity, data: dataToSave })
      setEditMode(false)
      showToast({
        severity: 'success',
        summary: t('save'),
        detail: t('editSuccess'),
        life: 3000
      })
    } catch (error) {
      console.error('Failed to update inline entity result', error)
      showToast({
        severity: 'error',
        summary: t('save'),
        detail: t('editFailed'),
        life: 4500
      })
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    const typeName = entityTypeName || entity?.entityTypeName || entity?.type
    if (!typeName || !identifier) return

    setDeleting(true)
    try {
      await TrustDeck.instance().deleteEntity(
        typeName,
        identifier,
        selectedProject?.abbreviation
      )
      onDeleted(identifier)
      setDeleteConfirmOpen(false)
      showToast({
        severity: 'success',
        summary: t('deleteEntity'),
        detail: t('deleteSuccess'),
        life: 3000
      })
    } catch (error) {
      console.error('Failed to delete inline entity result', error)
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

  if (linkedPseudonym) {
    return (
      <InlinePseudonymDetail
        pseudonym={linkedPseudonym}
        fallbackDomain={linkedPseudonymDomain}
        initialEditMode={false}
        backLabel={t('backToEntityDetails')}
        onClose={() => {
          setLinkedPseudonym(null)
          setLinkedPseudonymDomain('')
        }}
        onUpdated={(previousDomain, previousPseudonym, updated) => {
          const normalized = {
            ...updated,
            domainName: updated.domainName || previousDomain
          }
          const nextEntity = {
            ...entity,
            links: replaceLinkedPseudonym(
              entity.links,
              previousDomain,
              previousPseudonym,
              normalized.domainName,
              normalized.psn
            )
          }
          setLinkedPseudonym(normalized)
          setLinkedPseudonymDomain(normalized.domainName)
          onUpdated(nextEntity)
        }}
        onDeleted={(domainName, pseudonymValue) => {
          const nextEntity = {
            ...entity,
            links: removeLinkedPseudonym(
              entity.links,
              domainName,
              pseudonymValue
            )
          }
          onUpdated(nextEntity)
          setLinkedPseudonym(null)
          setLinkedPseudonymDomain('')
        }}
      />
    )
  }

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-slate-700">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            title={t('backToResults')}
            aria-label={t('backToResults')}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-color-blue text-color-blue transition hover:bg-blue-50 dark:hover:bg-slate-800"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h3 className="td-panel-title">{t('entityView')}</h3>
            <p className="mt-1 break-all font-mono text-base text-gray-600 dark:text-gray-300">
              {identifier}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!editMode ? (
            <>
              <PrimaryButton
                label={t('edit')}
                onClick={() => setEditMode(true)}
                icon={<PencilIcon className="mr-1 h-5 w-5" />}
              />
              <SecondaryOutlinedButton
                label={t('delete')}
                onClick={() => setDeleteConfirmOpen(true)}
                icon={<TrashIcon className="mr-1 h-5 w-5" />}
              />
            </>
          ) : (
            <>
              <PrimaryButton
                label={t('save')}
                onClick={save}
                loading={saving}
                icon={<CheckIcon className="mr-1 h-5 w-5" />}
              />
              <PrimaryOutlinedButton
                label={t('cancel')}
                onClick={resetForm}
                disabled={saving}
                icon={<XMarkIcon className="mr-1 h-5 w-5" />}
              />
            </>
          )}
        </div>
      </div>

      <div className="px-5 py-5">
        <DynamicEntity
          entity={entity}
          schemaAttributes={schemaAttributes}
          editMode={editMode}
          formData={formData}
          onFieldChange={(path, value) =>
            setFormData((current) => setValueAtPath(current, path, value))
          }
          onLinkedPseudonymSelect={openLinkedPseudonym}
        />
      </div>

      <Dialog
        visible={deleteConfirmOpen}
        onHide={() => setDeleteConfirmOpen(false)}
        header={t('confirmDeleteTitle')}
        className="w-full max-w-lg"
        dismissableMask={!deleting}
      >
        <div className="space-y-4">
          <p>{t('confirmDeleteEntity')}</p>
          <div className="flex justify-end gap-2">
            <PrimaryOutlinedButton
              label={t('cancel')}
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleting}
            />
            <SecondaryOutlinedButton
              label={t('delete')}
              onClick={remove}
              loading={deleting}
            />
          </div>
        </div>
      </Dialog>
    </div>
  )
}
