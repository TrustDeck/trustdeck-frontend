import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeftIcon,
  CheckIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Dialog } from 'primereact/dialog'
import PseudonymService from './services/PseudonymService'
import usePseudonymStore from './stores/PseudonymSearchResults'
import PrimaryButton from '../../core/components/form/buttons/PrimaryButton'
import PrimaryOutlinedButton from '../../core/components/form/buttons/PrimaryOutlinedButton'
import SecondaryOutlinedButton from '../../core/components/form/buttons/SecondaryOutlinedButton'
import Panel from '../../core/components/common/Panel'
import Divider from '../../core/components/common/Divider'
import PseudonymTable from './components/PseudonymTable'
import { ProgressSpinner } from 'primereact/progressspinner'
import CustomFloatLabel from '@component/form/CustomFloatLabel'
import TrustDeck, { PseudonymUpdatePayload } from '../../core/services/TrustDeck'
import type { Pseudonym } from '../../core/types/Pseudonym'
import useToastStore from '../../core/stores/ToastStore'

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

function asFormValue(pseudonym: Pseudonym | null | undefined, fallbackDomain = ''): PseudonymForm {
  return {
    domainName: pseudonym?.domainName ?? fallbackDomain,
    psn: pseudonym?.psn ?? '',
    identifier: pseudonym?.identifierItem?.identifier ?? '',
    idType: pseudonym?.identifierItem?.idType ?? '',
    validFrom: pseudonym?.validFrom ?? '',
    validFromInherited: Boolean(pseudonym?.validFromInherited),
    validTo: pseudonym?.validTo ?? '',
    validToInherited: Boolean(pseudonym?.validToInherited)
  }
}

function FieldCard({
  label,
  value,
  mono = false
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="rounded-lg border border-color-light-gray bg-white px-3 py-3 dark:bg-slate-950">
      <div className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </div>
      <div
        className={`break-all text-sm text-gray-900 dark:text-gray-100 ${mono ? 'font-mono' : ''}`}
      >
        {value || '-'}
      </div>
    </div>
  )
}

