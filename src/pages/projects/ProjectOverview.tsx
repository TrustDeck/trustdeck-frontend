import { useState, useEffect, useMemo } from 'react'
import SingleProject from './components/SingleProject'
import ProjectService from './services/ProjectService'
import { ProjectType } from './types/ProjectType'
import CustomDropdown from '@component/form/CustomDropdown'
import CustomFloatLabel from '../../core/components/form/CustomFloatLabel'
import CustomCalendar from '@component/form/CustomCalendar'
import { useTranslation } from 'react-i18next'
import PrimaryButton from '@component/form/buttons/PrimaryButton'
import SecondaryOutlinedButton from '@component/form/buttons/SecondaryOutlinedButton'
import { useNavigate } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { ProgressSpinner } from 'primereact/progressspinner'
import { Dialog } from 'primereact/dialog'
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'
import useToastStore from '../../core/stores/ToastStore'
import useUserStore from '../../core/stores/UserStore'

type ProjectFormState = {
  name: string
  description: string
  startDate: Date | null
  endDate: Date | null
}

function toDate(value?: string) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export default function ProjectOverview() {
  const [projects, setProjects] = useState<ProjectType[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [projectStatus, setProjectStatus] = useState<'all' | 'active' | 'completed'>('all')
  const [dateOrder, setDateOrder] = useState<'newest' | 'oldest'>('newest')
  const [searchTerm, setSearchTerm] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectType | null>(null)
  const [deletingProject, setDeletingProject] = useState<ProjectType | null>(null)
  const [formState, setFormState] = useState<ProjectFormState>({
    name: '',
    description: '',
    startDate: null,
    endDate: null
  })
  const [savingProject, setSavingProject] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { t } = useTranslation()
  const navigate = useNavigate()
  const auth = useAuth()
  const isAuthenticated = useUserStore((state) => state.isAuthenticated)
  const showToast = useToastStore((state) => state.show)

  useEffect(() => {
    let isMounted = true
    const accessTokenReady = Boolean(auth.user?.access_token || isAuthenticated)

    if (!accessTokenReady) {
      setIsLoading(true)
      return () => {
        isMounted = false
      }
    }

    const fetchProjects = async () => {
      try {
        setIsLoading(true)
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
  }, [auth.user?.access_token, isAuthenticated])

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

  const activeFilterCount = [
    searchTerm.trim() !== '',
    projectStatus !== 'all',
    dateOrder !== 'newest'
  ].filter(Boolean).length

  const resetFilters = () => {
    setSearchTerm('')
    setProjectStatus('all')
    setDateOrder('newest')
  }

  const openEditDialog = (project: ProjectType) => {
    setEditingProject(project)
    setFormState({
      name: project.name ?? '',
      description: project.description ?? '',
      startDate: toDate(project.startDate),
      endDate: toDate(project.endDate)
    })
  }

  const handleUpdateProject = async () => {
    if (!editingProject) return
    try {
      setSavingProject(true)
      const payload: ProjectType = {
        ...editingProject,
        name: formState.name.trim(),
        description: formState.description.trim(),
        startDate: (formState.startDate ?? toDate(editingProject.startDate) ?? new Date()).toISOString(),
        endDate: (formState.endDate ?? toDate(editingProject.endDate) ?? new Date()).toISOString()
      }
      const updatedProject = await ProjectService.updateProject(payload, editingProject.abbreviation)
      setProjects((prev) =>
        prev.map((project) =>
          project.abbreviation === editingProject.abbreviation ? updatedProject : project
        )
      )
      setEditingProject(null)
      showToast({
        severity: 'success',
        summary: 'Project updated',
        detail: `${payload.name} was updated successfully.`,
        life: 2500
      })
    } catch (error) {
      console.error('Failed to update project', error)
      showToast({
        severity: 'error',
        summary: 'Update failed',
        detail: 'The project could not be updated.',
        life: 3500
      })
    } finally {
      setSavingProject(false)
    }
  }

  const handleDeleteProject = async () => {
    if (!deletingProject) return
    try {
      setDeleting(true)
      await ProjectService.deleteProject(deletingProject.abbreviation)
      setProjects((prev) =>
        prev.filter((project) => project.abbreviation !== deletingProject.abbreviation)
      )
      showToast({
        severity: 'success',
        summary: 'Project deleted',
        detail: `${deletingProject.name} was deleted.`,
        life: 2500
      })
      setDeletingProject(null)
      setEditingProject(null)
    } catch (error) {
      console.error('Failed to delete project', error)
      showToast({
        severity: 'error',
        summary: 'Delete failed',
        detail: 'The project could not be deleted.',
        life: 3500
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="w-full pb-24">
      <div className="mb-6 flex w-full flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
          <p className="mt-1 text-sm text-gray-500">Select a project to continue.</p>
        </div>
        {projects.length > 0 && !isLoading && (
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-color-blue hover:text-color-blue"
            aria-expanded={filtersOpen}
          >
            <FunnelIcon className="h-5 w-5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-color-blue px-2 py-0.5 text-xs text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="w-full flex justify-center py-10">
          <ProgressSpinner />
        </div>
      ) : (
        <>
          {projects.length > 0 && filtersOpen && (
            <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-gray-900">Filter projects</h2>
                  <p className="text-sm text-gray-500">Narrow the list by name, status, or start date.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="reset-filter-button text-sm font-medium text-color-blue hover:underline"
                    onClick={resetFilters}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    onClick={() => setFiltersOpen(false)}
                    aria-label="Collapse filters"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
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

          <div className="flex w-full flex-col items-center gap-6 mb-8">
            {filteredProjects.map((project) => (
              <SingleProject
                key={project.abbreviation}
                project={project}
                permissionsReady
                canUpdate
                canDelete
                onEdit={openEditDialog}
                onDelete={setDeletingProject}
              />
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

          {projects.length > 0 && (
            <div className="sticky bottom-0 z-30 -mx-4 mt-8 border-t border-gray-200 bg-surface/95 px-4 py-3 backdrop-blur">
              <div className="mx-auto flex max-w-7xl justify-end">
                <PrimaryButton label="New project" onClick={() => navigate('/projects/new')} />
              </div>
            </div>
          )}
        </>
      )}

      <Dialog
        header="Project details"
        visible={Boolean(editingProject)}
        onHide={() => setEditingProject(null)}
        modal
        className="w-full max-w-2xl"
      >
        <div className="space-y-4 pt-2">
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
            <div>Project abbreviation: <span className="font-semibold text-gray-800">{editingProject?.abbreviation}</span></div>
            <div className="mt-1 text-xs text-gray-500">You can review the current settings here. The backend will verify whether your account may save changes or delete this project.</div>
          </div>
          <CustomFloatLabel
            id="editProjectName"
            value={formState.name}
            placeholder="Project name"
            onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
          />
          <textarea
            value={formState.description}
            onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Description"
            className="min-h-28 w-full rounded-lg border border-color-light-gray bg-white p-3 font-font-text text-base focus:border-color-blue focus:outline-none"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <CustomCalendar
              id="editStartDate"
              placeholder="Start date"
              value={formState.startDate}
              onChange={(e) => setFormState((prev) => ({ ...prev, startDate: e.value }))}
              showTime
            />
            <CustomCalendar
              id="editEndDate"
              placeholder="End date"
              value={formState.endDate}
              onChange={(e) => setFormState((prev) => ({ ...prev, endDate: e.value }))}
              showTime
            />
          </div>
          <div className="flex flex-wrap justify-between gap-2 pt-2">
            <button
              type="button"
              className="rounded-lg border border-color-coral px-4 py-2 text-sm font-semibold text-color-coral transition hover:bg-color-coral hover:text-white"
              onClick={() => {
                if (editingProject) {
                  setDeletingProject(editingProject)
                  setEditingProject(null)
                }
              }}
            >
              Delete project
            </button>
            <div className="flex gap-2">
              <SecondaryOutlinedButton label="Cancel" onClick={() => setEditingProject(null)} />
              <PrimaryButton
                label="Save changes"
                loading={savingProject}
                disabled={!formState.name.trim() || !formState.startDate || !formState.endDate}
                onClick={handleUpdateProject}
              />
            </div>
          </div>
        </div>
      </Dialog>

      <Dialog
        header="Delete project"
        visible={Boolean(deletingProject)}
        onHide={() => setDeletingProject(null)}
        modal
        className="w-full max-w-lg"
      >
        <div className="space-y-4 pt-2">
          <p>
            Are you sure you want to permanently delete{' '}
            <strong>{deletingProject?.name}</strong>?
          </p>
          <p className="text-sm text-gray-500">This action cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <SecondaryOutlinedButton label="Cancel" onClick={() => setDeletingProject(null)} />
            <PrimaryButton
              label="Delete project"
              loading={deleting}
              onClick={handleDeleteProject}
              className="bg-color-coral hover:bg-color-coral/80 border-color-coral"
            />
          </div>
        </div>
      </Dialog>
    </div>
  )
}
