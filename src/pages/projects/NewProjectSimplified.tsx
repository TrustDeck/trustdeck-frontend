import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Panel from '@component/common/Panel'
import CustomFloatLabel from '../../core/components/form/CustomFloatLabel'
import CustomCalendar from '@component/form/CustomCalendar'
import useProjectInputStore from './stores/InputStore'
import PrimaryButton from '@component/form/buttons/PrimaryButton'
import { useTranslation } from 'react-i18next'
import ProjectService from './services/ProjectService'
import { Toast } from 'primereact/toast'
import useProjectStore from '../../core/stores/ProjectStore'
import {encodeUriName} from "../../core/utils/encodeURIComponent";
import { getHttpStatus } from '../../core/utils/httpErrors'

export default function NewProjectSimplified() {
  const toastRef = useRef<Toast>(null)
  const navigate = useNavigate()
  const { setSelectedProject, setJustCreated, setEntities, setEntityAttributes } =
    useProjectStore()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)


  const getProjectCreationErrorDetail = (error: unknown) => {
    const status = getHttpStatus(error)
    if (status === 403) return t('projects:creationForbiddenDetail')
    if (status === 401) return t('projects:creationExpired')
    if (status === 400 || status === 422) return t('projects:creationInvalid')
    if (status && status >= 500) return t('projects:creationBackendError')
    return t('projects:creationFailed')
  }

  const {
    projectName,
    projectAbbreviation,
    startDate,
    endDate,
    setProjectName,
    setProjectAbbreviation,
    setStartDate,
    setEndDate,
    clearProjectInputs
  } = useProjectInputStore()

  useEffect(() => {
    clearProjectInputs()
  }, [clearProjectInputs])

  async function postProject() {
    setLoading(true)
    const resolvedStartDate = startDate ?? new Date()
    const resolvedEndDate = endDate ?? new Date(resolvedStartDate.getTime() + 1000 * 60 * 60 * 24 * 365 * 10)
    const payload = {
      name: projectName,
      abbreviation: projectAbbreviation,
      startDate: resolvedStartDate.toISOString(),
      endDate: resolvedEndDate.toISOString(),
      storeEntities: true,
      storePseudonyms: true
    }

    //TODO: refactor this to object
    const defaultGroup = {
      name: encodeUriName(projectAbbreviation),
      prefix: `${encodeUriName(projectAbbreviation)}-`,
      validFrom: resolvedStartDate.toISOString(),
      validTo: resolvedEndDate.toISOString(),
    }

    try {
      const createdProject = await ProjectService.postProject(payload)

      //TODO change this later to create groups in groumanager until they work in entitites
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
        navigate('/group-management')
      }, 2000)
    } catch (error) {
      console.error(error)
      const status = getHttpStatus(error)
      toastRef.current?.show({
        severity: 'error',
        summary: status === 403 ? t('projects:creationForbidden') : t('projects:error'),
        detail: getProjectCreationErrorDetail(error),
        life: 4500
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex justify-center items-center w-full min-h-screen">
      <Panel title={t('projects:createNewProject')} centered>
        <Toast ref={toastRef} />
        <div className="sm:form-grid sm:space-y-0 space-y-3 mt-4">
          <CustomFloatLabel
            id="projectName"
            value={projectName}
            placeholder={t('projects:projectName')}
            onChange={(e) => setProjectName(e.target.value)}
          />
          <CustomFloatLabel
            id="projectAbbreviation"
            value={projectAbbreviation}
            placeholder={t('projects:projectAbbreviation')}
            onChange={(e) => setProjectAbbreviation(e.target.value)}
          />
          <CustomCalendar
            id="startDate"
            placeholder={t('projects:startDate')}
            value={startDate}
            onChange={(e) => setStartDate(e.value)}
            showTime
          />
          <CustomCalendar
            id="endDate"
            placeholder={t('projects:endDate')}
            value={endDate}
            onChange={(e) => setEndDate(e.value)}
            showTime
          />
        </div>
        <div className="flex justify-end mt-4">
          <PrimaryButton
            label={t('projects:createProject')}
            onClick={postProject}
            loading={loading}
          />
        </div>
      </Panel>
    </div>
  )
}
