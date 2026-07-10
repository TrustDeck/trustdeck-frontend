import { useState, useEffect, useMemo } from 'react'
import SingleProject from './components/SingleProject'
import ProjectService from './services/ProjectService'
import TrustDeck from '../../core/services/TrustDeck'
import { ProjectType } from './types/ProjectType'
import CustomDropdown from '@component/form/CustomDropdown'
import CustomFloatLabel from '../../core/components/form/CustomFloatLabel'
import { useTranslation } from 'react-i18next'
import PrimaryButton from '@component/form/buttons/PrimaryButton'
import SecondaryOutlinedButton from '@component/form/buttons/SecondaryOutlinedButton'
import { useNavigate } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { ProgressSpinner } from 'primereact/progressspinner'
import { Dialog } from 'primereact/dialog'
import { FunnelIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import useToastStore from '../../core/stores/ToastStore'
import useUserStore from '../../core/stores/UserStore'
import useProjectStore from '../../core/stores/ProjectStore'
import {
  CachedUserAccess,
  canManageProject,
  getCurrentUserAccess
} from '../../core/services/PermissionCache'
import PageHeader from '../../core/components/common/PageHeader'

export default function ProjectOverview() {
  const [projects, setProjects] = useState<ProjectType[]>([])
  const [projectImages, setProjectImages] = useState<
    Record<string, string | undefined>
  >({})
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [projectStatus, setProjectStatus] = useState<
    'all' | 'active' | 'completed'
  >('all')
  const [dateOrder, setDateOrder] = useState<'newest' | 'oldest'>('newest')
  const [searchTerm, setSearchTerm] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [deletingProject, setDeletingProject] = useState<ProjectType | null>(
    null
  )
  const [deleting, setDeleting] = useState(false)
  const [permissionAccess, setPermissionAccess] =
    useState<CachedUserAccess | null>(null)
  const [permissionsReady, setPermissionsReady] = useState(false)
  const { t } = useTranslation()
  const navigate = useNavigate()
  const auth = useAuth()
  const isAuthenticated = useUserStore((state) => state.isAuthenticated)
  const showToast = useToastStore((state) => state.show)
  const setSelectedProject = useProjectStore(
    (state) => state.setSelectedProject
  )
  const setProjectImage = useProjectStore((state) => state.setProjectImage)
  const clearSelectedProject = useProjectStore(
    (state) => state.clearSelectedProject
  )

  useEffect(() => {
    clearSelectedProject()
  }, [clearSelectedProject])

  useEffect(() => {
    let isMounted = true
    const accessToken = auth.user?.access_token

    if (!accessToken) {
      setIsLoading(auth.isLoading || isAuthenticated)
      return () => {
        isMounted = false
      }
    }

    TrustDeck.instance().setToken(accessToken)

    const fetchProjects = async () => {
      try {
        setIsLoading(true)
        const data = await ProjectService.getProjects()
        const uniqueProjects = Array.from(
          new Map(
            data.map((project) => [project.abbreviation, project])
          ).values()
        )
        if (isMounted) setProjects(uniqueProjects)
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        if (!message.includes('No access token available')) {
          console.error('Failed to load projects', e)
        }
        if (isMounted) setProjects([])
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    fetchProjects()
    return () => {
      isMounted = false
    }
  }, [auth.user?.access_token, auth.isLoading, isAuthenticated])

  useEffect(() => {
    let active = true
    const accessToken = auth.user?.access_token
    if (!accessToken) {
      setPermissionsReady(false)
      setPermissionAccess(null)
      return () => {
        active = false
      }
    }

    TrustDeck.instance().setToken(accessToken)
    setPermissionsReady(false)
    getCurrentUserAccess(false)
      .then((access) => {
        if (!active) return
        setPermissionAccess(access)
      })
      .catch((error) => {
        console.warn('Could not load current-user project permissions', error)
        if (active) setPermissionAccess(null)
      })
      .finally(() => {
        if (active) setPermissionsReady(true)
      })

    return () => {
      active = false
    }
  }, [auth.user?.access_token])

  const getDeleteErrorDetail = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('403')) return t('projects:noDeletePermissionDetail')
    if (message.includes('401')) return t('projects:deleteExpired')
    if (message.includes('404')) return t('projects:deleteNotFound')
    if (message.includes('500')) return t('projects:deleteBackendError')
    return t('projects:deleteFailed')
  }

  useEffect(() => {
    let isMounted = true
    if (!projects.length) {
      setProjectImages({})
      return () => {
        isMounted = false
      }
    }

    const loadImages = async () => {
      const entries = await Promise.all(
        projects.map(async (project) => {
          try {
            const image = await ProjectService.getProjectImage(
              project.abbreviation
            )
            return [project.abbreviation, image] as const
          } catch {
            return [project.abbreviation, undefined] as const
          }
        })
      )
      if (isMounted) setProjectImages(Object.fromEntries(entries))
    }

    void loadImages()
    return () => {
      isMounted = false
    }
  }, [projects])

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

  const openProjectSettings = (project: ProjectType) => {
    setSelectedProject({
      abbreviation: project.abbreviation,
      name: project.name
    })
    const image = projectImages[project.abbreviation]
    if (image) setProjectImage(image)
    navigate('/project-settings', { state: { edit: true } })
  }

  const handleDeleteProject = async () => {
    if (!deletingProject) return
    if (
      !canManageProject(
        permissionAccess,
        deletingProject.abbreviation,
        'delete'
      )
    ) {
      showToast({
        severity: 'warn',
        summary: t('projects:noDeletePermission'),
        detail: t('projects:noDeletePermissionDetail'),
        life: 4000
      })
      setDeletingProject(null)
      return
    }
    try {
      setDeleting(true)
      await ProjectService.deleteProject(deletingProject.abbreviation)
      setProjects((prev) =>
        prev.filter(
          (project) => project.abbreviation !== deletingProject.abbreviation
        )
      )
      showToast({
        severity: 'success',
        summary: t('projects:projectDeleted'),
        detail: t('projects:projectDeletedDetail', {
          name: deletingProject.name
        }),
        life: 2500
      })
      setDeletingProject(null)
    } catch (error) {
      console.error('Failed to delete project', error)
      showToast({
        severity: 'error',
        summary: t('projects:deleteFailed'),
        detail: getDeleteErrorDetail(error),
        life: 3500
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="td-page-shell">
      <PageHeader
        title={t('projects:title')}
        description={t('projects:subtitle')}
      />
      <div className="mb-6 flex w-full justify-center">
        {projects.length > 0 && !isLoading && (
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-color-blue hover:text-color-blue dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100 dark:hover:border-blue-400 dark:hover:text-blue-200"
            aria-expanded={filtersOpen}
          >
            <FunnelIcon className="h-5 w-5" />
            {t('projects:filters')}
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
                  <h2 className="td-section-title">
                    {t('projects:filterProjects')}
                  </h2>
                  <p className="td-section-subtitle">
                    {t('projects:filterHelp')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="reset-filter-button text-sm font-medium text-color-blue hover:underline"
                    onClick={resetFilters}
                  >
                    {t('projects:reset')}
                  </button>
                  <button
                    type="button"
                    className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    onClick={() => setFiltersOpen(false)}
                    aria-label={t('projects:collapseFilters')}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <CustomFloatLabel
                  id="projectSearch"
                  value={searchTerm}
                  placeholder={t('projects:searchProjects')}
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
                permissionsReady={permissionsReady}
                canUpdate
                canDelete={canManageProject(
                  permissionAccess,
                  project.abbreviation,
                  'delete'
                )}
                onEdit={openProjectSettings}
                onDelete={setDeletingProject}
                projectImage={projectImages[project.abbreviation]}
              />
            ))}
          </div>

          {projects.length === 0 && (
            <div className="mx-auto mt-20 max-w-2xl rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm">
              <h2 className="td-section-title">
                {t('projects:noProjectsTitle')}
              </h2>
              <p className="mt-3 text-gray-600">{t('projects:noProjects')}</p>
              <div className="mt-6 flex justify-center">
                <PrimaryButton
                  label={t('projects:createNewProjectButton')}
                  onClick={() => navigate('/projects/new')}
                />
              </div>
            </div>
          )}

          {projects.length > 0 && filteredProjects.length === 0 && (
            <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-6 text-center text-gray-600">
              {t('projects:noFilterMatches')}
            </div>
          )}

          {projects.length > 0 && (
            <div className="sticky bottom-0 z-30 -mx-4 mt-8 border-t border-gray-200 bg-surface/95 px-4 py-3 backdrop-blur">
              <div className="mx-auto flex max-w-7xl justify-center">
                <PrimaryButton
                  label={t('projects:newProject')}
                  icon={<PlusIcon className="h-5 w-5" />}
                  iconPos="left"
                  onClick={() => navigate('/projects/new')}
                />
              </div>
            </div>
          )}
        </>
      )}

      <Dialog
        header={t('projects:deleteProject')}
        visible={Boolean(deletingProject)}
        onHide={() => setDeletingProject(null)}
        modal
        className="w-full max-w-lg"
      >
        <div className="space-y-4 pt-2">
          <p>
            {t('projects:deleteConfirm', { name: deletingProject?.name ?? '' })}
          </p>
          <p className="td-section-subtitle">
            {t('projects:deleteIrreversible')}
          </p>
          <div className="flex justify-end gap-2">
            <SecondaryOutlinedButton
              label={t('common:cancel')}
              onClick={() => setDeletingProject(null)}
            />
            <PrimaryButton
              label={t('projects:deleteProject')}
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
