import { useEffect, useState } from 'react'
import {
  ArrowLeftIcon,
  ArrowPathRoundedSquareIcon,
  CheckIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Dialog } from 'primereact/dialog'
import { ProgressSpinner } from 'primereact/progressspinner'
import PseudonymService from './services/PseudonymService'
import usePseudonymStore from './stores/PseudonymSearchResults'
import PrimaryButton from '../../core/components/form/buttons/PrimaryButton'
import PrimaryOutlinedButton from '../../core/components/form/buttons/PrimaryOutlinedButton'
import SecondaryOutlinedButton from '../../core/components/form/buttons/SecondaryOutlinedButton'
import Divider from '../../core/components/common/Divider'
import PseudonymTable from './components/PseudonymTable'
import CustomFloatLabel from '@component/form/CustomFloatLabel'
import TrustDeck, {
  PseudonymUpdatePayload
} from '../../core/services/TrustDeck'
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

type PseudonymTextField = Exclude<
  keyof PseudonymForm,
  'validFromInherited' | 'validToInherited'
>

type PseudonymInheritanceField = Extract<
  keyof PseudonymForm,
  'validFromInherited' | 'validToInherited'
>

type PseudonymLocationState = {
  returnTo?: string
} | null

function asFormValue(
  pseudonym: Pseudonym | null | undefined,
  fallbackDomain = ''
): PseudonymForm {
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
  inherited = false,
  inheritedTooltip
}: {
  label: string
  value: string
  inherited?: boolean
  inheritedTooltip?: string
}) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 ${
        inherited
          ? 'border-blue-200 bg-blue-50/70 ring-1 ring-blue-100 dark:border-blue-800 dark:bg-blue-950/30'
          : 'border-color-light-gray bg-white dark:bg-slate-950'
      }`}
    >
      <div
        className={`mb-1 flex items-center gap-1 text-base font-semibold ${
          inherited
            ? 'text-blue-700 dark:text-blue-300'
            : 'text-gray-600 dark:text-gray-300'
        }`}
      >
        <span>{label}</span>
        {inherited && (
          <span title={inheritedTooltip} aria-label={inheritedTooltip}>
            <ArrowPathRoundedSquareIcon className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="break-all text-xl text-gray-900 dark:text-gray-100">
        {value || '-'}
      </div>
    </div>
  )
}

const PseudonymDetails: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation(['search', 'common'])
  const showToast = useToastStore((state) => state.show)
  const { pseudonymValue, setPseudonymValue, clearPseudonymValue } =
    usePseudonymStore()
  const { entityId, domainName, pseudonymId } = useParams()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [formData, setFormData] = useState<PseudonymForm>(() =>
    asFormValue(pseudonymValue, domainName)
  )

  const locationState = location.state as PseudonymLocationState
  const returnTo =
    typeof locationState?.returnTo === 'string' ? locationState.returnTo : ''
  const currentPseudonym = pseudonymValue ?? null
  const requestDomain =
    currentPseudonym?.domainName || domainName || formData.domainName
  const inheritanceTooltip = t(
    'search:pseudonym.inheritedTooltip',
    'Inherited from the group configuration.'
  )

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

  const originalForm = asFormValue(currentPseudonym, domainName)

  const updateEditableField = (
    id: PseudonymTextField,
    value: string,
    inheritedField?: PseudonymInheritanceField
  ) => {
    setFormData((current) => {
      const patch: Partial<PseudonymForm> = {
        [id]: value
      } as Partial<PseudonymForm>

      if (inheritedField) {
        patch[inheritedField] = Boolean(
          originalForm[inheritedField] && value === originalForm[id]
        )
      }

      return { ...current, ...patch }
    })
  }

  const resetEditState = () => {
    setFormData(asFormValue(currentPseudonym, domainName))
    setEditMode(false)
  }

  const handleBack = () => {
    if (returnTo) {
      navigate(returnTo)
      return
    }

    if (entityId) {
      navigate(`/search/${encodeURIComponent(entityId)}`)
      return
    }

    navigate('/pseudonym-management')
  }

  const handleSave = async () => {
    if (!currentPseudonym || !requestDomain) return

    const identifierChanged = formData.identifier !== originalForm.identifier
    const idTypeChanged = formData.idType !== originalForm.idType
    const psnChanged = formData.psn !== originalForm.psn
    const validFromChanged =
      formData.validFrom !== originalForm.validFrom ||
      formData.validFromInherited !== originalForm.validFromInherited
    const validToChanged =
      formData.validTo !== originalForm.validTo ||
      formData.validToInherited !== originalForm.validToInherited

    if (
      !identifierChanged &&
      !idTypeChanged &&
      !psnChanged &&
      !validFromChanged &&
      !validToChanged
    ) {
      setEditMode(false)
      return
    }

    setSaving(true)
    try {
      const payload: PseudonymUpdatePayload = {
        oldIdentifierItem: currentPseudonym.identifierItem,
        oldPsn: currentPseudonym.psn
      }

      if (identifierChanged || idTypeChanged) {
        payload.newIdentifierItem = {
          identifier: formData.identifier,
          idType: formData.idType
        }
      }

      if (psnChanged) {
        payload.newPsn = formData.psn
      }

      if (validFromChanged) {
        payload.validFrom = formData.validFrom
        payload.validFromInherited = formData.validFromInherited
      }

      if (validToChanged) {
        payload.validTo = formData.validTo
        payload.validToInherited = formData.validToInherited
      }

      const updated = await TrustDeck.instance().updatePseudonymComplete(
        requestDomain,
        payload
      )
      setPseudonymValue(updated)
      setFormData(asFormValue(updated, requestDomain))
      setEditMode(false)
      showToast({
        severity: 'success',
        summary: t('search:pseudonym.title'),
        detail: t('search:pseudonym.updateSuccess'),
        life: 3000
      })

      const updatedDomain = updated.domainName || requestDomain
      if (updatedDomain && updated.psn) {
        navigate(
          `/search/pseudonym/${encodeURIComponent(updatedDomain)}/${encodeURIComponent(updated.psn)}`,
          {
            replace: true,
            state: returnTo ? { returnTo } : undefined
          }
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
      navigate(returnTo || '/pseudonym-management')
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
    id: PseudonymTextField,
    label: string,
    inheritedField?: PseudonymInheritanceField,
    readOnly = false
  ) => {
    const value = formData[id]
    const inherited = inheritedField ? Boolean(formData[inheritedField]) : false

    if (!editMode || readOnly) {
      return (
        <FieldCard
          label={label}
          value={String(value ?? '')}
          inherited={inherited}
          inheritedTooltip={inheritanceTooltip}
        />
      )
    }

    return (
      <div
        className={`relative rounded-lg border px-4 py-3 ${
          inherited
            ? 'border-blue-200 bg-blue-50/70 ring-1 ring-blue-100 dark:border-blue-800 dark:bg-blue-950/30'
            : 'border-color-light-gray bg-white dark:bg-slate-950'
        }`}
      >
        {inherited && (
          <span
            title={inheritanceTooltip}
            aria-label={inheritanceTooltip}
            className="absolute right-3 top-3 text-blue-700 dark:text-blue-300"
          >
            <ArrowPathRoundedSquareIcon className="h-4 w-4" />
          </span>
        )}
        <CustomFloatLabel
          id={`pseudonym-${id}`}
          value={String(value ?? '')}
          placeholder={label}
          onChange={(event) =>
            updateEditableField(id, event.target.value, inheritedField)
          }
        />
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="relative mb-4 flex w-full items-center 2xl:mx-auto 2xl:w-4/5">
        <PrimaryOutlinedButton
          label={<span className="hidden sm:inline">{t('search:back')}</span>}
          onClick={handleBack}
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
        <div className="mx-auto w-full max-w-[720px]">
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {t('search:pseudonym.notFound')}
            </h2>
          </div>
        </div>
      )}

      {!loading && currentPseudonym && (
        <div className="flex w-full justify-center px-4">
          <div className="flex w-full max-w-[1040px] flex-col items-start justify-center gap-6 xl:flex-row">
            <section className="w-full max-w-[560px] shrink-0 rounded-lg border border-gray-100 bg-white px-6 py-4 shadow-lg dark:border-slate-700 dark:bg-slate-800">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-3xl font-semibold">
                    {t('search:pseudonym.data')}
                  </h2>
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
                          onClick={resetEditState}
                          disabled={saving}
                          icon={<XMarkIcon className="h-5 w-5 mr-1" />}
                        />
                      </>
                    )}
                  </div>
                </div>
                <Divider />

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {renderField(
                    'domainName',
                    t('search:pseudonym.group'),
                    undefined,
                    true
                  )}
                  {renderField('psn', t('search:pseudonym.value'))}
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
                </div>
              </div>
            </section>

            <section className="h-fit w-full max-w-[440px] shrink-0 rounded-lg border border-gray-100 bg-white px-6 py-4 shadow-lg dark:border-slate-700 dark:bg-slate-800">
              <h2 className="text-3xl font-semibold">
                {t('search:pseudonym.linkedPseudonyms')}
              </h2>
              <Divider />
              <PseudonymTable pseudonym={currentPseudonym} />
            </section>
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
          <p className="text-lg">{t('search:pseudonym.confirmDeleteText')}</p>
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
