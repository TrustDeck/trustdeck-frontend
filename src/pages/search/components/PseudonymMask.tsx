import React, { FormEvent, useEffect, useRef, useState } from 'react'
import useSearchStore from '../stores/SearchStore'
import usePseudonymStore from '../stores/PseudonymSearchResults'
import PseudonymService from '../services/PseudonymService'
import { useTranslation } from 'react-i18next'
import PrimaryButton from '../../../core/components/form/buttons/PrimaryButton'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import CustomFloatLabel from '@component/form/CustomFloatLabel'
import CustomDropdown from '@component/form/CustomDropdown'
import validation from '../../../core/utils/validation'
import { Dialog } from 'primereact/dialog'
import GroupService from '../../groups/service/GroupService'
import useProjectStore from '../../../core/stores/ProjectStore'

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

function flattenGroupOptions(nodes: any[]): { label: string; value: string }[] {
  return nodes.flatMap((n) => [
    { label: n.label, value: n.label },
    ...(n.children ? flattenGroupOptions(n.children) : [])
  ])
}

const PseudonymMask: React.FC<PseudonymMaskProps> = ({ psn = false }) => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [groups, setGroups] = useState<any[]>([])
  const [selectedDomain, setSelectedDomain] = useState<string>('')
  const initialDomainSet = useRef(false)
  const navigate = useNavigate()

  const { selectedProject } = useProjectStore()
  const { pseudonym, setPseudonym } = useSearchStore()
  const { setPseudonymValue } = usePseudonymStore()

  useEffect(() => {
    initialDomainSet.current = false
    GroupService.getGroups().then((data) => {
      setGroups(data ?? [])
      if (!initialDomainSet.current && selectedProject?.abbreviation) {
        setSelectedDomain(selectedProject.abbreviation)
        initialDomainSet.current = true
      }
    })
  }, [selectedProject?.abbreviation])

  const groupOptions = flattenGroupOptions(groups)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setShowModal(false)

    const domain = selectedDomain || selectedProject?.abbreviation
    try {
      const result = await PseudonymService.searchPseudonym(pseudonym, domain)
      if (result) {
        setPseudonymValue(result)
        navigate(
          `/search/pseudonym/${encodeURIComponent(domain ?? '')}/${encodeURIComponent(pseudonym)}`,
          { state: { returnTo: '/pseudonym-management' } }
        )
      } else {
        setShowModal(true)
      }
    } catch (error) {
      console.error('Error during form submission:', error)
      setShowModal(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="my-4 gap-4 flex flex-col sm:flex-row sm:items-end">
          {groupOptions.length > 0 && (
            <div className="w-full sm:w-48 shrink-0">
              <CustomDropdown
                id="pseudonym-search-domain"
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.value ?? '')}
                options={groupOptions}
                placeholder={t('search:group.placeholder')}
                className="w-full"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            {psn && <p className="mb-2">{t('search:pseudonym.searchHint')}</p>}
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
            label={
              <span className="hidden sm:inline">{t('search:submit')}</span>
            }
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

export default PseudonymMask
