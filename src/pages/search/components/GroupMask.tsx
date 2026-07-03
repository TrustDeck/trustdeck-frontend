import React, { FormEvent, useState } from 'react'
import useSearchStore from '../stores/SearchStore'
import useSearchResultsStore from '../stores/SearchResultsStore'
import GroupService from '../services/GroupService'
import { useTranslation } from 'react-i18next'
import PrimaryButton from '../../../core/components/form/buttons/PrimaryButton'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import CustomFloatLabel from '@component/form/CustomFloatLabel'

/**
 * The `GroupMask` component is used to search for groups by their name.
 *
 * It maintains the loading state while the search is being performed.
 * The search results are saved into the global search results store.
 *
 * @returns {JSX.Element} The rendered `GroupMask` component.
 */

interface GroupMaskProps {
  psn?: boolean
}

const GroupMask: React.FC<GroupMaskProps> = ({ psn }) => {
  const { t } = useTranslation() // Use multiple namespaces
  const [loading, setLoading] = useState(false)

  const { group, setGroup } = useSearchStore()
  const { setResults } = useSearchResultsStore()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const result = await GroupService.searchGroup(group)
    setResults(result)
    setLoading(false)
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="my-4 gap-4 flex items-end">
          <div className="flex-1">
          {psn && <p className="mb-2"> Lorem ipsum dolor sit amet, consetetur sadipscing elitr. </p>}
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

export default GroupMask
