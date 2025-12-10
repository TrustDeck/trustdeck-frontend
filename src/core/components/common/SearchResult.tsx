import Panel from '../../../core/components/common/Panel'
import PrimaryButton from '../../../core/components/form/buttons/PrimaryButton'
import PrimaryOutlinedButton from '../../../core/components/form/buttons/PrimaryOutlinedButton'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CakeIcon } from '@heroicons/react/24/outline'
import { IdentificationIcon } from '@heroicons/react/24/outline'
import { PencilIcon } from '@heroicons/react/24/solid'
import { CheckIcon } from '@heroicons/react/24/outline'
import { BeakerIcon } from '@heroicons/react/24/outline'
import { MapPinIcon } from '@heroicons/react/24/outline'
import useStepperControlStore from '../../../pages/pseudonym/stores/StepperControlStore'
import usePersonStore from '../../../pages/search/stores/PersonStore'
import useBioProbeStore from '../../../pages/search/stores/BioSampleStore'
import useLayoutStore from '../../stores/LayoutStore'
import { PersonType } from '../../../core/types/PersonEntity'
import useSelectedEntityStore from '../../../pages/pseudonym/stores/SelectedEntityStore'
/**
 * Displays a single search result in a panel with key details.
 * Provides actions to edit or select the result.
 *
 * @component
 * @param {SearchResultProps} props - The component props.
 * @returns {JSX.Element} A panel containing search result details and action buttons.
 */

type BioProbeResult = {
  id: string
  type: 'bioprobe'
  number: string
  location: string
  date: Date
  contents: string
}

type SearchResult = PersonType | BioProbeResult | any

interface SearchResultProps {
  result: SearchResult
  duplicate?: boolean
  pseudonymization?: boolean
  newPerson?: boolean
  recent?: boolean
  type?: 'person' | 'bioprobe'
}

const SearchResult: React.FC<SearchResultProps> = ({
  result,
  duplicate,
  pseudonymization,
  newPerson,
  recent,
  type
}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  // needed to move to the second step in the pseudonymization workflow
  const { nextStep, stepperRef } = useStepperControlStore()
  const { setEditMode } = useLayoutStore()
  const { setSelectedEntityId } = useSelectedEntityStore()

  function handleNext() {
    nextStep()
    stepperRef.current?.nextCallback()
  }
  return (
    <Panel>
      <div className="sm:flex sm:justify-between sm:items-center my-3">
        {/* Person result */}
        {type === 'person' || 'firstName' in result.data && (
          <>
            <div>
              <h3 className="flex">
                {result.data.firstName} {result.data.lastName}
              </h3>
              <div className="flex space-x-8">
                <p className="flex">
                  <CakeIcon className="h-5 w-5 mr-1" />{' '}
                  {result.data.dateOfBirth && result.data.dateOfBirth.split('T')[0]}
                </p>
                {!newPerson && (
                  <p className="flex">
                    <IdentificationIcon className="h-5 w-5 mr-1" />
                    {result.trustdeckID}
                  </p>
                )}
              </div>
            </div>
            <div className="flex space-x-3 mt-3 sm:mt-0 justify-around sm:justify-normal">
              {!duplicate && !pseudonymization && !recent && (
                <PrimaryOutlinedButton
                  label={t('search:edit')}
                  icon={<PencilIcon className="h-5 w-5 mr-1" />}
                  onClick={() => {
                    navigate(`/search/${result.trustdeckID}`)
                    setEditMode(true)
                  }}
                />
              )}
              {!newPerson && (
                <PrimaryButton
                  label={t('search:select')}
                  icon={<CheckIcon className="h-5 w-5 mr-1" />}
                  onClick={() => {
                    if ('firstName' in result) {
                      usePersonStore.getState().loadEntity(result)

                    }
                    if (duplicate) {
                      navigate(`/identity/duplicates/${result.trustdeckID}`)
                    } else if (pseudonymization) {
                      setSelectedEntityId(result.trustdeckID)
                      handleNext()
                    } else {
                      navigate(`/search/${result.trustdeckID}`)
                    }
                  }}
                />
              )}
            </div>
          </>
        )}
        {/* Bioprobe result */}
        {type === 'bioprobe' && (
          <>
            <div>
              <h3 className="flex">{result.id}</h3>
              <div className="flex space-x-8">
                <p className="flex">
                  <BeakerIcon className="h-5 w-5 mr-1" /> {result.contents}
                </p>
                <p className="flex">
                  <MapPinIcon className="h-5 w-5 mr-1" />
                  {result.location}
                </p>
              </div>
            </div>
            <div className="flex space-x-3 mt-3 sm:mt-0 justify-around sm:justify-normal">
              {!duplicate && !pseudonymization && (
                <PrimaryOutlinedButton
                  label={t('search:edit')}
                  icon={<PencilIcon className="h-5 w-5 mr-1" />}
                  onClick={() => {
                    navigate(`/search/${result.id}`)
                    setEditMode(true)
                  }}
                />
              )}
              <PrimaryButton
                label={t('search:select')}
                icon={<CheckIcon className="h-5 w-5 mr-1" />}
                onClick={() => {
                  if (result.type === 'bioprobe') {
                    useBioProbeStore.getState().loadEntity(result)
                  }
                  if (duplicate) {
                    navigate(`/identity/duplicates/${result.id}`)
                  } else if (pseudonymization) {
                    handleNext()
                  } else {
                    navigate(`/search/${result.id}`)
                  }
                }}
              />
            </div>
          </>
        )}
      </div>
    </Panel>
  )
}

export default SearchResult
