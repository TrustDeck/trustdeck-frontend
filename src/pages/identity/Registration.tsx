import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import PrimaryOutlinedButton from '../../core/components/form/buttons/PrimaryOutlinedButton'
import PrimaryButton from '../../core/components/form/buttons/PrimaryButton'
import PersonForm from './components/PersonForm'
// import BioprobeForm from './components/BioprobeForm'
import useEntityStore from './stores/EntityStore'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import DynamicForm from './components/DynamicForm'
// import BulkRegistration from './components/BulkRegistration'

export default function Registration() {
  const { entityType } = useEntityStore()
  const navigate = useNavigate()
  const { t } = useTranslation(['identity', 'entityBuilder'])

  if (!entityType) {
    return (
      <div className="flex w-full justify-center">
        <div className="my-8 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t('entityBuilder:noEntityTypeSelectedTitle')}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-gray-600 dark:text-gray-300">
            {t('entityBuilder:noEntityTypeSelectedDetail')}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <PrimaryButton
              label={t('entityBuilder:chooseEntityType')}
              onClick={() => navigate('/identity')}
            />
            <PrimaryOutlinedButton
              label={t('entityBuilder:openEntityBuilder')}
              onClick={() => navigate('/entity/manager/new')}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="items-center flex flex-col w-full">
      <div className="w-full lg:w-4/5 flex flex-row items-center relative mb-3">
        <PrimaryOutlinedButton
          label={
            <span className="hidden sm:inline">
              {t('identity:buttons.back')}
            </span>
          }
          onClick={() => navigate('/identity')}
          icon={<ArrowLeftIcon className="h-5 w-5 mr-1" />}
          className="shrink-0 absolute left-0 top-0"
        />
        <h1 className="td-page-title flex-1 text-center">
          {t('identity:headers.registration')}
        </h1>
      </div>

      {entityType === 'person' ? (
        <PersonForm />
      ) : (
        <DynamicForm entityName={entityType} />
      )}

      {/* {entityType === 'biosample' && (
        <BioprobeForm />
      )} */}
      {/* {bulk && (
        <BulkRegistration />
      )} */}
    </div>
  )
}
