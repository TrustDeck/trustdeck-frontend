import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Panel from '@component/common/Panel'
import { useTranslation } from 'react-i18next'
import TrustDeck from '@service/TrustDeck'
import useProjectStore from '../../core/stores/ProjectStore'
import { ProjectType } from '../projects/types/ProjectType'
import LocalProjectService from './services/ProjectService'
import ProjectService from '../projects/services/ProjectService'
import { useLocation, useNavigate } from 'react-router-dom'
import PrimaryButton from '@component/form/buttons/PrimaryButton.tsx'
import SecondaryOutlinedButton from '@component/form/buttons/SecondaryOutlinedButton.tsx'
import useToastStore from '../../core/stores/ToastStore'
import DeleteProjectSection from './components/DeleteProjectSection'
import CustomCalendar from '@component/form/CustomCalendar'
import { formatDateTime } from '../../core/utils/date'

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
  storeEntities: boolean
  storePseudonyms: boolean
  description: string
}

const emptyProjectForm: ProjectFormState = {
  name: '',
  abbreviation: '',
  startDate: null,
  endDate: null,
  storeEntities: false,
  storePseudonyms: false,
  description: ''
}

const boolLabel = (value?: boolean) =>
  value === true ? 'Yes' : value === false ? 'No' : '—'

