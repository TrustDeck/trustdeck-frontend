import Panel from '../../core/components/common/Panel'
import { useEffect, useRef, useState } from 'react'
import useSearchResultsStore from '../search/stores/SearchResultsStore'
import useGroupStore from './stores/GroupStore'
import { Stepper } from 'primereact/stepper'
import { StepperPanel } from 'primereact/stepperpanel'
import { Dialog } from 'primereact/dialog'
import { Checkbox } from 'primereact/checkbox'
import SearchMask from '../search/SearchMask'
import SearchResult from '../../core/components/common/SearchResult'
import useStepperControlStore from './stores/StepperControlStore'
import GroupService from '../groups/service/GroupService'
import { useTranslation } from 'react-i18next'
import SecondaryButton from '@component/form/buttons/SecondaryButton'
import SecondaryOutlinedButton from '@component/form/buttons/SecondaryOutlinedButton'
import CustomTreeSelect from '@component/form/CustomTreeSelect'
import CustomFloatLabel from '@component/form/CustomFloatLabel'
import CustomCalendar from '@component/form/CustomCalendar'
import { PseudonymService } from './services/PseudonymService'
import useSelectedEntityStore from './stores/SelectedEntityStore'
import { getSelectedGroupNames } from './utils/findNodeLabelByKey'
import { useNavigate } from 'react-router-dom'
import usePseudonymStore from '../search/stores/PseudonymSearchResults'
import SearchPseudonymService from '../search/services/PseudonymService'
import PrimaryOutlinedButton from '@component/form/buttons/PrimaryOutlinedButton'
import { ArrowUpIcon } from '@heroicons/react/24/outline'
import PageHeader from '../../core/components/common/PageHeader'
// import { Toast } from 'primereact/toast'

type StandalonePseudonymForm = {
  group: string
  identifier: string
  idType: string
  psn: string
  validFrom: Date | null
  validTo: Date | null
  validityTime: string
  omitPrefix: boolean
}

const createStandaloneForm = (): StandalonePseudonymForm => ({
  group: '',
  identifier: '',
  idType: '',
  psn: '',
  validFrom: null,
  validTo: null,
  validityTime: '',
  omitPrefix: false
})

