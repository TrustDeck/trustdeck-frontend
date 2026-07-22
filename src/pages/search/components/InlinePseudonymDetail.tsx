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

import type { Pseudonym } from '../../../core/types/Pseudonym'
import TrustDeck, {
  type PseudonymUpdatePayload
} from '../../../core/services/TrustDeck'
import PrimaryButton from '../../../core/components/form/buttons/PrimaryButton'
import PrimaryOutlinedButton from '../../../core/components/form/buttons/PrimaryOutlinedButton'
import SecondaryOutlinedButton from '../../../core/components/form/buttons/SecondaryOutlinedButton'
import InheritanceIndicator from '../../../core/components/common/InheritanceIndicator'
import useToastStore from '../../../core/stores/ToastStore'
import { formatDateTime } from '../../../core/utils/date'
import PseudonymTable from './PseudonymTable'

type PseudonymForm = {
  domainName: string
  psn: string
  identifier: string
  idType: string
  validFrom: string
  validFromInherited: boolean
  validTo: string
  validToInherited: boolean
}

type TextField = Exclude<
  keyof PseudonymForm,
  'validFromInherited' | 'validToInherited'
>

type InheritedField = Extract<
  keyof PseudonymForm,
  'validFromInherited' | 'validToInherited'
>

function asFormValue(
  pseudonym: Pseudonym,
  fallbackDomain: string
): PseudonymForm {
  return {
    domainName: pseudonym.domainName || fallbackDomain,
    psn: pseudonym.psn ?? '',
    identifier: pseudonym.identifierItem?.identifier ?? '',
    idType: pseudonym.identifierItem?.idType ?? '',
    validFrom: pseudonym.validFrom ?? '',
    validFromInherited: Boolean(pseudonym.validFromInherited),
    validTo: pseudonym.validTo ?? '',
    validToInherited: Boolean(pseudonym.validToInherited)
  }
}

function displayFieldValue(id: TextField, value: string): string {
  if ((id === 'validFrom' || id === 'validTo') && value) {
    return formatDateTime(value) || value
  }
  return value || '—'
}

type Props = {
  pseudonym: Pseudonym
  fallbackDomain: string
  initialEditMode: boolean
  onClose: () => void
  onUpdated: (
    previousDomain: string,
    previousPseudonym: string,
    updated: Pseudonym
  ) => void
  onDeleted: (domainName: string, pseudonym: string) => void
  backLabel?: string
}

