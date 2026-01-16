import React, { FormEvent, useState } from 'react'
import useSearchStore from '../stores/SearchStore'
import usePseudonymStore from '../stores/PseudonymSearchResults'
import PseudonymService from '../services/PseudonymService'
import { useTranslation } from 'react-i18next'
import PrimaryButton from '../../../core/components/form/buttons/PrimaryButton'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import CustomFloatLabel from '@component/form/CustomFloatLabel'
import validation from '../../../core/utils/validation'

/**
 * The `PseudonymMask` component allows users to search for a pseudonym.
 *
 * It maintains the loading state while the search request is in progress.
 * Upon submission, it calls the `PseudonymService.searchPseudonym` method to fetch the results
 * and navigates to the pseudonym details page if the search is successful.
 *
 * @returns {JSX.Element} The rendered `PseudonymMask` component.
 */

interface PseudonymMaskProps {
  psn?: boolean
}

const PseudonymMask: React.FC<PseudonymMaskProps> = ({ psn = false }) => {
  const { t } = useTranslation() // Use multiple namespaces
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const { pseudonym, setPseudonym } = useSearchStore()
  const { setPseudonymValue } = usePseudonymStore()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await PseudonymService.searchPseudonym(pseudonym)
      if (result) {
        setPseudonymValue(result)
        navigate(`/search/pseudonym/${pseudonym}`)
      } else {
        console.error('Unexpected API response:', result)
      }
    } catch (error) {
      console.error('Error during form submission:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="my-4 gap-4 flex items-end">
          <div className='flex-1'>
            {psn && <p className='mb-2'>Lorem ipsum dolor sit amet, consetetur sadipscing elitr.</p>}
            <CustomFloatLabel
              id="pseudonym"
              value={pseudonym}
              onChange={(e) => setPseudonym(e.target.value)}
              placeholder={t('search:pseudonym.placeholder')}
              errorMessage={t('search:pseudonym.error')}
              validate={validation.isValidPseudonym}
            />
          </div>
          <PrimaryButton
            label={<span className="hidden sm:inline">{t('search:submit')}</span>}
            type="submit"
            loading={loading}
            icon={<MagnifyingGlassIcon className="h-5 w-5 mr-1" />}
          />
        </div>
      </form>
    </div>
  )
}

export default PseudonymMask
