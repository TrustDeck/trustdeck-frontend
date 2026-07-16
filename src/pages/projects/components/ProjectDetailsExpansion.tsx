import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { useAuth } from 'react-oidc-context'
import CustomCalendar from '@component/form/CustomCalendar'
import PrimaryButton from '@component/form/buttons/PrimaryButton'
import SecondaryButton from '@component/form/buttons/SecondaryButton'
import SecondaryOutlinedButton from '@component/form/buttons/SecondaryOutlinedButton'
import TrustDeck from '@service/TrustDeck'
import useToastStore from '../../../core/stores/ToastStore'
import { formatDateTime } from '../../../core/utils/date'
import { getHttpStatus } from '../../../core/utils/httpErrors'
import ProjectService from '../services/ProjectService'
import { ProjectType } from '../types/ProjectType'

type ExpandedMode = 'view' | 'edit'

type ProjectFormState = {
  name: string
  abbreviation: string
  startDate: Date | null
  endDate: Date | null
  description: string
}

interface ProjectDetailsExpansionProps {
  project: ProjectType
  projectImage?: string
  mode: ExpandedMode
  canUpdate: boolean
  canDelete: boolean
  permissionsReady: boolean
  onModeChange: (mode: ExpandedMode) => void
  onClose: () => void
  onDelete: (project: ProjectType) => void
  onSaved: (
    originalAbbreviation: string,
    project: ProjectType,
    image?: string
  ) => void
}

