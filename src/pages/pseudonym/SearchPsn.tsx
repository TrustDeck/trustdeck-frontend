import Panel from '../../core/components/common/Panel'
import { useEffect, useRef } from 'react'
import useSearchResultsStore from '../search/stores/SearchResultsStore'
import useGroupStore from './stores/GroupStore'
import { Stepper } from 'primereact/stepper'
import { StepperPanel } from 'primereact/stepperpanel'
import SearchMask from '../search/SearchMask'
import SearchResult from '../../core/components/common/SearchResult'
import useStepperControlStore from './stores/StepperControlStore'
import GroupService from '../groups/service/GroupService'
import { useTranslation } from 'react-i18next'
import SecondaryButton from '@component/form/buttons/SecondaryButton'
import CustomTreeSelect from '@component/form/CustomTreeSelect'
import { PseudonymService } from './services/PseudonymService'
import useSelectedEntityStore from './stores/SelectedEntityStore'
import { getSelectedGroupNames } from './utils/findNodeLabelByKey'
import { useNavigate } from 'react-router-dom'
import usePseudonymStore from '../search/stores/PseudonymSearchResults'
import SearchPseudonymService from '../search/services/PseudonymService'
import PrimaryOutlinedButton from '@component/form/buttons/PrimaryOutlinedButton'
import { ArrowUpIcon } from '@heroicons/react/24/outline'
// import { Toast } from 'primereact/toast'

export default function SearchPsn() {
  const { results, clearResults } = useSearchResultsStore()
  const { stepperRef, setStepperRef, previousStep, setCurrentStep } = useStepperControlStore()
  const { groups, selectedGroup, setGroups, setSelectedGroup } = useGroupStore()
  const { selectedEntityId, setSelectedEntityId } = useSelectedEntityStore()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setPseudonymValue } = usePseudonymStore()

  const localStepperRef = useRef<any | null>(null)

  useEffect(() => {
    setStepperRef(localStepperRef)
    clearResults()

    const loadGroups = async () => {
      const data = await GroupService.getGroups()
      setGroups(data)
    }

    loadGroups()
  }, [setStepperRef, clearResults, setGroups])

  async function handleClick() {
    const selectedGroupNames = getSelectedGroupNames(selectedGroup, groups)
    const identifier = selectedEntityId.identifier || crypto.randomUUID()
    const idType = selectedEntityId.identifierType || 'standalone-pseudonym'
    const payload = {
      identifierItem: {
        "identifier": identifier.toString(),
        "idType": idType
      }
    }
    try {
      // run all pseudonym creations in parallel
      console.log(payload)
      const responses = await Promise.all(
        selectedGroupNames.map((groupName) =>
          PseudonymService.createPseudonym(payload, groupName)
        )
      )
      console.log(responses)

      // Each response should be an array; extract pseudonyms
      const pseudonyms = responses
        .flat()
        .map((res: any) => res.psn)
        .filter(Boolean)

      console.log('Created pseudonyms:', pseudonyms)

      // Fetch full pseudonym details in the domain where it was created, set store, then navigate
      if (pseudonyms.length > 0 && selectedGroupNames.length > 0) {
        const firstPsn = pseudonyms[0]
        const firstGroup = selectedGroupNames[0]
        const pseudonymData = await SearchPseudonymService.searchPseudonym(firstPsn, firstGroup)
        if (pseudonymData) setPseudonymValue(pseudonymData)
        navigate(`/search/pseudonym/${encodeURIComponent(firstGroup)}/${encodeURIComponent(firstPsn)}`)
      } else if (pseudonyms.length > 0) {
        navigate(`/search/pseudonym/${pseudonyms[0]}`)
      }

      // Optionally: show toast for all created pseudonyms
    } catch (error) {
      console.error('Error creating pseudonyms:', error)
    }
  }

  function handleStandalonePseudonym() {
    setSelectedEntityId({
      identifier: crypto.randomUUID(),
      identifierType: 'standalone-pseudonym'
    })
    stepperRef.current?.setActiveStep?.(2)
    setCurrentStep(3)
  }

  // Typ-sicherer Change-Handler für TreeSelect/CustomTreeSelect
  const handleGroupChange = (e: any) => {
    setSelectedGroup(e.value)
  }

  return (
    <div className="w-full flex flex-col items-center">
      <h1>{t('pseudonyms:headers.title')}</h1>
      <Panel>
        <Stepper ref={stepperRef} orientation="vertical" linear>
          {/* Step 1 - Search */}
          <StepperPanel header={t('pseudonyms:headers.stepone')}>
            <SearchMask psn />
            <div className="mt-6 rounded-lg border border-dashed border-gray-300 p-4 text-center dark:border-slate-700">
              <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
                {t('pseudonyms:standalone.description')}
              </p>
              <PrimaryOutlinedButton
                label={t('pseudonyms:buttons.generateStandalone')}
                onClick={handleStandalonePseudonym}
              />
            </div>
          </StepperPanel>

          {/* Step 2 - Results */}
          <StepperPanel header={t('pseudonyms:headers.steptwo')}>
              {results.map((result) => (
                <div
                  key={result.trustdeckID}
                  className="my-4 flex justify-center"
                >
                  <SearchResult pseudonymization result={result} />
                </div>
              ))}
              <PrimaryOutlinedButton
              label={
                <span className="flex items-center gap-2">
                  {t('identity:buttons.back')}
                  <ArrowUpIcon className="h-5 w-5" />
                </span>
              }
              onClick={() => previousStep()}
            />
          </StepperPanel>

          {/* Step 3 - Group selection */}
          <StepperPanel header={t('pseudonyms:headers.stepthree')}>
            {selectedEntityId.identifierType === 'standalone-pseudonym' && (
              <p className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-color-blue dark:bg-blue-950/40 dark:text-blue-100">
                {t('pseudonyms:standalone.selected')}
              </p>
            )}
            <CustomTreeSelect
              id="group"
              placeholder={t('pseudonyms:selectGroup')}
              value={selectedGroup || null}
              options={groups || []}
              onChange={handleGroupChange}
              selectionMode="single"
            />
            <div className="flex justify-between mt-6">
            <PrimaryOutlinedButton
              label={
                <span className="flex items-center gap-2">
                  {t('identity:buttons.back')}
                  <ArrowUpIcon className="h-5 w-5" />
                </span>
              }
              onClick={() => previousStep()}
            />
              <SecondaryButton
                label={t('pseudonyms:buttons.generate')}
                onClick={() => handleClick()}
              />
            </div>
          </StepperPanel>
        </Stepper>
      </Panel>
    </div>
  )
}
