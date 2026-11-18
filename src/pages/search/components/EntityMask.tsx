import React, { FormEvent, useEffect, useState } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

import PrimaryButton from '../../../core/components/form/buttons/PrimaryButton'
import CustomDropdown from '../../../core/components/form/CustomDropdown'
import useProjectStore from '../../../core/stores/ProjectStore'
import useSearchStore from '../stores/SearchStore'
import useSearchResultsStore from '../stores/SearchResultsStore'
import useStepperControlStore from '../../pseudonym/stores/StepperControlStore'
import ProjectService from '../../projects/services/ProjectService'
import { InlineEntityResults } from './InlineSearchResults'

interface EntityMaskProps {
  psn?: boolean
  inlineResults?: boolean
  initialEntityType?: string
  initialQuery?: string
}

const EntityMask: React.FC<EntityMaskProps> = ({
  psn = false,
  inlineResults = false,
  initialEntityType,
  initialQuery
}) => {
  const { t } = useTranslation('search')
  const [loading, setLoading] = useState(false)
  const [queryError, setQueryError] = useState('')
  const { entities, selectedProject, setEntities, setEntityAttributes } =
    useProjectStore()
  // The search starts without an entity type, so that nothing is searched before the user chooses
  const [selectedType, setSelectedType] = useState<string>(
    initialEntityType && entities.includes(initialEntityType)
      ? initialEntityType
      : ''
  )
  const { nextStep, stepperRef } = useStepperControlStore()
  const { quick, setQuick } = useSearchStore()
  const { setResults, clearResults, loadPage } = useSearchResultsStore()

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
    if (selectedType && !entities.includes(selectedType)) {
      setSelectedType('')
    }
  }, [entities, selectedType])

  useEffect(() => {
    if (initialEntityType && entities.includes(initialEntityType)) {
      setSelectedType(initialEntityType)
    }
  }, [entities, initialEntityType])

  useEffect(() => {
    if (initialQuery) setQuick(initialQuery)
  }, [initialQuery, setQuick])

  const runEntitySearch = async (query: string) => {
    const normalizedQuery = query.trim()
    if (!normalizedQuery) {
      setQueryError(t('queryRequired'))
      return
    }
    if (!selectedType) {
      setQueryError(t('entityTypeRequired'))
      return
    }
    if (!selectedProject?.abbreviation) return

    setQueryError('')
    setLoading(true)
    try {
      // A new search starts on the first page in the backend's default order
      await loadPage({
        entityTypeName: selectedType,
        projectAbbreviation: selectedProject.abbreviation,
        query: normalizedQuery,
        page: 0,
        sort: null
      })
      if (psn && useSearchResultsStore.getState().results.length > 0) {
        nextStep()
        stepperRef.current?.nextCallback()
      }
    } catch (error) {
      console.error('Error during entity search:', error)
      clearResults()
      setResults([], selectedType)
      setQueryError(t('entitySearchFailed'))
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
              emptyPlaceholder={t('entity.entityType.selectPlaceholder')}
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
