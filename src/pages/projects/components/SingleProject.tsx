import type React from 'react'
import Panel from '@component/common/Panel'
import { useNavigate, useLocation } from 'react-router-dom'
import { ProjectType } from '../types/ProjectType'
import { formatDate } from '../../../core/utils/date'
import useProjectStore from '../../../core/stores/ProjectStore'
import ProjectService from '../services/ProjectService'
import { useTranslation } from 'react-i18next'
import {
  EyeIcon,
  PencilSquareIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import ProjectDetailsExpansion from './ProjectDetailsExpansion'

type ExpandedMode = 'view' | 'edit'

interface SingleProjectProps {
  project: ProjectType
  canUpdate?: boolean
  canDelete?: boolean
  permissionsReady?: boolean
  expandedMode?: ExpandedMode | null
  onView?: (project: ProjectType) => void
  onEdit?: (project: ProjectType) => void
  onCloseDetails?: () => void
  onDelete?: (project: ProjectType) => void
  onSaved?: (
    originalAbbreviation: string,
    project: ProjectType,
    image?: string
  ) => void
  onModeChange?: (mode: ExpandedMode) => void
  projectImage?: string
}

function ProjectActionButton({
  label,
  disabled,
  title,
  onClick,
  children
}: {
  label: string
  disabled: boolean
  title: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <span title={title} className="inline-flex">
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation()
          if (!disabled) onClick()
        }}
        className={`rounded-full border p-2 transition ${
          disabled
            ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500'
            : 'border-gray-200 bg-white text-gray-600 hover:border-color-blue hover:text-color-blue hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-gray-200'
        }`}
      >
        {children}
      </button>
    </span>
  )
}

export default function SingleProject({
  project,
  canUpdate = false,
  canDelete = false,
  permissionsReady = true,
  expandedMode = null,
  onView,
  onEdit,
  onCloseDetails,
  onDelete,
  onSaved,
  onModeChange,
  projectImage
}: SingleProjectProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const setSelectedProject = useProjectStore(
    (state) => state.setSelectedProject
  )
  const setProjectImage = useProjectStore((state) => state.setProjectImage)
  const setEntities = useProjectStore((state) => state.setEntities)
  const setEntityAttributes = useProjectStore(
    (state) => state.setEntityAttributes
  )
  const { t } = useTranslation()

  async function handleOpenProject() {
    setSelectedProject({
      abbreviation: project.abbreviation,
      name: project.name
    })

    try {
      const image =
        projectImage ??
        (await ProjectService.getProjectImage(project.abbreviation))
      setProjectImage(image)
    } catch (error) {
      console.warn('Failed to load project image', error)
      setProjectImage(undefined)
    }

    try {
      const projectEntities = await ProjectService.getProjectEntities()
      setEntities(projectEntities)
    } catch (error) {
      console.error('Failed to load project entities', error)
      setEntities([])
    }

    try {
      const attributes = await ProjectService.getEntityAttributes()
      setEntityAttributes(attributes)
    } catch (error) {
      console.error(error)
    }

    const from = location.state?.from?.pathname || '/search'
    navigate(from)
  }

  const viewTooltip = t('projects:actions.viewProject')
  const updateTooltip = canUpdate
    ? t('projects:actions.updateProject')
    : t('settings:updateNotAllowed')
  const deleteTooltip = !permissionsReady
    ? t('projects:actions.checkingPermissions')
    : canDelete
      ? t('projects:actions.deleteProject')
      : t('projects:actions.deleteNotAllowed')

  return (
    <Panel
      className={`transition-all duration-300 ${
        expandedMode
          ? '!max-w-none'
          : 'hover:bg-gray-50 dark:hover:bg-slate-800/60'
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={handleOpenProject}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            void handleOpenProject()
          }
        }}
        className="cursor-pointer"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            {projectImage ? (
              <img
                src={projectImage}
                alt={t('projects:projectIconAlt', { name: project.name })}
                className="h-14 w-14 shrink-0 rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-lg font-semibold text-color-blue dark:bg-blue-950/50 dark:text-blue-100">
                {(project.name || project.abbreviation || '?')
                  .slice(0, 1)
                  .toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="td-panel-title my-1 truncate" title={project.name}>
                {project.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-300">
                {project.abbreviation}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2 pt-2">
            <ProjectActionButton
              label={t('projects:actions.viewProject')}
              disabled={false}
              title={viewTooltip}
              onClick={() => onView?.(project)}
            >
              <EyeIcon className="h-5 w-5" />
            </ProjectActionButton>
            <ProjectActionButton
              label={t('projects:actions.updateProject')}
              disabled={!permissionsReady || !canUpdate}
              title={updateTooltip}
              onClick={() => onEdit?.(project)}
            >
              <PencilSquareIcon className="h-5 w-5" />
            </ProjectActionButton>
            <ProjectActionButton
              label={t('projects:actions.deleteProject')}
              disabled={!permissionsReady || !canDelete}
              title={deleteTooltip}
              onClick={() => onDelete?.(project)}
            >
              <TrashIcon className="h-5 w-5" />
            </ProjectActionButton>
          </div>
        </div>
        <div className="my-3 flex flex-wrap gap-5">
          {project.startDate && (
            <p>{`${t('projects:startDate')} ${formatDate(project.startDate)}`}</p>
          )}
          {project.endDate && (
            <p>{`${t('projects:endDate')} ${formatDate(project.endDate)}`}</p>
          )}
          {Boolean(project.statistics?.totalSubGroups) && (
            <p>
              <strong>{project.statistics?.totalSubGroups}</strong>{' '}
              {t('projects:subgroups', {
                count: project.statistics?.totalSubGroups
              })}
            </p>
          )}
        </div>
      </div>

      {expandedMode && onCloseDetails && onSaved && onModeChange && (
        <ProjectDetailsExpansion
          project={project}
          projectImage={projectImage}
          mode={expandedMode}
          canUpdate={canUpdate}
          canDelete={canDelete}
          permissionsReady={permissionsReady}
          onModeChange={onModeChange}
          onClose={onCloseDetails}
          onDelete={(selectedProject) => onDelete?.(selectedProject)}
          onSaved={onSaved}
        />
      )}
    </Panel>
  )
}
