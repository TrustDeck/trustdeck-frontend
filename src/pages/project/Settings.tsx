import React, { useEffect, useRef, useState } from 'react'
import Panel from '@component/common/Panel'
import { useTranslation } from 'react-i18next'
import TrustDeck from '@service/TrustDeck'
import useProjectStore from '../../core/stores/ProjectStore'
import { ProjectType } from '../projects/types/ProjectType'
import LocalProjectService from './services/ProjectService'
import ProjectService from '../projects/services/ProjectService'
import { useNavigate } from 'react-router-dom'
import PrimaryButton from '@component/form/buttons/PrimaryButton.tsx'
import SecondaryOutlinedButton from '@component/form/buttons/SecondaryOutlinedButton.tsx'
import useToastStore from '../../core/stores/ToastStore'
import ProjectInfoSection from './components/ProjectInfoSection'
import DeleteProjectSection from './components/DeleteProjectSection'

const Settings: React.FC = () => {
  const { t } = useTranslation()
  const showToast = useToastStore((state) => state.show)
  const selectedProject = useProjectStore((state) => state.selectedProject)
  const projectImage = useProjectStore((state) => state.projectImage)
  const setProjectImage = useProjectStore((state) => state.setProjectImage)
  const [projectDetails, setProjectDetails] = useState<ProjectType | null>(null)
  const [loadingDelete, setLoadingDelete] = useState(false)
  const [confirmVisible, setConfirmVisible] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | undefined>(projectImage)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [savingImage, setSavingImage] = useState(false)
  const [deletingImage, setDeletingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      if (!selectedProject?.abbreviation) return
      try {
        const match = await TrustDeck.instance().getProject(selectedProject.abbreviation)
        if (isMounted && match) setProjectDetails(match)
      } catch (e) {
        console.error('Failed to load project details', e)
        if (isMounted) setProjectDetails(null)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [selectedProject?.abbreviation])

  useEffect(() => {
    let isMounted = true
    const loadImage = async () => {
      if (!selectedProject?.abbreviation) return
      try {
        const image = await ProjectService.getProjectImage(selectedProject.abbreviation)
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
  }, [selectedProject?.abbreviation, setProjectImage])

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

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
      const image = await ProjectService.getProjectImage(selectedProject?.abbreviation)
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
      await TrustDeck.instance().deleteImage(selectedProject?.abbreviation)
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

  return (
    <div className="flex min-h-screen w-full flex-col">
      <div className="flex flex-1 flex-col items-center w-full px-4 pt-4">
        <h1 className="text-center">{t('settings:header')}</h1>

        <ProjectInfoSection
          t={t}
          projectDetails={projectDetails}
          selectedProject={selectedProject}
        />

        <Panel title={t('settings:photo')} className="w-full max-w-4xl mt-6">
          <div className="grid gap-6 md:grid-cols-[180px_1fr]">
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
                Upload, replace, preview, or remove the image used for this project in the overview and sidebar.
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
                  <SecondaryOutlinedButton label="Cancel selection" onClick={handleResetSelectedFile} />
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