const PseudonymDetails: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation(['search', 'common'])
  const showToast = useToastStore((state) => state.show)
  const { pseudonymValue, setPseudonymValue, clearPseudonymValue } = usePseudonymStore()
  const { entityId, domainName, pseudonymId } = useParams()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [formData, setFormData] = useState<PseudonymForm>(() =>
    asFormValue(pseudonymValue, domainName)
  )

  const currentPseudonym = pseudonymValue ?? null
  const requestDomain = currentPseudonym?.domainName || domainName || formData.domainName

  useEffect(() => {
    const needsFetch =
      pseudonymId &&
      (!pseudonymValue ||
        pseudonymValue.psn !== pseudonymId ||
        (domainName && pseudonymValue.domainName !== domainName))

    if (needsFetch) {
      setLoading(true)
      async function searchPsn() {
        try {
          const result = await PseudonymService.searchPseudonym(
            pseudonymId!,
            domainName
          )

          if (result) {
            setPseudonymValue(result)
            setFormData(asFormValue(result, domainName))
          } else {
            showToast({
              severity: 'warn',
              summary: t('search:pseudonym.title'),
              detail: t('search:pseudonym.notFound'),
              life: 4000
            })
          }
        } catch (error) {
          console.error('Error during pseudonym fetch:', error)
          showToast({
            severity: 'error',
            summary: t('search:pseudonym.title'),
            detail:
              error instanceof Error
                ? error.message
                : t('search:pseudonym.loadFailed'),
            life: 5000
          })
        } finally {
          setLoading(false)
        }
      }

      searchPsn()
    } else if (pseudonymValue) {
      setFormData(asFormValue(pseudonymValue, domainName))
    }
  }, [domainName, pseudonymValue, pseudonymId, setPseudonymValue, showToast, t])

  const dtoJson = useMemo(
    () => (currentPseudonym ? JSON.stringify(currentPseudonym, null, 2) : ''),
    [currentPseudonym]
  )

  const formatBooleanValue = (value: boolean | undefined) =>
    value ? t('common:yes') : t('common:no')

  const updateForm = (patch: Partial<PseudonymForm>) => {
    setFormData((current) => ({ ...current, ...patch }))
  }

  const handleSave = async () => {
    if (!currentPseudonym || !requestDomain) return

    setSaving(true)
    try {
      const payload: PseudonymUpdatePayload = {
        oldIdentifierItem: currentPseudonym.identifierItem,
        oldPsn: currentPseudonym.psn,
        newIdentifierItem: {
          identifier: formData.identifier,
          idType: formData.idType
        },
        newPsn: formData.psn,
        validFrom: formData.validFrom,
        validFromInherited: formData.validFromInherited,
        validTo: formData.validTo,
        validToInherited: formData.validToInherited,
        newDomainName: formData.domainName
      }

      const updated = await TrustDeck.instance().updatePseudonymComplete(
        requestDomain,
        payload
      )
      setPseudonymValue(updated)
      setFormData(asFormValue(updated, formData.domainName))
      setEditMode(false)
      showToast({
        severity: 'success',
        summary: t('search:pseudonym.title'),
        detail: t('search:pseudonym.updateSuccess'),
        life: 3000
      })

      const updatedDomain = updated.domainName || formData.domainName
      if (updatedDomain && updated.psn) {
        navigate(
          `/search/pseudonym/${encodeURIComponent(updatedDomain)}/${encodeURIComponent(updated.psn)}`,
          { replace: true }
        )
      }
    } catch (error) {
      console.error('Error during pseudonym update:', error)
      showToast({
        severity: 'error',
        summary: t('search:pseudonym.title'),
        detail:
          error instanceof Error
            ? error.message
            : t('search:pseudonym.updateFailed'),
        life: 5000
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!currentPseudonym || !requestDomain) return

    setDeleting(true)
    try {
      await TrustDeck.instance().deletePseudonym(requestDomain, {
        psn: currentPseudonym.psn
      })
      clearPseudonymValue()
      showToast({
        severity: 'success',
        summary: t('search:pseudonym.title'),
        detail: t('search:pseudonym.deleteSuccess'),
        life: 3000
      })
      navigate('/pseudonym-management')
    } catch (error) {
      console.error('Error during pseudonym deletion:', error)
      showToast({
        severity: 'error',
        summary: t('search:pseudonym.title'),
        detail:
          error instanceof Error
            ? error.message
            : t('search:pseudonym.deleteFailed'),
        life: 5000
      })
    } finally {
      setDeleting(false)
      setDeleteConfirmOpen(false)
    }
  }

  const renderField = (
    id: keyof PseudonymForm,
    label: string,
    mono = false
  ) => {
    const value = formData[id]
    if (!editMode || typeof value === 'boolean') {
      return (
        <FieldCard
          label={label}
          value={typeof value === 'boolean' ? formatBooleanValue(value) : String(value ?? '')}
          mono={mono}
        />
      )
    }

    return (
      <CustomFloatLabel
        id={`pseudonym-${id}`}
        value={String(value ?? '')}
        placeholder={label}
        onChange={(event) => updateForm({ [id]: event.target.value })}
      />
    )
  }

  const renderBooleanField = (id: keyof PseudonymForm, label: string) => {
    const checked = Boolean(formData[id])
    if (!editMode) {
      return <FieldCard label={label} value={formatBooleanValue(checked)} />
    }

    return (
      <label className="flex min-h-[44px] items-center gap-3 rounded-lg border border-color-light-gray px-3 text-gray-700 dark:text-gray-200">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => updateForm({ [id]: event.target.checked })}
          className="h-5 w-5 rounded border-gray-300 text-color-blue focus:ring-color-blue"
        />
        <span>{label}</span>
      </label>
    )
  }

  return (
    <div>
      <div className="relative mb-3 flex w-full items-center 2xl:mx-auto 2xl:w-4/5">
        <PrimaryOutlinedButton
          label={<span className="hidden sm:inline">{t('search:back')}</span>}
          onClick={() => navigate(entityId ? `/search/${entityId}` : '/pseudonym-management')}
          icon={<ArrowLeftIcon className="h-5 w-5 mr-1" />}
          className="shrink-0"
        />
        <h1 className="absolute left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          {t('search:pseudonymView')}
        </h1>
      </div>

      {loading && (
        <ProgressSpinner className="flex justify-center items-center" />
      )}

      {!loading && !currentPseudonym && (
        <Panel className="mx-auto" noMaxWidth>
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {t('search:pseudonym.notFound')}
            </h2>
          </div>
        </Panel>
      )}

      {!loading && currentPseudonym && (
        <div className="mx-auto grid w-full grid-cols-1 gap-4 2xl:w-4/5 xl:grid-cols-2">
          <Panel noMaxWidth className="w-full">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2>{t('search:pseudonym.data')}</h2>
                <div className="flex flex-wrap gap-2">
                  {!editMode ? (
                    <>
                      <PrimaryButton
                        label={t('common:edit')}
                        onClick={() => setEditMode(true)}
                        icon={<PencilIcon className="h-5 w-5 mr-1" />}
                      />
                      <SecondaryOutlinedButton
                        label={t('common:delete')}
                        onClick={() => setDeleteConfirmOpen(true)}
                        icon={<TrashIcon className="h-5 w-5 mr-1" />}
                      />
                    </>
                  ) : (
                    <>
                      <PrimaryButton
                        label={t('common:save')}
                        onClick={handleSave}
                        loading={saving}
                        icon={<CheckIcon className="h-5 w-5 mr-1" />}
                      />
                      <PrimaryOutlinedButton
                        label={t('common:cancel')}
                        onClick={() => {
                          setFormData(asFormValue(currentPseudonym, domainName))
                          setEditMode(false)
                        }}
                        disabled={saving}
                        icon={<XMarkIcon className="h-5 w-5 mr-1" />}
                      />
                    </>
                  )}
                </div>
              </div>
              <Divider />

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {renderField('domainName', t('search:pseudonym.group'))}
                {renderField('psn', t('search:pseudonym.value'), true)}
                {renderField('idType', t('search:pseudonym.idType'))}
                {renderField('identifier', t('search:pseudonym.id'), true)}
                {renderField('validFrom', t('search:pseudonym.validFrom'))}
                {renderBooleanField(
                  'validFromInherited',
                  t('search:pseudonym.validFromInherited')
                )}
                {renderField('validTo', t('search:pseudonym.validTo'))}
                {renderBooleanField(
                  'validToInherited',
                  t('search:pseudonym.validToInherited')
                )}
              </div>
            </div>
          </Panel>

          <div className="flex w-full flex-col gap-4">
            <Panel noMaxWidth className="h-fit w-full">
              <h2>{t('search:pseudonym.linkedPseudonyms')}</h2>
              <Divider />
              <PseudonymTable pseudonym={currentPseudonym} />
            </Panel>

            <Panel noMaxWidth className="h-fit w-full">
              <h2>{t('search:pseudonym.dtoPayload')}</h2>
              <Divider />
              <pre className="max-h-80 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-950">
                {dtoJson}
              </pre>
            </Panel>
          </div>
        </div>
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
          <p>{t('search:pseudonym.confirmDeleteText')}</p>
          <div className="flex justify-end gap-2">
            <PrimaryOutlinedButton
              label={t('common:cancel')}
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleting}
            />
            <SecondaryOutlinedButton
              label={t('common:delete')}
              onClick={handleDelete}
              loading={deleting}
            />
          </div>
        </div>
      </Dialog>
    </div>
  )
}

export default PseudonymDetails
