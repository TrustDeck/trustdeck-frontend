import Panel from '@component/common/Panel'
import { useNavigate, useLocation } from 'react-router-dom'
import { ProjectType } from '../types/ProjectType'
import { formatDate } from '../../../core/utils/date'
import useProjectStore from '../../../core/stores/ProjectStore'
import ProjectService from '../services/ProjectService'
import { useTranslation } from 'react-i18next'

interface SingleProjectProps {
  project: ProjectType
}

export default function SingleProject({ project }: SingleProjectProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const setSelectedProject = useProjectStore(
    (state) => state.setSelectedProject
  )
  const setProjectImage = useProjectStore((state) => state.setProjectImage)
  const setEntities = useProjectStore((state) => state.setEntities)
  const setEntityAttributes = useProjectStore(
    (state) => state.setEntityAttributes
  )
  const { t } = useTranslation()

  async function handleClick() {
    setSelectedProject({
      abbreviation: project.abbreviation,
      name: project.name
    })

    try {
      const image = await ProjectService.getProjectImage()
      setProjectImage(image)
    } catch (error) {
      console.warn('Failed to load project image', error)
      setProjectImage(undefined)
    }

    try {
      const projectEntities = await ProjectService.getProjectEntities()
      setEntities(projectEntities)
    } catch (error) {
      console.error('Failed to load project entities', error)
      setEntities([])
    }

    try {
      const attributes = await ProjectService.getEntityAttributes()
      setEntityAttributes(attributes)
    } catch (error) {
      console.error(error)
    }

    // redirect back to previous page if needed
    const from = location.state?.from?.pathname || '/search'
    navigate(from)
    console.log(project)
  }

  return (
    <Panel
      onClick={handleClick}
      className="cursor-pointer hover:bg-gray-100 transition-colors duration-200"
    >
      <h2 className="my-3">{project.name}</h2>
      <div className="flex gap-5 my-3" role="button">
        {project?.startDate && (
          <p>{`${t('projects:startDate')} ${formatDate(project.startDate)}`}</p>
        )}
        {project?.endDate && (
          <p>{`${t('projects:endDate')} ${formatDate(project.endDate)}`}</p>
        )}
        {project.statistics?.totalSubGroups && (
          <p>
            <strong>{project.statistics.totalSubGroups}</strong> subgroups
          </p>
        )}
      </div>
    </Panel>
  )
}
