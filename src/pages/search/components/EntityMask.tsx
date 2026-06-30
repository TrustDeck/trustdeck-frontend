import React, { FormEvent, useEffect, useMemo, useState } from 'react'
import useSearchStore from '../stores/SearchStore'
import useSearchResultsStore from '../stores/SearchResultsStore'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Divider from '../../../core/components/common/Divider'
import PrimaryButton from '../../../core/components/form/buttons/PrimaryButton'
import PrimaryOutlinedButton from '../../../core/components/form/buttons/PrimaryOutlinedButton'
import {
  CheckIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { Dialog } from 'primereact/dialog'
import SecondaryButton from '@component/form/buttons/SecondaryButton'
import CustomDropdown from '../../../core/components/form/CustomDropdown'
import CustomFloatLabel from '@component/form/CustomFloatLabel'
import useStepperControlStore from '../../pseudonym/stores/StepperControlStore'
import PersonService from '../services/PersonService'
import useProjectStore from '../../../core/stores/ProjectStore'
import ProjectService from '../../projects/services/ProjectService'
import useToastStore from '../../../core/stores/ToastStore'
import TrustDeck from '../../../core/services/TrustDeck'
import DynamicEntity from './DynamicEntity'
import { pickSchemaData } from '../utils/schemaData'

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

const setValueAtPath = (
  source: Record<string, any>,
  path: Array<string | number>,
  value: any
): Record<string, any> => {
  if (!path.length) return source
  const next = structuredClone(source ?? {})
  let cursor: any = next

  for (let i = 0; i < path.length - 1; i++) {
    const current = path[i]
    const following = path[i + 1]

    if (typeof current === 'number') {
      if (!Array.isArray(cursor)) break
      if (cursor[current] === undefined) {
        cursor[current] = typeof following === 'number' ? [] : {}
      }
      cursor = cursor[current]
    } else {
      if (cursor[current] === undefined || cursor[current] === null) {
        cursor[current] = typeof following === 'number' ? [] : {}
      }
      cursor = cursor[current]
    }
  }

  const leaf = path[path.length - 1]
  if (typeof leaf === 'number' && Array.isArray(cursor)) {
    cursor[leaf] = value
  } else if (typeof leaf === 'string') {
    cursor[leaf] = value
  }

  return next
}

const initialValueForAttribute = (attr: any): any => {
  if (attr.type === 'boolean') return false
  if (attr.type === 'integer' || attr.type === 'number') return ''
  return ''
}

const buildInitialEntityData = (attributes: any[] = []): Record<string, any> => {
  const data: Record<string, any> = {}

  attributes.forEach((attr) => {
    if (attr.layout === 'row' && Array.isArray(attr.attributes)) {
      Object.assign(data, buildInitialEntityData(attr.attributes))
      return
    }

    if (Array.isArray(attr.attributes)) {
      const nested = buildInitialEntityData(attr.attributes)
      if (attr.name) {
        data[attr.name] = attr.repeatable ? [nested] : nested
      } else {
        Object.assign(data, nested)
      }
      return
    }

    if (attr.name) data[attr.name] = initialValueForAttribute(attr)
  })

  return data
}

const EntityMask: React.FC<EntityMaskProps> = ({ psn = false }) => {
  const { t } = useTranslation() // Use multiple namespaces
  const showToast = useToastStore((state) => state.show)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [creatingEntity, setCreatingEntity] = useState(false)
  const [createFormData, setCreateFormData] = useState<Record<string, any>>({})
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

  const selectedSchema = useMemo(
    () =>
      entityAttributes.find(
        (definition) =>
          definition.name?.toLowerCase() === selectedType?.toLowerCase()
      ),
    [entityAttributes, selectedType]
  )

  const selectedSchemaAttributes = useMemo(
    () => selectedSchema?.typeDefinition?.attributes ?? [],
    [selectedSchema]
  )

  const normalizeEntityResult = (result: any) => {
    if (!result || !result.data) return result

    const data = result.data
    const firstAddress = Array.isArray(data.address) ? data.address[0] : undefined

    return {
      ...result,
      data: {
        ...data,
        firstName: data.firstName ?? data.firstname ?? '',
        lastName: data.lastName ?? data.lastname ?? '',
        dateOfBirth: data.dateOfBirth ?? data.birthdate ?? '',
        id: data.id ?? result.trustdeckID ?? '',
        street: data.street ?? firstAddress?.street ?? '',
        houseNumber: data.houseNumber ?? data.housenumber ?? firstAddress?.housenumber ?? '',
        postalCode:
          data.postalCode ?? data.postalcode ?? data.zip ?? data.plz ?? firstAddress?.postalcode ?? '',
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
    if (!createModalOpen) return
    setCreateFormData(buildInitialEntityData(selectedSchemaAttributes))
  }, [createModalOpen, selectedSchemaAttributes])

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setShowModal(false)
    try {
      const result = await PersonService.fuzzySearch(selectedType, quick)
      if (psn && result.length > 0) {
        handleNext()
      }
      if (Array.isArray(result)) {
        if (result.length === 0) {
          setResults([])
          setShowModal(true)
          return
        } else {
          setResults(result.map(normalizeEntityResult))
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

  const handleCreateFieldChange = (
    path: Array<string | number>,
    value: any
  ) => {
    setCreateFormData((prev) => setValueAtPath(prev, path, value))
  }

  const openCreateEntityModal = () => {
    setCreateFormData(buildInitialEntityData(selectedSchemaAttributes))
    setCreateModalOpen(true)
  }

  const closeCreateEntityModal = () => {
    if (creatingEntity) return
    setCreateModalOpen(false)
  }

  const handleCreateEntity = async () => {
    if (!selectedType) return
    setCreatingEntity(true)
    try {
      const dataToSave = selectedSchemaAttributes.length
        ? pickSchemaData(selectedSchemaAttributes, createFormData)
        : createFormData
      const created = await TrustDeck.instance().postEntity(selectedType, {
        data: dataToSave
      })
      const normalized = normalizeEntityResult(created)
      setResults([normalized])
      setCreateModalOpen(false)
      showToast({
        severity: 'success',
        summary: t('search:createEntity', 'Create entity'),
        detail: t('search:createSuccess', 'Entity created successfully.'),
        life: 3000
      })
      const createdId = normalized?.trustdeckID ?? normalized?.id
      if (createdId && !psn) navigate(`/search/${createdId}`)
    } catch (error) {
      console.error('Failed to create entity', error)
      showToast({
        severity: 'error',
        summary: t('search:createEntity', 'Create entity'),
        detail:
          error instanceof Error
            ? error.message
            : t('search:createFailed', 'Failed to create entity.'),
        life: 5000
      })
    } finally {
      setCreatingEntity(false)
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
          <div className="flex-1 min-w-0">
            <CustomDropdown
              id="selectedType"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              options={entityDropdownOptions}
            />
          </div>
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
          {!psn && (
            <PrimaryOutlinedButton
              label={t('search:createEntity', 'Create entity')}
              type="button"
              onClick={openCreateEntityModal}
              icon={<PlusIcon className="h-5 w-5 mr-1" />}
              disabled={!selectedType}
            />
          )}
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
        <Dialog
          visible={createModalOpen}
          onHide={closeCreateEntityModal}
          header={t('search:createEntity', 'Create entity')}
          closable
          dismissableMask={!creatingEntity}
          style={{ width: '1100px', maxWidth: '95vw' }}
          className="mx-auto"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <p className="text-base font-medium">
                {t('search:entity.entityType.title')}
              </p>
              <div className="flex-1 min-w-0">
                <CustomDropdown
                  id="create-selected-type"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.value)}
                  options={entityDropdownOptions}
                />
              </div>
            </div>

            {selectedSchemaAttributes.length > 0 ? (
              <DynamicEntity
                entity={{
                  data: createFormData,
                  entityTypeName: selectedType,
                  type: selectedType,
                  trustdeckID: ''
                }}
                schemaAttributes={selectedSchemaAttributes}
                editMode
                formData={createFormData}
                onFieldChange={handleCreateFieldChange}
                showIdentifierPanel={false}
              />
            ) : (
              <p className="rounded-lg border border-dashed border-gray-300 p-4 text-gray-600">
                {t(
                  'search:noEntitySchema',
                  'No type definition is available for the selected entity type.'
                )}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <PrimaryOutlinedButton
                label={t('search:cancel')}
                onClick={closeCreateEntityModal}
                icon={<XMarkIcon className="h-5 w-5 mr-1" />}
                disabled={creatingEntity}
              />
              <PrimaryButton
                label={t('search:create', 'Create')}
                onClick={handleCreateEntity}
                loading={creatingEntity}
                disabled={!selectedType || selectedSchemaAttributes.length === 0}
                icon={<CheckIcon className="h-5 w-5 mr-1" />}
              />
            </div>
          </div>
        </Dialog>
      </form>
    </div>
  )
}

export default EntityMask
