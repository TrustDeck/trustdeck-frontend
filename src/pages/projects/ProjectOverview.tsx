import { useState, useEffect, useMemo } from 'react'
import SingleProject from './components/SingleProject'
import ProjectService from './services/ProjectService'
import { ProjectType } from './types/ProjectType'
import CustomDropdown from '@component/form/CustomDropdown'
import CustomFloatLabel from '../../core/components/form/CustomFloatLabel'
import { useTranslation } from 'react-i18next'
import PrimaryButton from '@component/form/buttons/PrimaryButton'
import { useNavigate } from 'react-router-dom'
import { ProgressSpinner } from 'primereact/progressspinner'

export default function ProjectOverview() {
  const [projects, setProjects] = useState<ProjectType[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [projectStatus, setProjectStatus] = useState<'all' | 'active' | 'completed'>('all')
  const [dateOrder, setDateOrder] = useState<'newest' | 'oldest'>('newest')
  const [searchTerm, setSearchTerm] = useState('')
  const { t } = useTranslation()
  const navigate = useNavigate()

  useEffect(() => {
    let isMounted = true
    const fetchProjects = async () => {
      try {
        const data = await ProjectService.getProjects()
        const uniqueProjects = Array.from(
          new Map(data.map((project) => [project.abbreviation, project])).values()
        )
        if (isMounted) setProjects(uniqueProjects)
      } catch (e) {
        console.error('Failed to load projects', e)
        if (isMounted) setProjects([])
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    fetchProjects()
    return () => {
      isMounted = false
    }
  }, [])

  const filteredProjects = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()
    return projects
      .filter((project) => {
        if (projectStatus === 'all') return true
        const isActive = new Date(project.endDate) > new Date()
        return projectStatus === 'active' ? isActive : !isActive
      })
      .filter((project) => {
        if (!search) return true
        return [project.name, project.abbreviation, project.description]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search))
      })
      .sort((a, b) => {
        const left = new Date(a.startDate).getTime()
        const right = new Date(b.startDate).getTime()
        return dateOrder === 'newest' ? right - left : left - right
      })
  }, [dateOrder, projectStatus, projects, searchTerm])

  return (
    <div className="w-full">
      <div className="mb-6 flex w-full flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
          <p className="mt-1 text-sm text-gray-500">Select a project or create a new one.</p>
        </div>
        <PrimaryButton label="New project" onClick={() => navigate('/projects/new')} />
      </div>

      {isLoading ? (
        <div className="w-full flex justify-center py-10">
          <ProgressSpinner />
        </div>
      ) : (
        <>
          {projects.length > 0 && (
            <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-gray-900">Filter projects</h2>
                  <p className="text-sm text-gray-500">Narrow the list by name, status, or start date.</p>
                </div>
                <button
                  type="button"
                  className="text-sm font-medium text-color-blue hover:underline"
                  onClick={() => {
                    setSearchTerm('')
                    setProjectStatus('all')
                    setDateOrder('newest')
                  }}
                >
                  Reset
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <CustomFloatLabel
                  id="projectSearch"
                  value={searchTerm}
                  placeholder="Search projects"
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
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
            </div>
          )}

          <div className="flex w-full flex-col items-center gap-6 mb-12">
            {filteredProjects.map((project) => (
              <SingleProject key={project.abbreviation} project={project} />
            ))}
          </div>

          {projects.length === 0 && (
            <div className="mx-auto mt-20 max-w-2xl rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900">No projects available</h2>
              <p className="mt-3 text-gray-600">{t('projects:noProjects')}</p>
              <div className="mt-6 flex justify-center">
                <PrimaryButton label="Create new project" onClick={() => navigate('/projects/new')} />
              </div>
            </div>
          )}

          {projects.length > 0 && filteredProjects.length === 0 && (
            <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-6 text-center text-gray-600">
              No projects match the current filters.
            </div>
          )}
        </>
      )}
    </div>
  )
}