export default function InlinePseudonymDetail({
  pseudonym,
  fallbackDomain,
  initialEditMode,
  onClose,
  onUpdated,
  onDeleted,
  backLabel
}: Props) {
  const { t } = useTranslation(['search', 'common'])
  const showToast = useToastStore((state) => state.show)
  const [editMode, setEditMode] = useState(initialEditMode)
  const [formData, setFormData] = useState<PseudonymForm>(() =>
    asFormValue(pseudonym, fallbackDomain)
  )
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const originalForm = useMemo(
    () => asFormValue(pseudonym, fallbackDomain),
    [fallbackDomain, pseudonym]
  )
  const requestDomain = pseudonym.domainName || fallbackDomain
  const inheritedTooltip = t('search:pseudonym.inheritedTooltip')

  useEffect(() => {
    setFormData(asFormValue(pseudonym, fallbackDomain))
    setEditMode(initialEditMode)
  }, [fallbackDomain, initialEditMode, pseudonym])

  const updateField = (
    id: TextField,
    value: string,
    inheritedField?: InheritedField
  ) => {
    setFormData((current) => {
      const next = { ...current, [id]: value }
      if (inheritedField) {
        next[inheritedField] = Boolean(
          originalForm[inheritedField] && value === originalForm[id]
        )
      }
      return next
    })
  }

  const cancel = () => {
    setFormData(originalForm)
    setEditMode(false)
  }

  const save = async () => {
    if (!requestDomain) return

    const identifierChanged = formData.identifier !== originalForm.identifier
    const idTypeChanged = formData.idType !== originalForm.idType
    const pseudonymChanged = formData.psn !== originalForm.psn
    const validFromChanged =
      formData.validFrom !== originalForm.validFrom ||
      formData.validFromInherited !== originalForm.validFromInherited
    const validToChanged =
      formData.validTo !== originalForm.validTo ||
      formData.validToInherited !== originalForm.validToInherited

    if (
      !identifierChanged &&
      !idTypeChanged &&
      !pseudonymChanged &&
      !validFromChanged &&
      !validToChanged
    ) {
      setEditMode(false)
      return
    }

    const payload: PseudonymUpdatePayload = {
      oldIdentifierItem: pseudonym.identifierItem,
      oldPsn: pseudonym.psn
    }

    if (identifierChanged || idTypeChanged) {
      payload.newIdentifierItem = {
        identifier: formData.identifier,
        idType: formData.idType
      }
    }
    if (pseudonymChanged) payload.newPsn = formData.psn
    if (validFromChanged) {
      payload.validFrom = formData.validFrom
      payload.validFromInherited = formData.validFromInherited
    }
    if (validToChanged) {
      payload.validTo = formData.validTo
      payload.validToInherited = formData.validToInherited
    }

    setSaving(true)
    try {
      const updated = await TrustDeck.instance().updatePseudonymComplete(
        requestDomain,
        payload
      )
      onUpdated(requestDomain, pseudonym.psn, updated)
      setFormData(asFormValue(updated, requestDomain))
      setEditMode(false)
      showToast({
        severity: 'success',
        summary: t('search:pseudonym.title'),
        detail: t('search:pseudonym.updateSuccess'),
        life: 3000
      })
    } catch (error) {
      console.error('Failed to update inline pseudonym result', error)
      showToast({
        severity: 'error',
        summary: t('search:pseudonym.title'),
        detail:
          error instanceof Error
            ? error.message
            : t('search:pseudonym.updateFailed'),
        life: 4500
      })
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!requestDomain) return

    setDeleting(true)
    try {
      await TrustDeck.instance().deletePseudonym(requestDomain, {
        psn: pseudonym.psn
      })
      onDeleted(requestDomain, pseudonym.psn)
      setDeleteConfirmOpen(false)
      showToast({
        severity: 'success',
        summary: t('search:pseudonym.title'),
        detail: t('search:pseudonym.deleteSuccess'),
        life: 3000
      })
    } catch (error) {
      console.error('Failed to delete inline pseudonym result', error)
      showToast({
        severity: 'error',
        summary: t('search:pseudonym.title'),
        detail:
          error instanceof Error
            ? error.message
            : t('search:pseudonym.deleteFailed'),
        life: 4500
      })
    } finally {
      setDeleting(false)
    }
  }

  const renderField = (
    id: TextField,
    label: string,
    inheritedField?: InheritedField,
    readOnly = false,
    monospace = false
  ) => {
    const inherited = inheritedField ? Boolean(formData[inheritedField]) : false
    const value = formData[id]

    if (!editMode || readOnly) {
      return (
        <div
          className={`rounded-lg border px-4 py-3 ${
            inherited
              ? 'border-blue-200 bg-blue-50/70 ring-1 ring-blue-100 dark:border-blue-800 dark:bg-blue-950/30'
              : 'border-color-light-gray bg-white dark:bg-slate-950'
          }`}
        >
          <div className="mb-1 flex items-center gap-1 text-base font-semibold text-gray-600 dark:text-gray-300">
            <span>{label}</span>
            {inherited && (
              <InheritanceIndicator
                title={inheritedTooltip}
                className="text-lg text-blue-700 dark:text-blue-300"
              />
            )}
          </div>
          <div
            className={`break-all text-xl text-gray-900 dark:text-gray-100 ${
              monospace ? 'font-mono' : ''
            }`}
          >
            {displayFieldValue(id, value)}
          </div>
        </div>
      )
    }

    return (
      <label
        className={`relative block rounded-lg border px-4 py-3 ${
          inherited
            ? 'border-blue-200 bg-blue-50/70 ring-1 ring-blue-100 dark:border-blue-800 dark:bg-blue-950/30'
            : 'border-color-light-gray bg-white dark:bg-slate-950'
        }`}
      >
        <span className="td-field-label mb-1 flex items-center gap-1">
          {label}
          {inherited && (
            <InheritanceIndicator
              title={inheritedTooltip}
              className="text-lg text-blue-700 dark:text-blue-300"
            />
          )}
        </span>
        <input
          id={`inline-pseudonym-${id}`}
          type="text"
          value={value}
          onChange={(event) =>
            updateField(id, event.target.value, inheritedField)
          }
          className={`h-[44px] w-full rounded-lg border border-color-light-gray bg-white px-3 text-xl text-gray-900 outline-none transition focus:border-color-blue focus:ring-1 focus:ring-color-blue dark:bg-slate-900 dark:text-gray-100 ${
            monospace ? 'font-mono' : ''
          }`}
        />
      </label>
    )
  }

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-slate-700">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            title={backLabel ?? t('search:backToResults')}
            aria-label={backLabel ?? t('search:backToResults')}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-color-blue text-color-blue transition hover:bg-blue-50 dark:hover:bg-slate-800"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h3 className="td-panel-title">{t('search:pseudonymView')}</h3>
            <p className="mt-1 break-all font-mono text-base text-gray-600 dark:text-gray-300">
              {pseudonym.psn}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!editMode ? (
            <>
              <PrimaryButton
                label={t('common:edit')}
                onClick={() => setEditMode(true)}
                icon={<PencilIcon className="mr-1 h-5 w-5" />}
              />
              <SecondaryOutlinedButton
                label={t('common:delete')}
                onClick={() => setDeleteConfirmOpen(true)}
                icon={<TrashIcon className="mr-1 h-5 w-5" />}
              />
            </>
          ) : (
            <>
              <PrimaryButton
                label={t('common:save')}
                onClick={save}
                loading={saving}
                icon={<CheckIcon className="mr-1 h-5 w-5" />}
              />
              <PrimaryOutlinedButton
                label={t('common:cancel')}
                onClick={cancel}
                disabled={saving}
                icon={<XMarkIcon className="mr-1 h-5 w-5" />}
              />
            </>
          )}
        </div>
      </div>

      <div className="flex w-full justify-center px-5 py-5">
        <div className="grid w-full max-w-[1440px] grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
            <h2 className="td-panel-title">{t('search:pseudonym.data')}</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                {renderField(
                  'psn',
                  t('search:pseudonym.value'),
                  undefined,
                  false,
                  true
                )}
              </div>
              {renderField('identifier', t('search:pseudonym.id'))}
              {renderField('idType', t('search:pseudonym.idType'))}
              {renderField(
                'validFrom',
                t('search:pseudonym.validFrom'),
                'validFromInherited'
              )}
              {renderField(
                'validTo',
                t('search:pseudonym.validTo'),
                'validToInherited'
              )}
              <div className="md:col-span-2">
                {renderField(
                  'domainName',
                  t('search:pseudonym.group'),
                  undefined,
                  true
                )}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
            <h2 className="td-panel-title">
              {t('search:pseudonym.linkedPseudonyms')}
            </h2>
            <div className="mt-4">
              <PseudonymTable pseudonym={pseudonym} />
            </div>
          </section>
        </div>
      </div>

      <Dialog
        visible={deleteConfirmOpen}
        onHide={() => setDeleteConfirmOpen(false)}
        header={t('search:confirmDeleteTitle')}
        className="w-full max-w-lg"
        dismissableMask={!deleting}
      >
        <div className="space-y-4">
          <p>{t('search:pseudonym.confirmDeleteText')}</p>
          <div className="flex justify-end gap-2">
            <PrimaryOutlinedButton
              label={t('common:cancel')}
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleting}
            />
            <SecondaryOutlinedButton
              label={t('common:delete')}
              onClick={remove}
              loading={deleting}
            />
          </div>
        </div>
      </Dialog>
    </div>
  )
}
