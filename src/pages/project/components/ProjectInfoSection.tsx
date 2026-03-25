import Panel from '@component/common/Panel'
import type { TFunction } from 'i18next'
import { formatDate } from '../../../core/utils/date'
import type { ProjectType } from '../../projects/types/ProjectType'

type SelectedProjectSummary = { abbreviation: string; name: string } | null

type Props = {
  t: TFunction
  projectDetails: ProjectType | null
  selectedProject: SelectedProjectSummary
}

export default function ProjectInfoSection({ t, projectDetails, selectedProject }: Props) {
  return (
    <Panel title={t('settings:projectInfo')} className="w-full max-w-4xl mt-4">
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-font-text">
        <div>
          <dt className="text-sm text-gray-500">{t('settings:projectName')}</dt>
          <dd className="font-medium">{projectDetails?.name ?? selectedProject?.name ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-sm text-gray-500">{t('settings:projectAbbreviation')}</dt>
          <dd className="font-medium">
            {projectDetails?.abbreviation ?? selectedProject?.abbreviation ?? '—'}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-gray-500">{t('settings:projectStartDate')}</dt>
          <dd className="font-medium">
            {projectDetails?.startDate ? formatDate(projectDetails.startDate) : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-gray-500">{t('settings:projectEndDate')}</dt>
          <dd className="font-medium">
            {projectDetails?.endDate ? formatDate(projectDetails.endDate) : '—'}
          </dd>
        </div>
      </dl>
    </Panel>
  )
}
