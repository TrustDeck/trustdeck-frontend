import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useSearchResultsStore from './stores/SearchResultsStore'
import PrimaryButton from '../../core/components/form/buttons/PrimaryButton'
import PrimaryOutlinedButton from '../../core/components/form/buttons/PrimaryOutlinedButton'
import {
  ArrowLeftIcon,
  PencilIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import useLayoutStore from '../../core/stores/LayoutStore'
import Person from './components/Person'
import BioProbe from './components/BioProbe'
import PersonService from './services/PersonService'
import usePersonStore from './stores/PersonStore'

const EntityDetails: React.FC = () => {
  const { results } = useSearchResultsStore()
  const { editMode, setEditMode } = useLayoutStore()
  const { entityId } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const {
    lastname,
    firstname,
    birthdate,
    gender,
    email,
    phone,
    street,
    houseNumber,
    city,
    country,
    zip
  } = usePersonStore()

  const entity = useMemo(
    () => results.find((entity) => entity.trustdeckID === entityId),
    [results, entityId]
  )
  
  if (!entity) {
    return <p>No result found for ID: {entityId}</p>
  }

  async function handleSave() {
    const payload = {
      firstname,
      lastname,
      birthdate: birthdate ? new Date(birthdate).toISOString() : null,
      gender,
      phones: [...(phone ? [{ type: 'mobile', value: phone }] : [])],
      emails: [...(email ? [{ type: 'private', value: email }] : [])],
      addresses: [
        {
          type: 'home',
          street,
          houseNumber,
          zip,
          city,
          country
        }
      ],
      contactPersons: [{}]
    }
    const response = await PersonService.personUpdate(payload)
    console.log(response)
  }
          console.log(entity)

  return (
    <div>
      {/* Header */}
      <div className="relative flex justify-between items-center w-full 2xl:w-4/5 2xl:mx-auto mb-4">
        {/* Left button */}
        <div className="flex-shrink-0">
          <PrimaryOutlinedButton
            label={<span className="hidden sm:inline">{t('search:back')}</span>}
            onClick={() => navigate('/search/results')}
            icon={<ArrowLeftIcon className="h-5 w-5 mr-1" />}
          />
        </div>

        {/* Centered title */}
        <h1 className="absolute left-1/2 transform -translate-x-1/2 text-center">
          {t('search:entityView')}
        </h1>

        {/* Right buttons */}
        <div className="flex gap-2 flex-shrink-0">
          {!editMode ? (
            <PrimaryButton
              label={
                <span className="hidden sm:inline">{t('search:edit')}</span>
              }
              onClick={() => setEditMode(true)}
              icon={<PencilIcon className="h-5 w-5 mr-1" />}
            />
          ) : (
            <>
              <PrimaryOutlinedButton
                label={
                  <span className="hidden sm:inline">{t('search:cancel')}</span>
                }
                onClick={() => setEditMode(false)}
                icon={<XMarkIcon className="h-5 w-5 mr-1" />}
              />
              <PrimaryButton
                label={
                  <span className="hidden sm:inline">{t('search:save')}</span>
                }
                onClick={() => {
                  setEditMode(false)
                  handleSave()
                }}
                icon={<CheckIcon className="h-5 w-5 mr-1" />}
              />
            </>
          )}
        </div>
      </div>
      {entity.data.firstName && <Person entity={entity} editMode={editMode} />}
      {entity.type === 'bioprobe' && (
        <BioProbe entity={entity} editMode={editMode} />
      )}
    </div>
  )
}

export default EntityDetails
