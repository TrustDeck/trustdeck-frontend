import { useState, useEffect } from 'react'
import SingleProject from './components/SingleProject'
import ProjectService from './services/ProjectService'
import TrustDeck from '../../core/services/TrustDeck'
import { ProjectType } from './types/ProjectType'
import { useTranslation } from 'react-i18next'
import PrimaryButton from '@component/form/buttons/PrimaryButton'
import SecondaryOutlinedButton from '@component/form/buttons/SecondaryOutlinedButton'
import { useNavigate } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { ProgressSpinner } from 'primereact/progressspinner'
import { Dialog } from 'primereact/dialog'
import { PlusIcon } from '@heroicons/react/24/outline'
import useToastStore from '../../core/stores/ToastStore'
import useUserStore from '../../core/stores/UserStore'
import useProjectStore from '../../core/stores/ProjectStore'
import {
  CachedUserAccess,
  canManageProject,
  clearPermissionCache,
  getCurrentUserAccess
} from '../../core/services/PermissionCache'
import PageHeader from '../../core/components/common/PageHeader'

export default function ProjectOverview() {
  const [projects, setProjects] = useState<ProjectType[]>([])
  const [projectImages, setProjectImages] = useState<
    Record<string, string | undefined>
  >({})
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [deletingProject, setDeletingProject] = useState<ProjectType | null>(
    null
  )
  const [deleting, setDeleting] = useState(false)
  const [expandedProject, setExpandedProject] = useState<{
    abbreviation: string
    mode: 'view' | 'edit'
  } | null>(null)
  const [permissionAccess, setPermissionAccess] =
    useState<CachedUserAccess | null>(null)
  const [permissionsReady, setPermissionsReady] = useState(false)
  const { t } = useTranslation()
  const navigate = useNavigate()
  const auth = useAuth()
  const isAuthenticated = useUserStore((state) => state.isAuthenticated)
  const showToast = useToastStore((state) => state.show)
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
        if (isMounted) {
          setProjects(
            uniqueProjects.sort((left, right) =>
              left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
            )
          )
        }
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
    // Synchronize token roles before evaluating project actions. This avoids a
    // race after frontend redeploys where the permission cache was populated
    // before the refreshed Keycloak roles reached the user store.
    useUserStore.getState().setFromAccessToken(accessToken)
    clearPermissionCache()
    setPermissionsReady(false)
    getCurrentUserAccess(true)
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

  const openProjectDetails = (project: ProjectType, mode: 'view' | 'edit') => {
    setExpandedProject((current) =>
      current?.abbreviation === project.abbreviation && current.mode === mode
        ? null
        : { abbreviation: project.abbreviation, mode }
    )
  }

  const handleProjectSaved = (
    originalAbbreviation: string,
    updatedProject: ProjectType,
    updatedImage?: string
  ) => {
    setProjects((current) =>
      current
        .map((project) =>
          project.abbreviation === originalAbbreviation ? updatedProject : project
        )
        .sort((left, right) =>
          left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
        )
    )
    setProjectImages((current) => {
      const next = { ...current }
      delete next[originalAbbreviation]
      next[updatedProject.abbreviation] = updatedImage
      return next
    })
    setExpandedProject({
      abbreviation: updatedProject.abbreviation,
      mode: 'view'
    })
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
      setProjectImages((prev) => {
        const next = { ...prev }
        delete next[deletingProject.abbreviation]
        return next
      })
      setExpandedProject((current) =>
        current?.abbreviation === deletingProject.abbreviation ? null : current
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

      {isLoading ? (
        <div className="w-full flex justify-center py-10">
          <ProgressSpinner />
        </div>
      ) : (
        <>
          <div className="flex w-full flex-col items-center gap-6 mb-8">
            {projects.map((project) => (
              <SingleProject
                key={project.abbreviation}
                project={project}
                permissionsReady={permissionsReady}
                canUpdate={canManageProject(
                  permissionAccess,
                  project.abbreviation,
                  'update'
                )}
                canDelete={canManageProject(
                  permissionAccess,
                  project.abbreviation,
                  'delete'
                )}
                expandedMode={
                  expandedProject?.abbreviation === project.abbreviation
                    ? expandedProject.mode
                    : null
                }
                onView={(selected) => openProjectDetails(selected, 'view')}
                onEdit={(selected) => openProjectDetails(selected, 'edit')}
                onCloseDetails={() => setExpandedProject(null)}
                onModeChange={(mode) =>
                  setExpandedProject({
                    abbreviation: project.abbreviation,
                    mode
                  })
                }
                onSaved={handleProjectSaved}
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

          {projects.length > 0 && (
            <div className="mt-8 flex w-full justify-center">
              <div className="flex justify-center">
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