const toDate = (value?: string | null) => {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const toFormState = (project: ProjectType): ProjectFormState => ({
  name: project.name ?? '',
  abbreviation: project.abbreviation ?? '',
  startDate: toDate(project.startDate),
  endDate: toDate(project.endDate),
  description: project.description ?? ''
})

export default function ProjectDetailsExpansion({
  project,
  projectImage,
  mode,
  canUpdate,
  canDelete,
  permissionsReady,
  onModeChange,
  onClose,
  onDelete,
  onSaved
}: ProjectDetailsExpansionProps) {
  const { t } = useTranslation(['settings', 'projects', 'common'])
  const auth = useAuth()
  const showToast = useToastStore((state) => state.show)
  const [projectDetails, setProjectDetails] = useState<ProjectType>(project)
  const [projectForm, setProjectForm] = useState<ProjectFormState>(() =>
    toFormState(project)
  )
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [savingProject, setSavingProject] = useState(false)
  const [savedImage, setSavedImage] = useState<string | undefined>(projectImage)
  const [imagePreview, setImagePreview] = useState<string | undefined>(
    projectImage
  )
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [removeImageRequested, setRemoveImageRequested] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const originalAbbreviation = project.abbreviation
  const isEditing = mode === 'edit'

  const revokeBlobPreview = useCallback((value?: string) => {
    if (value?.startsWith('blob:')) URL.revokeObjectURL(value)
  }, [])

  useEffect(() => {
    if (auth.user?.access_token) {
      TrustDeck.instance().setToken(auth.user.access_token)
    }
  }, [auth.user?.access_token])

  useEffect(() => {
    let active = true

    const loadDetails = async () => {
      try {
        setLoadingDetails(true)
        const loaded = await TrustDeck.instance().getProject(
          project.abbreviation
        )
        if (!active) return
        setProjectDetails(loaded)
        setProjectForm(toFormState(loaded))
      } catch (error) {
        console.error('Failed to load project details', error)
        if (active) {
          setProjectDetails(project)
          setProjectForm(toFormState(project))
        }
      } finally {
        if (active) setLoadingDetails(false)
      }
    }

    void loadDetails()
    return () => {
      active = false
    }
  }, [project])

  useEffect(() => {
    let active = true
    revokeBlobPreview(imagePreview)
    setSelectedImageFile(null)
    setRemoveImageRequested(false)

    if (projectImage) {
      setSavedImage(projectImage)
      setImagePreview(projectImage)
      return () => {
        active = false
      }
    }

    setSavedImage(undefined)
    setImagePreview(undefined)
    ProjectService.getProjectImage(project.abbreviation)
      .then((image) => {
        if (active) {
          setSavedImage(image)
          setImagePreview(image)
        }
      })
      .catch(() => {
        if (active) {
          setSavedImage(undefined)
          setImagePreview(undefined)
        }
      })

    return () => {
      active = false
    }
    // imagePreview must not be a dependency: this effect intentionally resets it
    // only when the selected project or externally stored project image changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.abbreviation, projectImage, revokeBlobPreview])

  useEffect(() => {
    if (mode === 'edit') {
      setProjectForm(toFormState(projectDetails))
      setSelectedImageFile(null)
      setRemoveImageRequested(false)
      revokeBlobPreview(imagePreview)
      setImagePreview(savedImage)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    // Do not reset the form on every local field edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  useEffect(
    () => () => {
      revokeBlobPreview(imagePreview)
    },
    [imagePreview, revokeBlobPreview]
  )

  const displayRows = useMemo(
    () => [
      {
        label: t('settings:projectName'),
        value: projectDetails.name || '—'
      },
      {
        label: t('settings:projectAbbreviation'),
        value: projectDetails.abbreviation || '—'
      },
      {
        label: t('settings:projectStartDate'),
        value: projectDetails.startDate
          ? formatDateTime(projectDetails.startDate)
          : '—'
      },
      {
        label: t('settings:projectEndDate'),
        value: projectDetails.endDate
          ? formatDateTime(projectDetails.endDate)
          : '—'
      },
      {
        label: t('settings:description'),
        value: projectDetails.description || '—',
        wide: true
      }
    ],
    [projectDetails, t]
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

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    revokeBlobPreview(imagePreview)
    setSelectedImageFile(file)
    setRemoveImageRequested(false)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleStageImageRemoval = () => {
    revokeBlobPreview(imagePreview)
    setSelectedImageFile(null)
    setRemoveImageRequested(true)
    setImagePreview(undefined)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleCancelEdit = () => {
    setProjectForm(toFormState(projectDetails))
    setSelectedImageFile(null)
    setRemoveImageRequested(false)
    revokeBlobPreview(imagePreview)
    setImagePreview(savedImage)
    if (fileInputRef.current) fileInputRef.current.value = ''
    onModeChange('view')
  }

  const persistImageChanges = async (
    updatedProject: ProjectType
  ): Promise<string | undefined> => {
    if (removeImageRequested) {
      try {
        await TrustDeck.instance().deleteImage(updatedProject.abbreviation)
        return undefined
      } catch (error) {
        throw new Error(getImageDeleteErrorDetail(error))
      }
    }

    if (selectedImageFile) {
      try {
        await TrustDeck.instance().createImage(
          selectedImageFile,
          updatedProject.abbreviation
        )
        return await ProjectService.getProjectImage(
          updatedProject.abbreviation
        )
      } catch (error) {
        throw new Error(getImageUploadErrorDetail(error))
      }
    }

    return savedImage
  }

  const handleSaveProject = async () => {
    if (!canUpdate) {
      showToast({
        severity: 'warn',
        summary: t('settings:updateFailed'),
        detail: t('settings:updateNotAllowed'),
        life: 3500
      })
      return
    }

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
        ...projectDetails,
        name: projectForm.name.trim(),
        abbreviation: projectForm.abbreviation.trim(),
        startDate: (
          projectForm.startDate ?? toDate(projectDetails.startDate) ?? new Date()
        ).toISOString(),
        endDate: (
          projectForm.endDate ?? toDate(projectDetails.endDate) ?? new Date()
        ).toISOString(),
        // Preserve backend-only flags without exposing them in the UI.
        storeEntities: projectDetails.storeEntities,
        storePseudonyms: projectDetails.storePseudonyms,
        description: projectForm.description.trim()
      }

      const updated = await ProjectService.updateProject(
        payload,
        originalAbbreviation
      )
      const updatedImage = await persistImageChanges(updated)

      revokeBlobPreview(imagePreview)
      setProjectDetails(updated)
      setProjectForm(toFormState(updated))
      setSavedImage(updatedImage)
      setImagePreview(updatedImage)
      setSelectedImageFile(null)
      setRemoveImageRequested(false)
      onSaved(originalAbbreviation, updated, updatedImage)

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
        detail:
          error instanceof Error && error.message
            ? error.message
            : getUpdateErrorDetail(error),
        life: 4000
      })
    } finally {
      setSavingProject(false)
    }
  }

  const fieldIdSuffix = project.abbreviation.replace(/[^a-zA-Z0-9_-]/g, '-')

  return (
    <div className="mt-5 border-t border-gray-200 pt-6 dark:border-slate-700">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="td-section-title">{t('settings:projectInfo')}</h3>
          <p className="td-section-subtitle mt-1">
            {t('settings:projectInfoHelp')}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          title={t('projects:actions.closeDetails')}
          aria-label={t('projects:actions.closeDetails')}
          className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>

      {loadingDetails && (
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-300">
          {t('settings:loadingProjectDetails')}
        </p>
      )}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.75fr)]">
        <section>
          {!isEditing ? (
            <dl className="grid grid-cols-1 gap-x-8 gap-y-5 font-font-text sm:grid-cols-2">
              {displayRows.map((row) => (
                <div
                  key={row.label}
                  className={row.wide ? 'sm:col-span-2' : ''}
                >
                  <dt className="td-field-label">{row.label}</dt>
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
                      setProjectForm((previous) => ({
                        ...previous,
                        name: event.target.value
                      }))
                    }
                    className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 shadow-sm focus:border-color-blue focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100"
                  />
                </label>
                <label className="block text-base font-medium text-gray-700 dark:text-gray-200">
                  {t('settings:projectAbbreviation')}
                  <input
                    value={projectForm.abbreviation}
                    onChange={(event) =>
                      setProjectForm((previous) => ({
                        ...previous,
                        abbreviation: event.target.value
                      }))
                    }
                    className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 shadow-sm focus:border-color-blue focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <CustomCalendar
                  id={`project-start-${fieldIdSuffix}`}
                  placeholder={t('settings:startDateTime')}
                  value={projectForm.startDate}
                  onChange={(event) =>
                    setProjectForm((previous) => ({
                      ...previous,
                      startDate: event.value
                    }))
                  }
                  showTime
                />
                <CustomCalendar
                  id={`project-end-${fieldIdSuffix}`}
                  placeholder={t('settings:endDateTime')}
                  value={projectForm.endDate}
                  onChange={(event) =>
                    setProjectForm((previous) => ({
                      ...previous,
                      endDate: event.value
                    }))
                  }
                  showTime
                />
              </div>

              <label className="block text-base font-medium text-gray-700 dark:text-gray-200">
                {t('settings:description')}
                <textarea
                  value={projectForm.description}
                  onChange={(event) =>
                    setProjectForm((previous) => ({
                      ...previous,
                      description: event.target.value
                    }))
                  }
                  rows={7}
                  className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 shadow-sm focus:border-color-blue focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100"
                />
              </label>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="td-section-title mb-4">{t('settings:photo')}</h3>
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
            {isEditing && imagePreview && (
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

          {isEditing && (
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

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {!isEditing ? (
          <>
            <span
              title={
                canUpdate ? undefined : t('settings:updateNotAllowed')
              }
            >
              <PrimaryButton
                label={t('settings:editProject')}
                disabled={!canUpdate}
                onClick={() => onModeChange('edit')}
              />
            </span>
            <span
              title={
                !permissionsReady || !canDelete
                  ? t('settings:delete.notAllowed')
                  : undefined
              }
            >
              <SecondaryButton
                label={t('projects:deleteProject')}
                disabled={!permissionsReady || !canDelete}
                onClick={() => onDelete(projectDetails)}
              />
            </span>
          </>
        ) : (
          <>
            <PrimaryButton
              label={t('settings:saveChanges')}
              loading={savingProject}
              disabled={
                !canUpdate ||
                !projectForm.name.trim() ||
                !projectForm.abbreviation.trim()
              }
              onClick={handleSaveProject}
            />
            <SecondaryOutlinedButton
              label={t('common:cancel')}
              onClick={handleCancelEdit}
            />
            <span
              title={
                !permissionsReady || !canDelete
                  ? t('settings:delete.notAllowed')
                  : undefined
              }
            >
              <SecondaryButton
                label={t('projects:deleteProject')}
                disabled={!permissionsReady || !canDelete}
                onClick={() => onDelete(projectDetails)}
              />
            </span>
          </>
        )}
      </div>
    </div>
  )
}
