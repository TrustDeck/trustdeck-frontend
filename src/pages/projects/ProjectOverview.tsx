import { useState, useEffect } from 'react'
import SingleProject from './components/SingleProject'
import ProjectService from './services/ProjectService'
import { ProjectType } from './types/ProjectType'
import CustomDropdown from '@component/form/CustomDropdown'
import { useTranslation } from 'react-i18next'
import PrimaryButton from '@component/form/buttons/PrimaryButton'
import { useNavigate } from 'react-router-dom'

export default function ProjectOverview() {
  const [projects, setProjects] = useState<ProjectType[]>([])
  const [projectStatus, setProjectStatus] = useState<
    'all' | 'active' | 'completed'
  >('all')
  const [dateOrder, setDateOrder] = useState<'newest' | 'oldest' | ''>('')
  const { t } = useTranslation()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await ProjectService.getProjects()
        setProjects(data)
      } catch (e) {
        console.error('Failed to load projects', e)
        setProjects([])
      }
    }
    fetchProjects()
  }, [])

  const filteredProjects = projects
    .filter((project) => {
      if (projectStatus === 'all') return true
      const isActive = new Date(project.endDate) > new Date()
      return projectStatus === 'active' ? isActive : !isActive
    })
    .sort((a, b) => {
      if (dateOrder === 'newest') {
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      } else {
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      }
    })

  return (
    <div className="w-full">
      <div className="flex w-full flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex flex-nowrap gap-4 min-w-[320px]">
          <CustomDropdown
            id="projectStatus"
            placeholder="Project status"
            value={projectStatus}
            onChange={(e) => setProjectStatus(e.value)}
            options={[
              { label: t('projects:all'), value: 'all' },
              { label: t('projects:active'), value: 'active' },
              { label: t('projects:completed'), value: 'completed' }
            ]}
          />
          <CustomDropdown
            id="dateOrder"
            placeholder="Sort order"
            value={dateOrder}
            onChange={(e) => setDateOrder(e.value)}
            options={[
              { label: t('projects:newestFirst'), value: 'newest' },
              { label: t('search:oldestFirst'), value: 'oldest' }
            ]}
          />
        </div>
        <PrimaryButton
          label={'New project'}
          onClick={() => navigate('/projects/new')}
        />
      </div>
      <div className="flex w-full flex-col gap-6 items-center">
        {filteredProjects.map((project) => (
          <SingleProject key={project.abbreviation} project={project} />
        ))}
      </div>
    </div>
  )
}
