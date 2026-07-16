import React, { FormEvent, useEffect, useState } from 'react'
import useSearchStore from '../stores/SearchStore'
import useSearchResultsStore from '../stores/SearchResultsStore'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Divider from '../../../core/components/common/Divider'
import PrimaryButton from '../../../core/components/form/buttons/PrimaryButton'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { Dialog } from 'primereact/dialog'
import CustomDropdown from '../../../core/components/form/CustomDropdown'
import CustomFloatLabel from '@component/form/CustomFloatLabel'
import useStepperControlStore from '../../pseudonym/stores/StepperControlStore'
import PersonService from '../services/PersonService'
import useProjectStore from '../../../core/stores/ProjectStore'
import ProjectService from '../../projects/services/ProjectService'

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
  const {
    entities,
    entityAttributes,
    selectedProject,
    setEntities,
    setEntityAttributes
  } = useProjectStore()
  const [selectedType, setSelectedType] = useState<string>(entities[0])
  const navigate = useNavigate()
  // needed to move to the second step in the pseudonymization workflow
  const { nextStep, stepperRef } = useStepperControlStore()

  function handleNext() {
    nextStep()
    stepperRef.current?.nextCallback()
  }

  // Retrieve search-related state and update functions
  const { quick, setQuick } = useSearchStore()

  const { setResults } = useSearchResultsStore()

  const normalizeEntityResult = (result: any) => {
    if (!result || !result.data) return result

    const data = result.data
    const firstAddress = Array.isArray(data.address)
      ? data.address[0]
      : undefined

    return {
      ...result,
      data: {
        ...data,
        firstName: data.firstName ?? data.firstname ?? '',
        lastName: data.lastName ?? data.lastname ?? '',
        dateOfBirth: data.dateOfBirth ?? data.birthdate ?? '',
        id: data.id ?? result.trustdeckID ?? '',
        street: data.street ?? firstAddress?.street ?? '',
        houseNumber:
          data.houseNumber ??
          data.housenumber ??
          firstAddress?.housenumber ??
          '',
        postalCode:
          data.postalCode ??
          data.postalcode ??
          data.zip ??
          data.plz ??
          firstAddress?.postalcode ??
          '',
        city: data.city ?? firstAddress?.city ?? '',
        country: data.country ?? firstAddress?.country ?? ''
      }
    }
  }

  useEffect(() => {
    let active = true
    async function refreshEntities() {
      if (!selectedProject?.abbreviation) return
      try {
        const fetched = await ProjectService.getProjectEntities()
        const attributes = await ProjectService.getEntityAttributes()
        if (!active) return
        setEntities(fetched)
        setEntityAttributes(attributes)
      } catch (error) {
        console.error('Failed to refresh project entities', error)
      }
    }
    refreshEntities()
    return () => {
      active = false
    }
  }, [selectedProject?.abbreviation, setEntities, setEntityAttributes])

  useEffect(() => {
    if (!entities.length) return
    if (!selectedType || !entities.includes(selectedType)) {
      setSelectedType(entities[0])
    }
  }, [entities, selectedType])

  useEffect(() => {
    const hasRowLayout = (attrs: any[] | undefined): boolean => {
      if (!attrs?.length) return false
      return attrs.some((attr) => {
        if (attr.layout === 'row' && Array.isArray(attr.attributes)) return true
        if (Array.isArray(attr.attributes)) return hasRowLayout(attr.attributes)
        return false
      })
    }

    const personEntity = entityAttributes.find((e) => e.name === 'person')
    const isLegacyShape =
      !!personEntity && !hasRowLayout(personEntity.typeDefinition.attributes)

    if (isLegacyShape) {
      ;(async () => {
        const refreshed = await ProjectService.getEntityAttributes()
        setEntityAttributes(refreshed)
      })().catch((error) => {
        console.error('Failed to refresh entity attributes', error)
      })
    }
  }, [entityAttributes, setEntityAttributes])

  const runEntitySearch = async (query: string) => {
    setLoading(true)
    setShowModal(false)
    try {
      const result = await PersonService.fuzzySearch(selectedType, query)
      if (psn && result.length > 0) {
        handleNext()
      }
      if (Array.isArray(result)) {
        if (result.length === 0) {
          setResults([])
          setShowModal(true)
          return
        }
        setResults(result.map(normalizeEntityResult))
        // if searching for an entity to create a pseudonym, the component will not navigate to /search/results
        if (!psn) navigate('/search/results')
      } else {
        console.error('Unexpected API response:', result)
        setResults([])
        setShowModal(true)
      }
    } catch (error) {
      console.error('Error during entity search:', error)
      setResults([])
      setShowModal(true)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await runEntitySearch(quick)
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
        <div className="mt-4">
          <CustomDropdown
            id="selectedType"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            options={entityDropdownOptions}
            placeholder={t('search:entity.entityType.title')}
          />
        </div>

        <Divider />
        <div className="relative my-4">
          <CustomFloatLabel
            id="quick"
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
            placeholder={t('search:entity.person.quick.placeholder')}
          />
        </div>
        <Divider />
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
        <div className="flex flex-wrap justify-end gap-2 mt-4">
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
              <PrimaryButton
                label={t('search:ok', 'Ok')}
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
