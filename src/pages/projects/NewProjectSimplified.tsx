import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Toast } from 'primereact/toast'
import { useTranslation } from 'react-i18next'

import Panel from '@component/common/Panel'
import PageHeader from '../../core/components/common/PageHeader'
import CustomCalendar from '@component/form/CustomCalendar'
import PrimaryButton from '@component/form/buttons/PrimaryButton'
import SecondaryOutlinedButton from '@component/form/buttons/SecondaryOutlinedButton'
import useProjectInputStore from './stores/InputStore'
import ProjectService from './services/ProjectService'
import useProjectStore from '../../core/stores/ProjectStore'
import { encodeUriName } from '../../core/utils/encodeURIComponent'
import { getHttpStatus } from '../../core/utils/httpErrors'
import type { ProjectType } from './types/ProjectType'

export default function NewProjectSimplified() {
  const toastRef = useRef<Toast>(null)
  const navigate = useNavigate()
  const { setSelectedProject, setJustCreated, setEntities, setEntityAttributes } =
    useProjectStore()
  const { t } = useTranslation(['projects', 'common'])
  const [loading, setLoading] = useState(false)
  const [nameError, setNameError] = useState('')
  const [abbreviationError, setAbbreviationError] = useState('')

  const {
    projectName,
    projectAbbreviation,
    description,
    startDate,
    endDate,
    setProjectName,
    setProjectAbbreviation,
    setDescription,
    setStartDate,
    setEndDate,
    clearProjectInputs
  } = useProjectInputStore()

  useEffect(() => {
    clearProjectInputs()
  }, [clearProjectInputs])

  const getProjectCreationErrorDetail = (error: unknown) => {
    const status = getHttpStatus(error)
    if (status === 403) return t('projects:creationForbiddenDetail')
    if (status === 401) return t('projects:creationExpired')
    if (status === 400 || status === 422)
      return t('projects:creationInvalid')
    if (status && status >= 500) return t('projects:creationBackendError')
    return t('projects:creationFailed')
  }

  const validateRequiredFields = () => {
    const missingName = !projectName.trim()
    const missingAbbreviation = !projectAbbreviation.trim()
    setNameError(missingName ? t('projects:requiredProjectName') : '')
    setAbbreviationError(
      missingAbbreviation ? t('projects:requiredProjectAbbreviation') : ''
    )
    return !missingName && !missingAbbreviation
  }

  async function postProject() {
    if (!validateRequiredFields()) return

    setLoading(true)
    const trimmedName = projectName.trim()
    const trimmedAbbreviation = projectAbbreviation.trim()

    const payload: ProjectType = {
      name: trimmedName,
      abbreviation: trimmedAbbreviation,
      description: description.trim(),
      storeEntities: true,
      storePseudonyms: true,
      ...(startDate ? { startDate: startDate.toISOString() } : {}),
      ...(endDate ? { endDate: endDate.toISOString() } : {})
    }

    const defaultGroup: Record<string, unknown> = {
      name: encodeUriName(trimmedAbbreviation),
      prefix: `${encodeUriName(trimmedAbbreviation)}-`,
      projectAbbreviation: trimmedAbbreviation
    }
    if (startDate) defaultGroup.validFrom = startDate.toISOString()
    if (endDate) defaultGroup.validTo = endDate.toISOString()

    try {
      const createdProject = await ProjectService.postProject(payload)
      await ProjectService.createGroup(defaultGroup)
      toastRef.current?.show({
        severity: 'success',
        summary: t('projects:success'),
        detail: t('projects:projectCreated'),
        life: 2000
      })
      setSelectedProject({
        abbreviation: createdProject.abbreviation,
        name: createdProject.name
      })
      setJustCreated(true)
      setEntities([])
      setEntityAttributes([])
      setTimeout(() => {
        navigate('/domain-management')
      }, 2000)
    } catch (error) {
      console.error(error)
      const status = getHttpStatus(error)
      toastRef.current?.show({
        severity: 'error',
        summary:
          status === 403
            ? t('projects:creationForbidden')
            : t('projects:error'),
        detail: getProjectCreationErrorDetail(error),
        life: 4500
      })
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'h-[44px] w-full rounded-lg border border-color-light-gray bg-white px-3 font-font-text text-xl text-gray-900 outline-none transition focus:border-color-blue focus:ring-1 focus:ring-color-blue dark:bg-slate-900 dark:text-gray-100'

  return (
    <div className="td-page-shell !items-stretch pt-0">
      <PageHeader
        title={t('projects:createNewProject')}
        description={t('projects:createSubtitle')}
      />

      <Panel className="mx-auto w-full max-w-5xl !p-6 md:!p-8">
        <Toast ref={toastRef} />
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="td-field-label mb-1 block">
              {t('projects:projectName')} <span className="text-red-600">*</span>
            </span>
            <input
              id="projectName"
              value={projectName}
              onChange={(event) => {
                setProjectName(event.target.value)
                if (nameError) setNameError('')
              }}
              aria-invalid={Boolean(nameError)}
              className={`${inputClass} ${nameError ? '!border-red-500' : ''}`}
            />
            {nameError && (
              <span className="mt-1 block text-sm font-medium text-red-600">
                {nameError}
              </span>
            )}
          </label>

          <label className="block">
            <span className="td-field-label mb-1 block">
              {t('projects:projectAbbreviation')}{' '}
              <span className="text-red-600">*</span>
            </span>
            <input
              id="projectAbbreviation"
              value={projectAbbreviation}
              onChange={(event) => {
                setProjectAbbreviation(event.target.value)
                if (abbreviationError) setAbbreviationError('')
              }}
              aria-invalid={Boolean(abbreviationError)}
              className={`${inputClass} ${abbreviationError ? '!border-red-500' : ''}`}
            />
            {abbreviationError && (
              <span className="mt-1 block text-sm font-medium text-red-600">
                {abbreviationError}
              </span>
            )}
          </label>

          <label className="block">
            <span className="td-field-label mb-1 block">
              {t('projects:startDateLabel')}
            </span>
            <CustomCalendar
              id="startDate"
              value={startDate}
              onChange={(event) => setStartDate(event.value)}
              dateFormat="dd.mm.yy"
              showTime
              showSeconds
              hourFormat="24"
            />
          </label>

          <label className="block">
            <span className="td-field-label mb-1 block">
              {t('projects:endDateLabel')}
            </span>
            <CustomCalendar
              id="endDate"
              value={endDate}
              onChange={(event) => setEndDate(event.value)}
              dateFormat="dd.mm.yy"
              showTime
              showSeconds
              hourFormat="24"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="td-field-label mb-1 block">
              {t('projects:description')}
            </span>
            <textarea
              id="projectDescription"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
              className="w-full resize-y rounded-lg border border-color-light-gray bg-white px-3 py-2 font-font-text text-xl text-gray-900 outline-none transition focus:border-color-blue focus:ring-1 focus:ring-color-blue dark:bg-slate-900 dark:text-gray-100"
            />
          </label>
        </div>

        <div className="mt-8 flex justify-center gap-3">
          <PrimaryButton
            label={t('projects:createProject')}
            onClick={postProject}
            loading={loading}
          />
          <SecondaryOutlinedButton
            label={t('common:cancel')}
            onClick={() => navigate('/projects')}
            disabled={loading}
          />
        </div>
      </Panel>
    </div>
  )
}