const toBackendLocalDateTime = (date: Date | null): string | undefined => {
  if (!date) return undefined

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

const firstCreatedPseudonymValue = (
  response: unknown,
  fallbackPseudonym: string
): string => {
  if (Array.isArray(response)) {
    const firstWithPsn = response.find(
      (item) => item && typeof item === 'object' && 'psn' in item
    ) as { psn?: unknown } | undefined
    return typeof firstWithPsn?.psn === 'string'
      ? firstWithPsn.psn
      : fallbackPseudonym
  }

  if (response && typeof response === 'object' && 'psn' in response) {
    const psn = (response as { psn?: unknown }).psn
    return typeof psn === 'string' ? psn : fallbackPseudonym
  }

  return fallbackPseudonym
}

export default function SearchPsn() {
  const { results, clearResults } = useSearchResultsStore()
  const { stepperRef, setStepperRef, previousStep } = useStepperControlStore()
  const { groups, selectedGroup, setGroups, setSelectedGroup } = useGroupStore()
  const { selectedEntityId } = useSelectedEntityStore()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setPseudonymValue } = usePseudonymStore()
  const [standaloneVisible, setStandaloneVisible] = useState(false)
  const [standaloneAdvancedOpen, setStandaloneAdvancedOpen] = useState(false)
  const [standaloneForm, setStandaloneForm] = useState<StandalonePseudonymForm>(
    () => createStandaloneForm()
  )
  const [standaloneError, setStandaloneError] = useState('')
  const [standaloneCreating, setStandaloneCreating] = useState(false)

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
        identifier: identifier.toString(),
        idType: idType
      }
    }
    try {
      const responses = await Promise.all(
        selectedGroupNames.map((groupName) =>
          PseudonymService.createPseudonym(payload, groupName)
        )
      )

      // Each response should be an array; extract pseudonyms
      const pseudonyms = responses
        .flat()
        .map((res: any) => res.psn)
        .filter(Boolean)

      // Fetch full pseudonym details in the domain where it was created, set store, then navigate
      if (pseudonyms.length > 0 && selectedGroupNames.length > 0) {
        const firstPsn = pseudonyms[0]
        const firstGroup = selectedGroupNames[0]
        const pseudonymData = await SearchPseudonymService.searchPseudonym(
          firstPsn,
          firstGroup
        )
        if (pseudonymData) setPseudonymValue(pseudonymData)
        navigate(
          `/search/pseudonym/${encodeURIComponent(firstGroup)}/${encodeURIComponent(firstPsn)}`,
          { state: { returnTo: '/pseudonym-management' } }
        )
      } else if (pseudonyms.length > 0) {
        navigate(`/search/pseudonym/${pseudonyms[0]}`, {
          state: { returnTo: '/pseudonym-management' }
        })
      }

      // Optionally: show toast for all created pseudonyms
    } catch (error) {
      console.error('Error creating pseudonyms:', error)
    }
  }

  function handleStandalonePseudonym() {
    setStandaloneForm(createStandaloneForm())
    setStandaloneAdvancedOpen(false)
    setStandaloneError('')
    setStandaloneVisible(true)
  }

  async function handleStandaloneCreate() {
    const selectedGroupNames = getSelectedGroupNames(standaloneForm.group, groups)
    const selectedGroupName = selectedGroupNames[0]
    const identifier = standaloneForm.identifier.trim()
    const idType = standaloneForm.idType.trim()
    const requestedPsn = standaloneForm.psn.trim()

    if (!selectedGroupName || !identifier || !idType) {
      setStandaloneError(t('pseudonyms:standalone.validation.required'))
      return
    }

    setStandaloneCreating(true)
    setStandaloneError('')

    const payload: Record<string, unknown> = {
      identifierItem: {
        identifier,
        idType
      }
    }

    if (requestedPsn) payload.psn = requestedPsn

    const validFrom = toBackendLocalDateTime(standaloneForm.validFrom)
    const validTo = toBackendLocalDateTime(standaloneForm.validTo)
    const validityTime = standaloneForm.validityTime.trim()

    if (validFrom) payload.validFrom = validFrom
    if (validTo) payload.validTo = validTo
    if (validityTime) payload.validityTime = validityTime
    if (standaloneForm.omitPrefix) payload.omitPrefix = true

    try {
      const response = await PseudonymService.createPseudonym(
        payload,
        selectedGroupName
      )
      const createdPsn = firstCreatedPseudonymValue(response, requestedPsn)

      if (createdPsn) {
        const pseudonymData = await SearchPseudonymService.searchPseudonym(
          createdPsn,
          selectedGroupName
        )
        if (pseudonymData) setPseudonymValue(pseudonymData)
        setStandaloneVisible(false)
        navigate(
          `/search/pseudonym/${encodeURIComponent(selectedGroupName)}/${encodeURIComponent(createdPsn)}`,
          { state: { returnTo: '/pseudonym-management' } }
        )
      }
    } catch (error) {
      console.error('Error creating standalone pseudonym:', error)
      setStandaloneError(
        error instanceof Error
          ? error.message
          : t('pseudonyms:standalone.validation.createFailed')
      )
    } finally {
      setStandaloneCreating(false)
    }
  }

  // Typ-sicherer Change-Handler für TreeSelect/CustomTreeSelect
  const handleGroupChange = (e: any) => {
    setSelectedGroup(e.value)
  }

  return (
    <div className="td-page-shell">
      <PageHeader
        title={t('pseudonyms:headers.title')}
        description={t('pseudonyms:headers.subtitle')}
      />
      <Panel className="!w-full">
        <Stepper ref={stepperRef} orientation="vertical" linear>
          {/* Step 1 - Search */}
          <StepperPanel header={t('pseudonyms:headers.stepone')}>
            <SearchMask psn />
            <div className="mt-6 rounded-lg border border-dashed border-gray-300 p-4 text-center dark:border-slate-700">
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
                {t('pseudonyms:standalone.description')}
              </p>
              <div className="flex w-full justify-center">
                <PrimaryOutlinedButton
                  label={t('pseudonyms:buttons.generateStandalone')}
                  onClick={handleStandalonePseudonym}
                />
              </div>
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
            {selectedEntityId.identifierType === 'standalone-pseudonym' ? (
              <p className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-color-blue dark:bg-blue-950/40 dark:text-blue-100">
                {t('pseudonyms:standalone.selected')}
              </p>
            ) : (
              <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-color-blue dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
                <div className="font-semibold">
                  {t('pseudonyms:selectedEntity.title')}
                </div>
                <div className="mt-1 break-all">
                  {selectedEntityId.displayName ||
                    selectedEntityId.identifier ||
                    '-'}
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <span>
                    {t('pseudonyms:selectedEntity.identifierType')}:{' '}
                    <strong>
                      {selectedEntityId.identifierType || 'TrustDeckID'}
                    </strong>
                  </span>
                  <span className="break-all">
                    {t('pseudonyms:selectedEntity.identifier')}:{' '}
                    <strong>{selectedEntityId.identifier || '-'}</strong>
                  </span>
                </div>
                <p className="mt-2 text-xs">
                  {t('pseudonyms:selectedEntity.trustDeckIdHint')}
                </p>
              </div>
            )}
            <CustomTreeSelect
              id="group"
              placeholder={t('pseudonyms:selectGroup')}
              value={selectedGroup || null}
              options={groups || []}
              onChange={handleGroupChange}
              selectionMode="single"
              filter
              filterPlaceholder={t('pseudonyms:standalone.fields.groupSearch')}
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

      <Dialog
        header={t('pseudonyms:standalone.modalTitle')}
        visible={standaloneVisible}
        onHide={() => setStandaloneVisible(false)}
        dismissableMask
        className="w-[min(92vw,760px)]"
      >
        <div className="space-y-6 pt-2">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t('pseudonyms:standalone.modalDescription')}
          </p>

          <CustomTreeSelect
            id="standalone-group"
            placeholder={t('pseudonyms:standalone.fields.group')}
            value={standaloneForm.group || null}
            options={groups || []}
            onChange={(e) =>
              setStandaloneForm((current) => ({ ...current, group: String(e.value ?? '') }))
            }
            selectionMode="single"
            required
            filter
            filterPlaceholder={t('pseudonyms:standalone.fields.groupSearch')}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <CustomFloatLabel
              id="standalone-identifier"
              placeholder={t('pseudonyms:standalone.fields.identifier')}
              value={standaloneForm.identifier}
              onChange={(e) =>
                setStandaloneForm((current) => ({
                  ...current,
                  identifier: e.target.value
                }))
              }
              required
            />
            <CustomFloatLabel
              id="standalone-id-type"
              placeholder={t('pseudonyms:standalone.fields.idType')}
              value={standaloneForm.idType}
              onChange={(e) =>
                setStandaloneForm((current) => ({
                  ...current,
                  idType: e.target.value
                }))
              }
              required
            />
          </div>

          <div>
            <button
              type="button"
              className="text-sm font-semibold text-color-blue hover:underline dark:text-blue-300"
              onClick={() => setStandaloneAdvancedOpen((open) => !open)}
            >
              {standaloneAdvancedOpen
                ? t('pseudonyms:standalone.advanced.hide')
                : t('pseudonyms:standalone.advanced.show')}
            </button>
          </div>

          {standaloneAdvancedOpen && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <CustomFloatLabel
                  id="standalone-pseudonym"
                  placeholder={t('pseudonyms:standalone.fields.pseudonym')}
                  value={standaloneForm.psn}
                  onChange={(e) =>
                    setStandaloneForm((current) => ({
                      ...current,
                      psn: e.target.value
                    }))
                  }
                />
                <CustomFloatLabel
                  id="standalone-validity-time"
                  placeholder={t('pseudonyms:standalone.fields.validityTime')}
                  value={standaloneForm.validityTime}
                  onChange={(e) =>
                    setStandaloneForm((current) => ({
                      ...current,
                      validityTime: e.target.value
                    }))
                  }
                  helpText={t('pseudonyms:standalone.fields.validityTimeHelp')}
                  helpIconInside
                />
                <CustomCalendar
                  id="standalone-valid-from"
                  placeholder={t('pseudonyms:standalone.fields.validFrom')}
                  value={standaloneForm.validFrom}
                  onChange={(e) =>
                    setStandaloneForm((current) => ({
                      ...current,
                      validFrom: e.value
                    }))
                  }
                  showTime
                  hourFormat="24"
                />
                <CustomCalendar
                  id="standalone-valid-to"
                  placeholder={t('pseudonyms:standalone.fields.validTo')}
                  value={standaloneForm.validTo}
                  onChange={(e) =>
                    setStandaloneForm((current) => ({
                      ...current,
                      validTo: e.value
                    }))
                  }
                  showTime
                  hourFormat="24"
                />
              </div>

              <label className="mt-4 flex cursor-pointer items-center gap-3 text-base text-gray-700 dark:text-gray-200">
                <Checkbox
                  checked={standaloneForm.omitPrefix}
                  onChange={(e) =>
                    setStandaloneForm((current) => ({
                      ...current,
                      omitPrefix: Boolean(e.checked)
                    }))
                  }
                />
                <span>{t('pseudonyms:standalone.fields.omitPrefix')}</span>
              </label>
            </div>
          )}

          {standaloneError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {standaloneError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <SecondaryOutlinedButton
              label={t('common:cancel')}
              onClick={() => setStandaloneVisible(false)}
              disabled={standaloneCreating}
            />
            <SecondaryButton
              label={t('pseudonyms:buttons.generate')}
              onClick={handleStandaloneCreate}
              loading={standaloneCreating}
              disabled={standaloneCreating}
            />
          </div>
        </div>
      </Dialog>
    </div>
  )
}
