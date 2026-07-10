import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TrashIcon } from '@heroicons/react/24/outline'
import Panel from '@component/common/Panel'
import PageHeader from '@component/common/PageHeader'
import { useTranslation } from 'react-i18next'
import TrustDeck from '@service/TrustDeck'
import useProjectStore from '../../core/stores/ProjectStore'
import { ProjectType } from '../projects/types/ProjectType'
import LocalProjectService from './services/ProjectService'
import ProjectService from '../projects/services/ProjectService'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import PrimaryButton from '@component/form/buttons/PrimaryButton.tsx'
import SecondaryButton from '@component/form/buttons/SecondaryButton.tsx'
import SecondaryOutlinedButton from '@component/form/buttons/SecondaryOutlinedButton.tsx'
import useToastStore from '../../core/stores/ToastStore'
import DeleteProjectSection from './components/DeleteProjectSection'
import CustomCalendar from '@component/form/CustomCalendar'
import { formatDateTime } from '../../core/utils/date'
import {
  CachedUserAccess,
  canManageProject,
  getCurrentUserAccess
} from '../../core/services/PermissionCache'
import { getHttpStatus } from '../../core/utils/httpErrors'

const toDate = (value?: string | null) => {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

type ProjectFormState = {
  name: string
  abbreviation: string
  startDate: Date | null
  endDate: Date | null
  description: string
}

const emptyProjectForm: ProjectFormState = {
  name: '',
  abbreviation: '',
  startDate: null,
  endDate: null,
  description: ''
}

const Settings: React.FC = () => {
  const { t } = useTranslation(['settings', 'projects', 'common', 'layout'])
  const auth = useAuth()
  const showToast = useToastStore((state) => state.show)
  const selectedProject = useProjectStore((state) => state.selectedProject)
  const setSelectedProject = useProjectStore((state) => state.setSelectedProject)
  const projectImage = useProjectStore((state) => state.projectImage)
  const setProjectImage = useProjectStore((state) => state.setProjectImage)
  const [projectDetails, setProjectDetails] = useState<ProjectType | null>(null)
  const [projectForm, setProjectForm] = useState<ProjectFormState>(emptyProjectForm)
  const [isEditingProject, setIsEditingProject] = useState(false)
  const [savingProject, setSavingProject] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [loadingDelete, setLoadingDelete] = useState(false)
  const [confirmVisible, setConfirmVisible] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | undefined>(projectImage)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [removeImageRequested, setRemoveImageRequested] = useState(false)
  const [permissionAccess, setPermissionAccess] = useState<CachedUserAccess | null>(null)
  const [permissionsReady, setPermissionsReady] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const location = useLocation()

  const selectedAbbreviation = selectedProject?.abbreviation

  useEffect(() => {
    let active = true
    if (!auth.user?.access_token) {
      setPermissionAccess(null)
      setPermissionsReady(false)
      return () => {
        active = false
      }
    }
    setPermissionsReady(false)
    TrustDeck.instance().setToken(auth.user.access_token)
    getCurrentUserAccess(true)
      .then((access) => {
        if (active) setPermissionAccess(access)
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

  const canDeleteSelectedProject = canManageProject(
    permissionAccess,
    selectedAbbreviation,
    'delete'
  )

  const getUpdateErrorDetail = (error: unknown) => {
    const status = getHttpStatus(error)
    if (status === 403) return t('settings:updateNotAllowed')
    if (status === 401) return t('settings:updateExpired')
    if (status === 404) return t('settings:updateNotFound')
    if (status && status >= 500) return t('settings:updateBackendError')
    return t('settings:updateFailedDetail')
  }

  const getImageUploadErrorDetail = (error: unknown) => {
    const status = getHttpStatus(error)
    if (status === 403) return t('settings:imageUploadNotAllowed')
    if (status === 401) return t('settings:updateExpired')
    if (status === 404) return t('settings:updateNotFound')
    return t('settings:imageUploadFailedDetail')
  }

  const getImageDeleteErrorDetail = (error: unknown) => {
    const status = getHttpStatus(error)
    if (status === 403) return t('settings:imageDeleteNotAllowed')
    if (status === 401) return t('settings:updateExpired')
    if (status === 404) return t('settings:updateNotFound')
    return t('settings:imageDeleteFailedDetail')
  }

  const getDeleteErrorDetail = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('403')) return t('settings:delete.notAllowed')
    if (message.includes('401')) return t('settings:delete.expired')
    if (message.includes('404')) return t('settings:delete.notFound')
    if (message.includes('500')) return t('settings:delete.backendError')
    return t('settings:delete.failedDetail')
  }

  const hydrateForm = useCallback(
    (project: ProjectType | null) => {
      setProjectForm({
        name: project?.name ?? selectedProject?.name ?? '',
        abbreviation: project?.abbreviation ?? selectedProject?.abbreviation ?? '',
        startDate: toDate(project?.startDate),
        endDate: toDate(project?.endDate),
        description: project?.description ?? ''
      })
    },
    [selectedProject?.abbreviation, selectedProject?.name]
  )

  useEffect(() => {
    const shouldOpenEditor = Boolean(
      (location.state as { edit?: boolean } | null)?.edit
    )
    if (shouldOpenEditor) {
      setIsEditingProject(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      if (!selectedAbbreviation) return
      try {
        setLoadingDetails(true)
        const match = await TrustDeck.instance().getProject(selectedAbbreviation)
        if (!isMounted) return
        setProjectDetails(match)
        hydrateForm(match)
      } catch (error) {
        console.error('Failed to load project details', error)
        if (isMounted) {
          setProjectDetails(null)
          hydrateForm(null)
        }
      } finally {
        if (isMounted) setLoadingDetails(false)
      }
    }
    void load()
    return () => {
      isMounted = false
    }
  }, [hydrateForm, selectedAbbreviation])

  useEffect(() => {
    let isMounted = true
    const loadImage = async () => {
      if (!selectedAbbreviation) return
      try {
        const image = await ProjectService.getProjectImage(selectedAbbreviation)
        if (isMounted) {
          setProjectImage(image)
          setImagePreview(image)
        }
      } catch {
        if (isMounted) {
          setProjectImage(undefined)
          setImagePreview(undefined)
        }
      }
    }
    void loadImage()
    return () => {
      isMounted = false
    }
  }, [selectedAbbreviation, setProjectImage])

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  const displayRows = useMemo(
    () => [
      {
        label: t('settings:projectName'),
        value: projectDetails?.name ?? selectedProject?.name ?? '—'
      },
      {
        label: t('settings:projectAbbreviation'),
        value: projectDetails?.abbreviation ?? selectedProject?.abbreviation ?? '—'
      },
      {
        label: t('settings:projectStartDate'),
        value: projectDetails?.startDate
          ? formatDateTime(projectDetails.startDate)
          : '—'
      },
      {
        label: t('settings:projectEndDate'),
        value: projectDetails?.endDate
          ? formatDateTime(projectDetails.endDate)
          : '—'
      },
      {
        label: t('settings:description'),
        value: projectDetails?.description || '—',
        wide: true
      }
    ],
    [projectDetails, selectedProject, t]
  )

  const clearPendingImageChanges = () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    setSelectedImageFile(null)
    setRemoveImageRequested(false)
    setImagePreview(projectImage)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleStartEdit = () => {
    hydrateForm(projectDetails)
    clearPendingImageChanges()
    setIsEditingProject(true)
  }

  const handleCancelEdit = () => {
    hydrateForm(projectDetails)
    clearPendingImageChanges()
    setIsEditingProject(false)
  }

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    setSelectedImageFile(file)
    setRemoveImageRequested(false)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleStageImageRemoval = () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    setSelectedImageFile(null)
    setRemoveImageRequested(true)
    setImagePreview(undefined)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const persistImageChanges = async () => {
    if (removeImageRequested && (projectImage || imagePreview)) {
      try {
        await TrustDeck.instance().deleteImage(selectedAbbreviation)
        setProjectImage(undefined)
        setImagePreview(undefined)
      } catch (error) {
        throw new Error(getImageDeleteErrorDetail(error))
      }
      return
    }

    if (selectedImageFile) {
      try {
        await TrustDeck.instance().createImage(selectedImageFile)
        const image = await ProjectService.getProjectImage(selectedAbbreviation)
        setProjectImage(image)
        setImagePreview(image)
      } catch (error) {
        throw new Error(getImageUploadErrorDetail(error))
      }
    }
  }

  const handleSaveProject = async () => {
    if (!selectedAbbreviation) return
    if (!projectForm.name.trim() || !projectForm.abbreviation.trim()) {
      showToast({
        severity: 'warn',
        summary: t('settings:missingProjectData'),
        detail: t('settings:missingProjectDataDetail'),
        life: 3000
      })
      return
    }

    try {
      setSavingProject(true)
      const payload: ProjectType = {
        ...(projectDetails ?? {
          name: projectForm.name,
          abbreviation: projectForm.abbreviation,
          startDate: projectForm.startDate?.toISOString() ?? new Date().toISOString(),
          endDate: projectForm.endDate?.toISOString() ?? new Date().toISOString()
        }),
        name: projectForm.name.trim(),
        abbreviation: projectForm.abbreviation.trim(),
        startDate: (
          projectForm.startDate ?? toDate(projectDetails?.startDate) ?? new Date()
        ).toISOString(),
        endDate: (
          projectForm.endDate ?? toDate(projectDetails?.endDate) ?? new Date()
        ).toISOString(),
        // These backend flags are intentionally preserved, but are no longer exposed in the UI.
        storeEntities: projectDetails?.storeEntities,
        storePseudonyms: projectDetails?.storePseudonyms,
        description: projectForm.description.trim()
      }

      const updated = await ProjectService.updateProject(payload, selectedAbbreviation)
      await persistImageChanges()
      setProjectDetails(updated)
      hydrateForm(updated)
      setSelectedProject({
        abbreviation: updated.abbreviation,
        name: updated.name
      })
      setSelectedImageFile(null)
      setRemoveImageRequested(false)
      setIsEditingProject(false)
      showToast({
        severity: 'success',
        summary: t('settings:projectUpdated'),
        detail: t('settings:projectUpdatedDetail', { name: updated.name }),
        life: 2500
      })
    } catch (error) {
      console.error('Failed to update project', error)
      showToast({
        severity: 'error',
        summary: t('settings:updateFailed'),
        detail: error instanceof Error && error.message
          ? error.message
          : getUpdateErrorDetail(error),
        life: 4000
      })
    } finally {
      setSavingProject(false)
    }
  }

  const handleDelete = async () => {
    if (!canDeleteSelectedProject) {
      showToast({
        severity: 'warn',
        summary: t('settings:delete.notAllowedSummary'),
        detail: t('settings:delete.notAllowed'),
        life: 4000
      })
      setConfirmVisible(false)
      return
    }
    try {
      setLoadingDelete(true)
      await LocalProjectService.deleteProject()
      navigate('/projects')
    } catch (error) {
      console.error(error)
      showToast({
        severity: 'error',
        summary: t('settings:delete.failedSummary'),
        detail: getDeleteErrorDetail(error),
        life: 3500
      })
    } finally {
      setLoadingDelete(false)
    }
  }

  if (!selectedProject) {
    return (
      <div className="td-page-shell">
        <PageHeader
          title={t('settings:header')}
          description={t('settings:subtitle')}
        />
        <Panel className="!w-full">
          <p className="text-base text-gray-600 dark:text-gray-300">
            {t('settings:selectProjectFirst')}
          </p>
          <div className="mt-4 flex justify-center">
            <PrimaryButton
              label={t('layout:menu.backToProjects')}
              onClick={() => navigate('/projects')}
            />
          </div>
        </Panel>
      </div>
    )
  }

  return (
    <div className="td-page-shell">
      <PageHeader
        title={t('settings:header')}
        description={t('settings:subtitle')}
      />

      <Panel title={t('settings:projectInfo')} className="!w-full">
        <p className="mb-6 text-base text-gray-600 dark:text-gray-300">
          {t('settings:projectInfoHelp')}
        </p>

        {loadingDetails && (
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-300">
            {t('settings:loadingProjectDetails')}
          </p>
        )}

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.75fr)]">
          <section>
            {!isEditingProject ? (
              <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 font-font-text">
                {displayRows.map((row) => (
                  <div key={row.label} className={row.wide ? 'sm:col-span-2' : ''}>
                    <dt className="text-base font-semibold text-gray-500 dark:text-gray-300">
                      {row.label}
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap break-words text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-base font-medium text-gray-700 dark:text-gray-200">
                    {t('settings:projectName')}
                    <input
                      value={projectForm.name}
                      onChange={(event) =>
                        setProjectForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                      className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 shadow-sm focus:border-color-blue focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100"
                    />
                  </label>
                  <label className="block text-base font-medium text-gray-700 dark:text-gray-200">
                    {t('settings:projectAbbreviation')}
                    <input
                      value={projectForm.abbreviation}
                      onChange={(event) =>
                        setProjectForm((prev) => ({ ...prev, abbreviation: event.target.value }))
                      }
                      className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 shadow-sm focus:border-color-blue focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <CustomCalendar
                    id="settingsStartDate"
                    placeholder={t('settings:startDateTime')}
                    value={projectForm.startDate}
                    onChange={(event) =>
                      setProjectForm((prev) => ({ ...prev, startDate: event.value }))
                    }
                    showTime
                  />
                  <CustomCalendar
                    id="settingsEndDate"
                    placeholder={t('settings:endDateTime')}
                    value={projectForm.endDate}
                    onChange={(event) =>
                      setProjectForm((prev) => ({ ...prev, endDate: event.value }))
                    }
                    showTime
                  />
                </div>

                <label className="block text-base font-medium text-gray-700 dark:text-gray-200">
                  {t('settings:description')}
                  <textarea
                    value={projectForm.description}
                    onChange={(event) =>
                      setProjectForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                    rows={7}
                    className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 shadow-sm focus:border-color-blue focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100"
                  />
                </label>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
              {t('settings:photo')}
            </h3>
            <div className="relative mx-auto flex min-h-52 w-full items-center justify-center overflow-hidden rounded-3xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-950">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt={t('settings:projectImageAlt')}
                  className="h-52 w-full object-cover"
                />
              ) : (
                <div className="px-6 text-center text-base text-gray-500 dark:text-gray-300">
                  {t('settings:noProjectImage')}
                </div>
              )}
              {isEditingProject && (imagePreview || projectImage) && (
                <button
                  type="button"
                  onClick={handleStageImageRemoval}
                  title={t('settings:removeImage')}
                  aria-label={t('settings:removeImage')}
                  className="absolute right-3 top-3 rounded-full bg-white/95 p-2 text-color-coral shadow-md transition hover:bg-red-50 dark:bg-slate-900 dark:hover:bg-red-950/50"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              )}
            </div>

            {isEditingProject && (
              <div className="mt-5 space-y-3">
                <p className="text-base text-gray-600 dark:text-gray-300">
                  {t('settings:projectImageHelp')}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleImageSelect}
                  className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-700 shadow-sm file:mr-4 file:rounded-full file:border-0 file:bg-color-blue file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700 dark:border-slate-700 dark:bg-slate-950 dark:text-gray-100"
                />
              </div>
            )}
          </section>
        </div>
      </Panel>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {!isEditingProject ? (
          <>
            <PrimaryButton
              label={t('settings:editProject')}
              onClick={handleStartEdit}
            />
            <span
              title={
                !permissionsReady || !canDeleteSelectedProject
                  ? t('settings:delete.notAllowed')
                  : undefined
              }
            >
              <SecondaryButton
                label={t('projects:deleteProject')}
                disabled={!permissionsReady || !canDeleteSelectedProject}
                onClick={() => setConfirmVisible(true)}
              />
            </span>
          </>
        ) : (
          <>
            <PrimaryButton
              label={t('settings:saveChanges')}
              loading={savingProject}
              disabled={!projectForm.name.trim() || !projectForm.abbreviation.trim()}
              onClick={handleSaveProject}
            />
            <SecondaryOutlinedButton
              label={t('common:cancel')}
              onClick={handleCancelEdit}
            />
            <span
              title={
                !permissionsReady || !canDeleteSelectedProject
                  ? t('settings:delete.notAllowed')
                  : undefined
              }
            >
              <SecondaryButton
                label={t('projects:deleteProject')}
                disabled={!permissionsReady || !canDeleteSelectedProject}
                onClick={() => setConfirmVisible(true)}
              />
            </span>
          </>
        )}
      </div>

      <DeleteProjectSection
        confirmVisible={confirmVisible}
        loadingDelete={loadingDelete}
        onOpenConfirm={() => setConfirmVisible(true)}
        onCloseConfirm={() => setConfirmVisible(false)}
        onConfirmDelete={handleDelete}
        deleteDisabled={!permissionsReady || !canDeleteSelectedProject}
        deleteDisabledReason={
          !permissionsReady
            ? t('settings:delete.checking')
            : t('settings:delete.notAllowed')
        }
      />
    </div>
  )
}

export default Settings
