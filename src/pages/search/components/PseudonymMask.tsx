import React, { FormEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import PrimaryButton from '../../../core/components/form/buttons/PrimaryButton'
import CustomDropdown from '@component/form/CustomDropdown'
import GroupService from '../../groups/service/GroupService'
import useProjectStore from '../../../core/stores/ProjectStore'
import useSearchStore from '../stores/SearchStore'
import usePseudonymStore from '../stores/PseudonymSearchResults'
import PseudonymService from '../services/PseudonymService'
import { InlinePseudonymResults } from './InlineSearchResults'

interface PseudonymMaskProps {
  psn?: boolean
  inlineResults?: boolean
  showDomainSelector?: boolean
}

function flattenGroupOptions(nodes: any[]): { label: string; value: string }[] {
  return nodes.flatMap((node) => [
    { label: node.label, value: node.label },
    ...(node.children ? flattenGroupOptions(node.children) : [])
  ])
}

const PseudonymMask: React.FC<PseudonymMaskProps> = ({
  psn = false,
  inlineResults = false,
  showDomainSelector = true
}) => {
  const { t } = useTranslation('search')
  const [loading, setLoading] = useState(false)
  const [queryError, setQueryError] = useState('')
  const [groups, setGroups] = useState<any[]>([])
  const initialDomainSet = useRef(false)

  const { selectedProject } = useProjectStore()
  const { pseudonym, setPseudonym, group, setGroup } = useSearchStore()
  const { setResults, clearSelectedResult } = usePseudonymStore()

  useEffect(() => {
    if (!showDomainSelector) return undefined

    initialDomainSet.current = false
    GroupService.getGroups()
      .then((data) => {
        setGroups(data ?? [])
        if (
          !initialDomainSet.current &&
          !group &&
          selectedProject?.abbreviation
        ) {
          setGroup(selectedProject.abbreviation)
          initialDomainSet.current = true
        }
      })
      .catch((error) => {
        console.error('Failed to load searchable groups', error)
        setGroups([])
      })
  }, [group, selectedProject?.abbreviation, setGroup, showDomainSelector])

  const groupOptions = flattenGroupOptions(groups)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const normalizedQuery = pseudonym.trim()
    const domain =
      group || (showDomainSelector ? selectedProject?.abbreviation || '' : '')

    if (!normalizedQuery) {
      setQueryError(t('queryRequired'))
      return
    }
    if (!domain) {
      setQueryError(t('domainRequired'))
      return
    }

    setQueryError('')
    setLoading(true)
    clearSelectedResult()
    try {
      const result = await PseudonymService.searchPseudonyms(
        domain,
        normalizedQuery
      )
      setResults(
        result.map((entry) => ({
          ...entry,
          domainName: entry.domainName || domain
        }))
      )
    } catch (error) {
      console.error('Error during pseudonym search:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const inputClassName = `h-11 w-full rounded-lg border bg-white px-3 text-base text-gray-900 outline-none transition focus:ring-1 dark:bg-slate-900 dark:text-gray-100 ${
    queryError
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
      : 'border-color-light-gray focus:border-color-blue focus:ring-color-blue'
  }`

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {psn && (
          <p className="text-base text-gray-600 dark:text-gray-300">
            {t('pseudonym.searchHint')}
          </p>
        )}

        {showDomainSelector ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <label className="block w-full shrink-0 sm:w-64">
              <span className="td-field-label mb-1 block">
                {t('group.title')}
              </span>
              <CustomDropdown
                id="pseudonym-search-domain"
                value={group}
                onChange={(event) => setGroup(String(event.value ?? ''))}
                options={groupOptions}
                className="w-full"
                filter
              />
            </label>

            <label className="block min-w-0 flex-1">
              <span className="td-field-label mb-1 block">
                {t('searchQuery')}
              </span>
              <input
                id="pseudonym"
                type="text"
                value={pseudonym}
                onChange={(event) => {
                  setPseudonym(event.target.value)
                  if (queryError) setQueryError('')
                }}
                aria-invalid={Boolean(queryError)}
                className={inputClassName}
              />
            </label>

            <PrimaryButton
              label={t('submit')}
              type="submit"
              loading={loading}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
            <input
              id="pseudonym"
              type="search"
              aria-label={t('pseudonym.searchInputPlaceholder')}
              placeholder={t('pseudonym.searchInputPlaceholder')}
              value={pseudonym}
              onChange={(event) => {
                setPseudonym(event.target.value)
                if (queryError) setQueryError('')
              }}
              aria-invalid={Boolean(queryError)}
              className={inputClassName}
            />
            <PrimaryButton
              label={t('submit')}
              type="submit"
              loading={loading}
            />
          </div>
        )}

        {queryError && (
          <span className="block text-sm font-medium text-red-600">
            {queryError}
          </span>
        )}
      </form>

      {inlineResults && (
        <InlinePseudonymResults
          fallbackDomain={
            group ||
            (showDomainSelector ? selectedProject?.abbreviation || '' : '')
          }
        />
      )}
    </div>
  )
}

export default PseudonymMask
