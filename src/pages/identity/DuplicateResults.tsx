import Panel from '../../core/components/common/Panel'
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import SearchResult from '../../core/components/common/SearchResult'
import SecondaryButton from '../../core/components/form/buttons/SecondaryButton'
import useDuplicatesStore from './stores/DuplicatesStore'
import { useTranslation } from 'react-i18next'
import PrimaryOutlinedButton from '../../core/components/form/buttons/PrimaryOutlinedButton'
import { useNavigate } from 'react-router-dom'
// import useInputStore from './stores/InputStore'
import Divider from '@component/common/Divider'

export default function DuplicateResults() {
  const { duplicates, newEntry } = useDuplicatesStore()
  const { t } = useTranslation()
  const navigate = useNavigate()
  console.log(newEntry)
  // const {
  //   firstname,
  //   lastname,
  //   birthdate,
  //   gender,
  //   phone,
  //   secondPhone,
  //   email,
  //   street,
  //   houseNumber,
  //   city,
  //   zip
  // } = useInputStore()

  return (
    <div className="flex flex-col items-center w-full">
      <div className="flex justify-center mb-4">
        <PrimaryOutlinedButton
          label={<span className="hidden sm:inline">{t('search:back')}</span>}
          onClick={() => navigate('/identity/register')}
          icon={<ArrowLeftIcon className="h-5 w-5 mr-1" />}
          // TODO: fix alignment of 'back' button on screensize small and larger
          className="absolute left-4 sm:left-20"
        />
        <h1 className="mb-3">{t('identity:duplicate.header')}</h1>
      </div>

      <Panel className="mb-6 !border-2 !border-red-600">
        <div className="flex items-center justify-between border-solid">
          <ExclamationTriangleIcon className="hidden sm:inline h-14 w-14 text-red-600 flex-none" />
          <h3 className="ml-4">{t('identity:duplicate.duplicateFound')}</h3>
        </div>
      </Panel>
        <SearchResult
          result={{
            id: 'new-person',
            firstname: newEntry?.firstName ?? '',
            lastname: newEntry?.lastName ?? '',
            dateOfBirth: newEntry?.dateOfBirth ? new Date(newEntry.dateOfBirth).toISOString().split('T')[0] : '',
            gender: newEntry?.administrativeGender ?? '',
            phones: newEntry?.phoneNumber ?? [],
            emails: newEntry?.email ?? [],
            addresses: newEntry?.street ?? [],
            contactPersons: newEntry?.contactFirstName ?? []
          }}
          duplicate
          newPerson
        />
      <Divider />
      <Panel className="mb-6 !border-2 !border-red-600">
        <div className="flex items-center justify-between border-solid">
          <h4 className="ml-4">
            {t('identity:duplicate.compareData')}
          </h4>
        </div>
      </Panel>
      {duplicates.map((duplicate) => (
        <div key={duplicate.identifiers[0].identifier} className="my-2 flex w-full justify-center">
          <SearchResult result={duplicate} duplicate />
        </div>
      ))}
      <SecondaryButton
        className="mt-6 lg:mt-12"
        label={t('identity:buttons.notDuplicate')}
      />
    </div>
  )
}
