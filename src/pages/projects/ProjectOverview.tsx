import { useState, useEffect } from 'react'
import SingleProject from './components/SingleProject'
import ProjectService from './services/ProjectService'
import { ProjectType } from './types/ProjectType'
import CustomDropdown from '@component/form/CustomDropdown'
import { useTranslation } from 'react-i18next'
import PrimaryButton from '@component/form/buttons/PrimaryButton'
import { useNavigate } from 'react-router-dom'
import { ProgressSpinner } from 'primereact/progressspinner'

export default function ProjectOverview() {
  const [projects, setProjects] = useState<ProjectType[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [projectStatus, setProjectStatus] = useState<
    'all' | 'active' | 'completed'
  >('all')
  const [dateOrder, setDateOrder] = useState<'newest' | 'oldest' | ''>('')
  const { t } = useTranslation()
  const navigate = useNavigate()

  useEffect(() => {
    let isMounted = true
    const fetchProjects = async () => {
      try {
        const data = await ProjectService.getProjects()
        // makes sure no duplicate projects are added
        const uniqueProjects = Array.from(
          new Map(data.map((project) => [project.abbreviation, project])).values()
        )
        if (isMounted) {
          setProjects(uniqueProjects)
        }
      } catch (e) {
        console.error('Failed to load projects', e)
        if (isMounted) {
          setProjects([])
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }
    fetchProjects()
    return () => {
      isMounted = false
    }
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
            placeholder={t('projects:projectStatus')}
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
            placeholder={t('projects:sortOrder')}
            value={dateOrder}
            onChange={(e) => setDateOrder(e.value)}
            options={[
              { label: t('projects:newestFirst'), value: 'newest' },
              { label: t('projects:oldestFirst'), value: 'oldest' }
            ]}
          />
        </div>
        <PrimaryButton
          label={'New project'}
          onClick={() => navigate('/projects/new')}
        />
      </div>
      {isLoading ? (
        <div className="w-full flex justify-center py-10">
          <ProgressSpinner />
        </div>
      ) : (
        <>
          <div className="flex w-full flex-col gap-6 items-center">
            {filteredProjects.map((project) => (
              <SingleProject key={project.abbreviation} project={project} />
            ))}
          </div>
          {projects.length === 0 && (
            <div className="flex flex-col h-full">
              <div className="flex justify-center w-full flex-1 items-center text-center">
                <h3>
                  {t('projects:noProjects')}
                </h3>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
