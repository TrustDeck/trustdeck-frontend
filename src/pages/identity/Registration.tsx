import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import PrimaryOutlinedButton from '../../core/components/form/buttons/PrimaryOutlinedButton'
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
  const { t } = useTranslation()

  if (!entityType) {
    return <div>No entity selected</div>
  }

  return (
    <div className="items-center flex flex-col w-full">

      <div className="w-full lg:w-4/5 flex flex-row items-center relative mb-3">
        <PrimaryOutlinedButton
          label={<span className="hidden sm:inline">{t('identity:buttons.back')}</span>}
          onClick={() => navigate('/identity')}
          icon={<ArrowLeftIcon className="h-5 w-5 mr-1" />}
          className="shrink-0 absolute left-0 top-0"
        />
        <h1 className="flex-1 text-center">{t('identity:headers.registration')}</h1>
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