const Settings: React.FC = () => {
  const { t } = useTranslation()
  const showToast = useToastStore((state) => state.show)
  const selectedProject = useProjectStore((state) => state.selectedProject)
  const setSelectedProject = useProjectStore(
    (state) => state.setSelectedProject
  )
  const projectImage = useProjectStore((state) => state.projectImage)
  const setProjectImage = useProjectStore((state) => state.setProjectImage)
  const [projectDetails, setProjectDetails] = useState<ProjectType | null>(null)
  const [projectForm, setProjectForm] =
    useState<ProjectFormState>(emptyProjectForm)
  const [isEditingProject, setIsEditingProject] = useState(false)
  const [savingProject, setSavingProject] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [loadingDelete, setLoadingDelete] = useState(false)
  const [confirmVisible, setConfirmVisible] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | undefined>(
    projectImage
  )
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [savingImage, setSavingImage] = useState(false)
  const [deletingImage, setDeletingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const location = useLocation()

  const selectedAbbreviation = selectedProject?.abbreviation

  const hydrateForm = useCallback(
    (project: ProjectType | null) => {
      setProjectForm({
        name: project?.name ?? selectedProject?.name ?? '',
        abbreviation:
          project?.abbreviation ?? selectedProject?.abbreviation ?? '',
        startDate: toDate(project?.startDate),
        endDate: toDate(project?.endDate),
        storeEntities: project?.storeEntities ?? false,
        storePseudonyms: project?.storePseudonyms ?? false,
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
        const match =
          await TrustDeck.instance().getProject(selectedAbbreviation)
        if (!isMounted) return
        setProjectDetails(match)
        hydrateForm(match)
      } catch (e) {
        console.error('Failed to load project details', e)
        if (isMounted) {
          setProjectDetails(null)
          hydrateForm(null)
        }
      } finally {
        if (isMounted) setLoadingDetails(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
    // selectedProject is intentionally included because hydrateForm uses its name as fallback.
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
        label: 'Name',
        value: projectDetails?.name ?? selectedProject?.name ?? '—'
      },
      {
        label: 'Abbreviation',
        value:
          projectDetails?.abbreviation ?? selectedProject?.abbreviation ?? '—'
      },
      {
        label: 'Start date',
        value: projectDetails?.startDate
          ? formatDateTime(projectDetails.startDate)
          : '—'
      },
      {
        label: 'End date',
        value: projectDetails?.endDate
          ? formatDateTime(projectDetails.endDate)
          : '—'
      },
      {
        label: 'Store entities',
        value: boolLabel(projectDetails?.storeEntities)
      },
      {
        label: 'Create pseudonyms',
        value: boolLabel(projectDetails?.storePseudonyms)
      },
      {
        label: 'Description',
        value: projectDetails?.description || '—',
        wide: true
      }
    ],
    [projectDetails, selectedProject]
  )

  const handleStartEdit = () => {
    hydrateForm(projectDetails)
    setIsEditingProject(true)
  }

  const handleCancelEdit = () => {
    hydrateForm(projectDetails)
    setIsEditingProject(false)
  }

  const handleSaveProject = async () => {
    if (!selectedAbbreviation) return
    if (!projectForm.name.trim() || !projectForm.abbreviation.trim()) {
      showToast({
        severity: 'warn',
        summary: 'Missing project data',
        detail: 'Project name and abbreviation are required.',
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
          startDate:
            projectForm.startDate?.toISOString() ?? new Date().toISOString(),
          endDate:
            projectForm.endDate?.toISOString() ?? new Date().toISOString()
        }),
        name: projectForm.name.trim(),
        abbreviation: projectForm.abbreviation.trim(),
        startDate: (
          projectForm.startDate ??
          toDate(projectDetails?.startDate) ??
          new Date()
        ).toISOString(),
        endDate: (
          projectForm.endDate ??
          toDate(projectDetails?.endDate) ??
          new Date()
        ).toISOString(),
        storeEntities: projectForm.storeEntities,
        storePseudonyms: projectForm.storePseudonyms,
        description: projectForm.description.trim()
      }

      const updated = await ProjectService.updateProject(
        payload,
        selectedAbbreviation
      )
      setProjectDetails(updated)
      hydrateForm(updated)
      setSelectedProject({
        abbreviation: updated.abbreviation,
        name: updated.name
      })
      setIsEditingProject(false)
      showToast({
        severity: 'success',
        summary: 'Project updated',
        detail: `${updated.name} was updated successfully.`,
        life: 2500
      })
    } catch (error) {
      console.error('Failed to update project', error)
      showToast({
        severity: 'error',
        summary: 'Update failed',
        detail:
          'The project could not be updated. Please check your permissions and the entered values.',
        life: 4000
      })
    } finally {
      setSavingProject(false)
    }
  }

  const handleDelete = async () => {
    try {
      setLoadingDelete(true)
      await LocalProjectService.deleteProject()
      navigate('/projects')
    } catch (error) {
      console.error(error)
      showToast({
        severity: 'error',
        summary: 'Delete failed',
        detail: 'The project could not be deleted.',
        life: 3500
      })
    } finally {
      setLoadingDelete(false)
    }
  }

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    setSelectedImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSaveImage = async () => {
    if (!selectedImageFile) return
    try {
      setSavingImage(true)
      await TrustDeck.instance().createImage(selectedImageFile)
      const image = await ProjectService.getProjectImage(selectedAbbreviation)
      setProjectImage(image)
      setImagePreview(image)
      setSelectedImageFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      showToast({
        severity: 'success',
        summary: 'Project image saved',
        detail: 'The project image was updated successfully.',
        life: 2500
      })
    } catch (error) {
      console.error('Image upload failed', error)
      showToast({
        severity: 'error',
        summary: 'Image upload failed',
        detail: 'The project image could not be saved.',
        life: 3500
      })
    } finally {
      setSavingImage(false)
    }
  }

  const handleDeleteImage = async () => {
    try {
      setDeletingImage(true)
      await TrustDeck.instance().deleteImage(selectedAbbreviation)
      setProjectImage(undefined)
      setImagePreview(undefined)
      setSelectedImageFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      showToast({
        severity: 'success',
        summary: 'Project image deleted',
        detail: 'The project image was removed.',
        life: 2500
      })
    } catch (error) {
      console.error('Image delete failed', error)
      showToast({
        severity: 'error',
        summary: 'Image delete failed',
        detail: 'The project image could not be deleted.',
        life: 3500
      })
    } finally {
      setDeletingImage(false)
    }
  }

  const handleResetSelectedFile = () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    setSelectedImageFile(null)
    setImagePreview(projectImage)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (!selectedProject) {
    return (
      <div className="flex w-full justify-center px-4 pt-8">
        <Panel title="Project settings" className="w-full max-w-4xl">
          <p className="text-base text-gray-600 dark:text-gray-300">
            Select a project first to view or edit its settings.
          </p>
          <div className="mt-4">
            <PrimaryButton
              label="Back to projects"
              onClick={() => navigate('/projects')}
            />
          </div>
        </Panel>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <div className="flex flex-1 flex-col items-center w-full px-4 pt-4">
        <h1 className="text-center">{t('settings:header')}</h1>

        <Panel title="Project information" className="w-full max-w-4xl mt-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-base text-gray-600 dark:text-gray-300">
              Review all project metadata shown by the backend. The internal
              project ID is intentionally hidden.
            </p>
          </div>

          {loadingDetails && (
            <p className="mb-4 text-sm text-gray-500">
              Loading project details...
            </p>
          )}

          {!isEditingProject ? (
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 font-font-text">
              {displayRows.map((row) => (
                <div
                  key={row.label}
                  className={row.wide ? 'sm:col-span-2' : ''}
                >
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {row.label}
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words text-base font-semibold text-gray-900 dark:text-gray-100">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Project name
                  <input
                    value={projectForm.name}
                    onChange={(event) =>
                      setProjectForm((prev) => ({
                        ...prev,
                        name: event.target.value
                      }))
                    }
                    className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 shadow-sm focus:border-color-blue focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100"
                  />
                </label>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Abbreviation
                  <input
                    value={projectForm.abbreviation}
                    onChange={(event) =>
                      setProjectForm((prev) => ({
                        ...prev,
                        abbreviation: event.target.value
                      }))
                    }
                    className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 shadow-sm focus:border-color-blue focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <CustomCalendar
                  id="settingsStartDate"
                  placeholder="Start date and time"
                  value={projectForm.startDate}
                  onChange={(event) =>
                    setProjectForm((prev) => ({
                      ...prev,
                      startDate: event.value
                    }))
                  }
                  showTime
                />
                <CustomCalendar
                  id="settingsEndDate"
                  placeholder="End date and time"
                  value={projectForm.endDate}
                  onChange={(event) =>
                    setProjectForm((prev) => ({
                      ...prev,
                      endDate: event.value
                    }))
                  }
                  showTime
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base font-medium text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100">
                  <input
                    type="checkbox"
                    checked={projectForm.storeEntities}
                    onChange={(event) =>
                      setProjectForm((prev) => ({
                        ...prev,
                        storeEntities: event.target.checked
                      }))
                    }
                    className="h-5 w-5 rounded border-gray-300 text-color-blue focus:ring-color-blue"
                  />
                  Store entities
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base font-medium text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100">
                  <input
                    type="checkbox"
                    checked={projectForm.storePseudonyms}
                    onChange={(event) =>
                      setProjectForm((prev) => ({
                        ...prev,
                        storePseudonyms: event.target.checked
                      }))
                    }
                    className="h-5 w-5 rounded border-gray-300 text-color-blue focus:ring-color-blue"
                  />
                  Create/store pseudonyms
                </label>
              </div>

              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Description
                <textarea
                  value={projectForm.description}
                  onChange={(event) =>
                    setProjectForm((prev) => ({
                      ...prev,
                      description: event.target.value
                    }))
                  }
                  rows={5}
                  className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 shadow-sm focus:border-color-blue focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100"
                />
              </label>
            </div>
          )}

          <div className="mt-6 flex justify-center gap-3">
            {!isEditingProject ? (
              <PrimaryButton label="Edit project" onClick={handleStartEdit} />
            ) : (
              <>
                <SecondaryOutlinedButton
                  label="Cancel"
                  onClick={handleCancelEdit}
                />
                <PrimaryButton
                  label="Save changes"
                  loading={savingProject}
                  disabled={
                    !projectForm.name.trim() || !projectForm.abbreviation.trim()
                  }
                  onClick={handleSaveProject}
                />
              </>
            )}
          </div>
        </Panel>

        <Panel title={t('settings:photo')} className="w-full max-w-4xl mt-6">
          <div className="mt-3 grid gap-6 md:grid-cols-[180px_1fr]">
            <div className="flex justify-center md:justify-start">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Project image preview"
                  className="h-36 w-36 rounded-3xl border border-gray-200 object-cover shadow-sm dark:border-slate-700"
                />
              ) : (
                <div className="flex h-36 w-36 items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-gray-50 text-center text-sm text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-300">
                  No project image
                </div>
              )}
            </div>
            <div className="space-y-4">
              <p className="text-base text-gray-600 dark:text-gray-300">
                Upload, replace, preview, or remove the image used for this
                project in the overview and sidebar.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleImageSelect}
                className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-700 shadow-sm file:mr-4 file:rounded-full file:border-0 file:bg-color-blue file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100"
              />
              <div className="flex flex-wrap gap-2">
                <PrimaryButton
                  label={projectImage ? 'Save replacement' : 'Upload image'}
                  loading={savingImage}
                  disabled={!selectedImageFile}
                  onClick={handleSaveImage}
                />
                {selectedImageFile && (
                  <SecondaryOutlinedButton
                    label="Cancel selection"
                    onClick={handleResetSelectedFile}
                  />
                )}
                <SecondaryOutlinedButton
                  label="Remove image"
                  loading={deletingImage}
                  disabled={!projectImage && !imagePreview}
                  onClick={handleDeleteImage}
                />
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <DeleteProjectSection
        confirmVisible={confirmVisible}
        loadingDelete={loadingDelete}
        onOpenConfirm={() => setConfirmVisible(true)}
        onCloseConfirm={() => setConfirmVisible(false)}
        onConfirmDelete={handleDelete}
      />
    </div>
  )
}

export default Settings
