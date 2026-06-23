import Panel from '../../core/components/common/Panel'
import { useEffect, useMemo, useRef, useState } from 'react'
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
import {
  collectGroupsWithPseudonyms,
  markDisabledGroupsInTree
} from './utils/groupTree'
import { useNavigate } from 'react-router-dom'
import usePseudonymStore from '../search/stores/PseudonymSearchResults'
import SearchPseudonymService from '../search/services/PseudonymService'
import EntityService from '../search/services/EntityService'
import PrimaryOutlinedButton from '@component/form/buttons/PrimaryOutlinedButton'
import { ArrowUpIcon } from '@heroicons/react/24/outline'
// import { Toast } from 'primereact/toast'

export default function SearchPsn() {
  const { results, clearResults } = useSearchResultsStore()
  const { stepperRef, setStepperRef, previousStep } = useStepperControlStore()
  const { groups, selectedGroup, setGroups, setSelectedGroup } = useGroupStore()
  const { selectedEntityId } = useSelectedEntityStore()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setPseudonymValue } = usePseudonymStore()
  const [occupiedGroups, setOccupiedGroups] = useState<Set<string>>(new Set())

  const localStepperRef = useRef<any | null>(null)

  const groupOptions = useMemo(
    () => markDisabledGroupsInTree(groups ?? [], occupiedGroups),
    [groups, occupiedGroups]
  )

  const selectedGroupNames = useMemo(
    () => getSelectedGroupNames(selectedGroup, groups),
    [selectedGroup, groups]
  )

  const hasValidGroupSelection =
    selectedGroupNames.length > 0 &&
    selectedGroupNames.every((name) => !occupiedGroups.has(name))

  useEffect(() => {
    setStepperRef(localStepperRef)
    clearResults()

    const loadGroups = async () => {
      const data = await GroupService.getGroups()
      setGroups(data)
    }

    loadGroups()
  }, [setStepperRef, clearResults, setGroups])

  useEffect(() => {
    const { trustdeckID, entityTypeName } = selectedEntityId
    if (!trustdeckID || !entityTypeName) {
      setOccupiedGroups(new Set())
      return
    }

    let active = true
    EntityService.getEntityPseudonyms(entityTypeName, trustdeckID)
      .then((links) => {
        if (!active) return
        setOccupiedGroups(collectGroupsWithPseudonyms(links))
      })
      .catch((error) => {
        console.error('Failed to load existing entity pseudonyms', error)
        if (!active) return
        setOccupiedGroups(new Set())
      })

    return () => {
      active = false
    }
  }, [selectedEntityId])

  useEffect(() => {
    if (!selectedGroup || occupiedGroups.size === 0) return
    if (selectedGroupNames.some((name) => occupiedGroups.has(name))) {
      setSelectedGroup('')
    }
  }, [occupiedGroups, selectedGroup, selectedGroupNames, setSelectedGroup])

  async function handleClick() {
    if (!hasValidGroupSelection) return

    const selectedGroupNamesForCreate = getSelectedGroupNames(selectedGroup, groups)
    const payload = {
      identifierItem: {
        "identifier": selectedEntityId.identifier.toString(),
        "idType": selectedEntityId.identifierType
      }
    }
    try {
      // run all pseudonym creations in parallel
      console.log(payload)
      const responses = await Promise.all(
        selectedGroupNamesForCreate.map((groupName) => {
          console.log('Creating pseudonym for group:', groupName)
          return PseudonymService.createPseudonym(payload, groupName)
        })
      )
      console.log(responses)

      // Each response should be an array; extract pseudonyms
      const pseudonyms = responses
        .flat()
        .map((res: any) => res.psn)
        .filter(Boolean)

      console.log('Created pseudonyms:', pseudonyms)

      // Fetch full pseudonym details in the domain where it was created, set store, then navigate
      if (pseudonyms.length > 0 && selectedGroupNamesForCreate.length > 0) {
        const firstPsn = pseudonyms[0]
        const firstGroup = selectedGroupNamesForCreate[0]
        const pseudonymData = await SearchPseudonymService.searchPseudonym(firstPsn, firstGroup)
        if (pseudonymData) setPseudonymValue(pseudonymData)
        navigate(`/search/pseudonym/${firstPsn}`)
      } else if (pseudonyms.length > 0) {
        navigate(`/search/pseudonym/${pseudonyms[0]}`)
      }

      // Optionally: show toast for all created pseudonyms
    } catch (error) {
      console.error('Error creating pseudonyms:', error)
    }
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
            <CustomTreeSelect
              id="group"
              placeholder={t('pseudonyms:selectGroup')}
              value={selectedGroup || null}
              options={groupOptions}
              onChange={handleGroupChange}
              selectionMode="single"
              disabledNodeTooltip={t('pseudonyms:groupHasPseudonym')}
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
                disabled={!hasValidGroupSelection}
              />
            </div>
          </StepperPanel>
        </Stepper>
      </Panel>
    </div>
  )
}
