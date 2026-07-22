import React, { FormEvent, useState } from 'react'
import useSearchStore from '../stores/SearchStore'
import useSearchResultsStore from '../stores/SearchResultsStore'
import DomainService from '../services/DomainService'
import { useTranslation } from 'react-i18next'
import PrimaryButton from '../../../core/components/form/buttons/PrimaryButton'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import CustomFloatLabel from '@component/form/CustomFloatLabel'

/**
 * The `DomainMask` component is used to search for pseudonym domains by name.
 *
 * It maintains the loading state while the search is being performed.
 * The search results are saved into the global search results store.
 *
 * @returns {JSX.Element} The rendered `DomainMask` component.
 */

interface DomainMaskProps {
  psn?: boolean
}

const DomainMask: React.FC<DomainMaskProps> = ({ psn }) => {
  const { t } = useTranslation() // Use multiple namespaces
  const [loading, setLoading] = useState(false)

  const { group, setGroup } = useSearchStore()
  const { setResults } = useSearchResultsStore()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const result = await DomainService.searchDomain(group)
    setResults(result)
    setLoading(false)
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="my-4 gap-4 flex items-end">
          <div className="flex-1">
            {psn && <p className="mb-2">{t('search:group.searchHint')}</p>}
            <CustomFloatLabel
              id="group"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              placeholder={t('search:group.placeholder')}
              errorMessage={t('search:group.error')}
            />
          </div>
          <PrimaryButton
            label={
              <span className="hidden sm:inline">{t('search:submit')}</span>
            }
            type="submit"
            loading={loading}
            icon={<MagnifyingGlassIcon className="h-5 w-5 mr-1" />}
          />
        </div>
      </form>
    </div>
  )
}

export default DomainMask
