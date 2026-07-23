import React, { FormEvent, useEffect, useState } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

import PrimaryButton from '../../../core/components/form/buttons/PrimaryButton'
import CustomDropdown from '../../../core/components/form/CustomDropdown'
import useProjectStore from '../../../core/stores/ProjectStore'
import useSearchStore from '../stores/SearchStore'
import useSearchResultsStore from '../stores/SearchResultsStore'
import useStepperControlStore from '../../pseudonym/stores/StepperControlStore'
import PersonService from '../services/PersonService'
import ProjectService from '../../projects/services/ProjectService'
import { InlineEntityResults } from './InlineSearchResults'
import TrustDeck from '../../../core/services/TrustDeck'
import type { Link } from '../../../core/types/Link'

interface EntityMaskProps {
  psn?: boolean
  inlineResults?: boolean
}

function pseudonymsToLinks(pseudonyms: any[] = []): Link[] {
  return pseudonyms
    .map((pseudonym) => ({
      group: pseudonym?.domainName ?? pseudonym?.group ?? '',
      pseudonym: pseudonym?.psn ?? pseudonym?.pseudonym ?? '',
      children: Array.isArray(pseudonym?.children)
        ? pseudonymsToLinks(pseudonym.children)
        : undefined
    }))
    .filter((link) => link.group || link.pseudonym)
}

const EntityMask: React.FC<EntityMaskProps> = ({
  psn = false,
  inlineResults = false
}) => {
  const { t } = useTranslation('search')
  const [loading, setLoading] = useState(false)
  const [queryError, setQueryError] = useState('')
  const { entities, selectedProject, setEntities, setEntityAttributes } =
    useProjectStore()
  const [selectedType, setSelectedType] = useState<string>(entities[0] ?? '')
  const { nextStep, stepperRef } = useStepperControlStore()
  const { quick, setQuick } = useSearchStore()
  const { setResults } = useSearchResultsStore()

  const normalizeEntityResult = (result: any) => {
    const trustdeckID = String(
      result?.trustdeckID ??
        result?.trustdeckId ??
        result?.trustDeckId ??
        result?.id ??
        ''
    )

    if (!result || !result.data) {
      return {
        ...result,
        trustdeckID,
        entityTypeName: result?.entityTypeName ?? selectedType,
        type: result?.type ?? selectedType
      }
    }

    const data = result.data
    const firstAddress = Array.isArray(data.address)
      ? data.address[0]
      : undefined

    return {
      ...result,
      trustdeckID,
      entityTypeName: result.entityTypeName ?? selectedType,
      type: result.type ?? selectedType,
      data: {
        ...data,
        firstName: data.firstName ?? data.firstname ?? '',
        lastName: data.lastName ?? data.lastname ?? '',
        dateOfBirth: data.dateOfBirth ?? data.birthdate ?? '',
        id: data.id ?? result.trustdeckID ?? result.trustdeckId ?? '',
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

    void refreshEntities()
    return () => {
      active = false
    }
  }, [selectedProject?.abbreviation, setEntities, setEntityAttributes])

  useEffect(() => {
    if (!entities.length) {
      setSelectedType('')
      return
    }
    if (!selectedType || !entities.includes(selectedType)) {
      setSelectedType(entities[0])
    }
  }, [entities, selectedType])

  const runEntitySearch = async (query: string) => {
    const normalizedQuery = query.trim()
    if (!normalizedQuery) {
      setQueryError(t('queryRequired'))
      return
    }
    if (!selectedType || !selectedProject?.abbreviation) return

    setQueryError('')
    setLoading(true)
    try {
      const result = await PersonService.searchEntities(
        selectedType,
        normalizedQuery,
        selectedProject.abbreviation
      )
      const normalizedResults = Array.isArray(result)
        ? await Promise.all(
            result.map(async (entry) => {
              const entity = normalizeEntityResult(entry)
              if (!entity.trustdeckID) return entity

              try {
                const pseudonyms =
                  await TrustDeck.instance().getEntityPseudonyms(
                    selectedType,
                    entity.trustdeckID,
                    selectedProject.abbreviation
                  )
                return { ...entity, links: pseudonymsToLinks(pseudonyms) }
              } catch (error) {
                console.error('Failed to load entity pseudonyms:', error)
                return entity
              }
            })
          )
        : []

      setResults(normalizedResults, selectedType)
      if (psn && normalizedResults.length > 0) {
        nextStep()
        stepperRef.current?.nextCallback()
      }
    } catch (error) {
      console.error('Error during entity search:', error)
      setResults([], selectedType)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    await runEntitySearch(quick)
  }

  const entityDropdownOptions = entities.map((entity) => ({
    label: entity,
    value: entity
  }))

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="my-4 flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="block w-full shrink-0 sm:w-64">
            <span className="td-field-label mb-1 block">
              {t('entity.entityType.title')}
            </span>
            <CustomDropdown
              id="selectedType"
              value={selectedType}
              onChange={(event) => setSelectedType(String(event.value ?? ''))}
              options={entityDropdownOptions}
              className="w-full"
            />
          </label>

          <label className="block min-w-0 flex-1">
            <span className="td-field-label mb-1 block">
              {t('searchQuery')}
            </span>
            <input
              id="quick"
              type="text"
              value={quick}
              onChange={(event) => {
                setQuick(event.target.value)
                if (queryError) setQueryError('')
              }}
              aria-invalid={Boolean(queryError)}
              className={`h-[44px] w-full rounded-lg border bg-white px-3 font-font-text text-xl font-normal text-gray-900 outline-none transition focus:ring-1 dark:bg-slate-900 dark:text-gray-100 ${
                queryError
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-color-light-gray focus:border-color-blue focus:ring-color-blue'
              }`}
            />
            {queryError && (
              <span className="mt-1 block text-sm font-medium text-red-600">
                {queryError}
              </span>
            )}
          </label>

          <PrimaryButton
            label={<span className="hidden sm:inline">{t('submit')}</span>}
            type="submit"
            loading={loading}
            icon={<MagnifyingGlassIcon className="mr-1 h-5 w-5" />}
          />
        </div>
      </form>

      {inlineResults && <InlineEntityResults entityTypeName={selectedType} />}
    </div>
  )
}

export default EntityMask
