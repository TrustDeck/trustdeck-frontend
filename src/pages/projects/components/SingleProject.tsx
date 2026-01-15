import Panel from '@component/common/Panel'
import { useNavigate, useLocation } from 'react-router-dom'
import { ProjectType } from '../types/ProjectType'
import { formatDate } from '../../../core/utils/date'
import useProjectStore from '../../../core/stores/ProjectStore'
import ProjectService from '../services/ProjectService'

interface SingleProjectProps {
  project: ProjectType
}

export default function SingleProject({ project }: SingleProjectProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const setSelectedProject = useProjectStore((state) => state.setSelectedProject)
  const setEntities = useProjectStore((state) => state.setEntities)
  const setEntityAttributes = useProjectStore((state) => state.setEntityAttributes)


  async function handleClick() {
    setSelectedProject({ abbreviation: project.abbreviation, name: project.name })
    // TODO: change back to project.entityTypes => currently hardcoded to 'person' and 'biosample'
    setEntities(['person', 'biosample'])
    try {
      const attributes = await ProjectService.getEntityAttributes()
      setEntityAttributes(attributes)
    } catch (error) {
      console.error(error)
    }
    // if redirected to /projects because no project was selected, the user is redirected back to where they were before
    const from = (location.state)?.from?.pathname || '/search'
    navigate(from)
    console.log(project)
  }

  return (
    <Panel onClick={handleClick} className='cursor-pointer hover:bg-gray-100 transition-colors duration-200'>
      <h2 className='my-3'>{project.name}</h2>
      <div className='flex gap-5 my-3' role='button'>
        {project.statistics?.firstPseudonymCreatedAt && <p>{`First pseudonym: ${formatDate(project.statistics.firstPseudonymCreatedAt)}`}</p>}
        {project.statistics?.lastPseudonymCreatedAt && <p>{`Last pseudonym: ${formatDate(project.statistics.lastPseudonymCreatedAt)}`}</p>}
        {project.statistics?.totalSubGroups && <p><strong>{project.statistics.totalSubGroups}</strong> subgroups</p>}
      </div>
    </Panel>
  )
}
