import { useRef, useState } from 'react'
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

export default function NewProjectSimplified() {
  const toastRef = useRef<Toast>(null)
  const navigate = useNavigate()
  const { setSelectedProject, setJustCreated } = useProjectStore()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  const {
    projectName,
    projectAbbreviation,
    startDate,
    endDate,
    setProjectName,
    setProjectAbbreviation,
    setStartDate,
    setEndDate
  } = useProjectInputStore()

  async function postProject() {
    setLoading(true)
    const payload = {
      name: projectName,
      abbreviation: projectAbbreviation,
      startDate: startDate ? startDate.toISOString() : 'test',
      endDate: endDate ? endDate.toISOString() : 'test',
    }

    //TODO: refactor this to object
    const defaultGroup = {
      name: encodeUriName(projectAbbreviation),
      prefix: `${encodeUriName(projectAbbreviation)}-`,
      validFrom: startDate ?? null,
      validTo: endDate ?? null,
    }

    try {
      const createdProject = await ProjectService.postProject(payload)

      //TODO change this later to create groups in groumanager until they work in entitites
      console.log(createdProject)
      const group = await ProjectService.createGroup(defaultGroup)
      console.log(group)
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
      setTimeout(() => {
        navigate('/group-management')
      }, 2000)
    } catch (error) {
      console.error(error)
      toastRef.current?.show({
        severity: 'error',
        summary: t('projects:error'),
        detail: t('projects:creationFailed'),
        life: 3000
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex justify-center items-center w-full min-h-screen">
      <Panel title={t('projects:createNewProject')} centered>
        <Toast ref={toastRef} />
        <div className="sm:form-grid sm:space-y-0 space-y-3">
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
          />
          <CustomCalendar
            id="endDate"
            placeholder={t('projects:endDate')}
            value={endDate}
            onChange={(e) => setEndDate(e.value)}
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
