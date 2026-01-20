import React, { FormEvent, useState } from 'react'
import useSearchStore from '../stores/SearchStore'
import useSearchResultsStore from '../stores/SearchResultsStore'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Divider from '../../../core/components/common/Divider'
import PrimaryButton from '../../../core/components/form/buttons/PrimaryButton'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { Dialog } from 'primereact/dialog'
import SecondaryButton from '@component/form/buttons/SecondaryButton'
import CustomDropdown from '../../../core/components/form/CustomDropdown'
import BioProbeService from '../services/BioProbeService'
import CustomFloatLabel from '@component/form/CustomFloatLabel'
import validation from '../../../core/utils/validation'
import useStepperControlStore from '../../pseudonym/stores/StepperControlStore'
import PersonService from '../services/PersonService'
import useProjectStore from '../../../core/stores/ProjectStore'
import DynamicForm from '../../identity/components/DynamicForm'

/**
 * EntityMask Component
 *
 * Provides a search form for different entity types (Person, Biosample).
 * Fields dynamically change based on the selected entity type.
 *
 * @component
 * @returns {JSX.Element} The search form for entity-based queries.
 */

interface EntityMaskProps {
  psn?: boolean
}

const EntityMask: React.FC<EntityMaskProps> = ({ psn = false }) => {
  const { t } = useTranslation() // Use multiple namespaces
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const { entities } = useProjectStore()
  const [selectedType, setSelectedType] = useState<string>(entities[0])
  const navigate = useNavigate()
  // needed to move to the second step in the pseudonymization workflow
  const { nextStep, stepperRef } = useStepperControlStore()

  function handleNext() {
    nextStep()
    stepperRef.current?.nextCallback()
  }

  // Retrieve search-related state and update functions
  const {
    lastname,
    setLastname,
    firstname,
    setFirstname,
    phone,
    setPhone,
    // idType,
    // setIdType,
    // identifier,
    // setIdentifier,
    street,
    setStreet,
    houseNumber,
    setHousenumber,
    city,
    setCity,
    zip,
    setZip,
    quick,
    setQuick
  } = useSearchStore()

  const { setResults } = useSearchResultsStore()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setShowModal(false)
    try {
      let result
      if (selectedType === 'person') {
        result = await PersonService.fuzzySearch('person', quick)
        if (psn) {
          handleNext()
        }
      } else if (selectedType === 'bioprobe') {
        result = await BioProbeService.searchBioProbe()
      }
      if (Array.isArray(result)) {
        if (result.length === 0) {
          setResults([])
          setShowModal(true)
          return
        } else {
          setResults(result)
          // if searching for an entity to create a pseudonym, the component will not navigate to /search/results
          if (!psn) navigate('/search/results')
        }
      } else {
        console.error('Unexpected API response:', result)
        setResults([])
        setShowModal(true)
      }
    } catch (error) {
      console.error('Error during form submission:', error)
      setResults([])
      setShowModal(true)
    } finally {
      setLoading(false)
    }
  }

  // Dropdown options for selecting entity type
  const entityDropdownOptions = entities.map((entity) => ({
    label: entity,
    value: entity
  }))

  // Dropdown options for ID type selection
  // const idDropdownOptions = [
  //   { label: t('search:entity.person.idType.caseNumber'), value: 'caseNumber' },
  //   { label: t('search:entity.person.idType.patientId'), value: 'patientId' }
  // ]

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="flex items-center gap-2 mt-4">
          <p className="text-base">{t('search:entity.entityType.title')}</p>
          <div className="flex-1">
            <CustomDropdown
              id="selectedType"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              options={entityDropdownOptions}
              className="col-span-1 form-grid"
              helpText={t('search:entity.entityType.help')}
            />
          </div>
        </div>

        <Divider />

        <CustomFloatLabel
          id="quick"
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          placeholder={t('search:entity.person.quick.placeholder')}
        />

        <Divider />

        {selectedType === 'person' && (
          <div>
            <div className="sm:form-grid space-y-5 sm:space-y-0">
              <CustomFloatLabel
                id="lastname"
                value={lastname}
                onChange={(e) => setLastname(e.target.value)}
                placeholder={t('search:entity.person.lastname.placeholder')}
                errorMessage={t('search:entity.person.lastname.error')}
                validate={validation.isValidName}
              />
              <CustomFloatLabel
                id="firstname"
                value={firstname}
                onChange={(e) => setFirstname(e.target.value)}
                placeholder={t('search:entity.person.firstname.placeholder')}
                errorMessage={t('search:entity.person.firstname.error')}
                validate={validation.isValidName}
              />
              <CustomFloatLabel
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('search:entity.person.phone.placeholder')}
                errorMessage={t('search:entity.person.phone.error')}
                validate={validation.isValidPhone}
              />
            </div>

            {/* <Divider />

            <div className="form-grid">
              <CustomDropdown
                id="idType"
                placeholder={t('search:entity.person.idType.placeholder')}
                value={idType}
                onChange={(e) => setIdType(e.target.value)}
                options={idDropdownOptions}
              />
              <CustomFloatLabel
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Identifier"
              />
            </div> */}

            <Divider />

            <div className="form-grid">
              <CustomFloatLabel
                id="street"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder={t('search:entity.person.street.placeholder')}
                validate={validation.isValidStreet}
                errorMessage={t('search:entity.person.street.error')}
              />
              <CustomFloatLabel
                id="houseNumber"
                value={houseNumber}
                onChange={(e) => setHousenumber(e.target.value)}
                placeholder={t('search:entity.person.houseNumber.placeholder')}
                validate={validation.isValidHouseNumber}
                errorMessage={t('search:entity.person.houseNumber.error')}
              />
              <CustomFloatLabel
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t('search:entity.person.city.placeholder')}
                validate={validation.isValidCity}
                errorMessage={t('search:entity.person.city.error')}
              />
              <CustomFloatLabel
                id="zip"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder={t('search:entity.person.zip.placeholder')}
                validate={validation.isValidZip}
                errorMessage={t('search:entity.person.zip.error')}
              />
            </div>
          </div>
        )}
        {selectedType !== 'person' && (
          <DynamicForm entityName={selectedType} variant="search" />
        )}
        {/* {selectedType === 'bioprobe' && (
          <div className="bioprobe-fields">
            <div className="form-grid">w
              <CustomFloatLabel
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t('search:entity.biosample.location.placeholder')}
                errorMessage={t('search:entity.biosample.location.error')}
                validate={validation.isValidLocation}
              />
              <CustomFloatLabel
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder={t('search:entity.biosample.date.placeholder')}
                errorMessage={t('search:entity.biosample.date.error')}
              />
              <CustomFloatLabel
                id="sampleNumber"
                value={sampleNumber}
                onChange={(e) => setSampleNumber(e.target.value)}
                placeholder={t(
                  'search:entity.biosample.sampleNumber.placeholder'
                )}
                errorMessage={t('search:entity.biosample.sampleNumber.error')}
                validate={validation.isValidLocation}
              />
            </div>
          </div>
        )}

        <Divider /> */}
        <div className="flex justify-end mt-4">
          <PrimaryButton
            label={t('search:submit')}
            type="submit"
            loading={loading}
            icon={<MagnifyingGlassIcon className="h-5 w-5 mr-1" />}
          />
        </div>
        <Dialog
          visible={showModal}
          onHide={() => setShowModal(false)}
          header={t('search:results')}
          closable
          dismissableMask
          style={{ width: '600px', maxWidth: '90vw' }}
          className="mx-auto"
        >
          <div className="flex flex-col gap-4">
            <p className="text-base">{t('search:noResults')}</p>
            <div className="flex justify-end">
              <SecondaryButton
                label={t('search:research')}
                onClick={() => setShowModal(false)}
              />
            </div>
          </div>
        </Dialog>
      </form>
    </div>
  )
}

export default EntityMask