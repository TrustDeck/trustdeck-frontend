import { useEffect, useRef, useState } from 'react'
import { Checkbox } from 'primereact/checkbox'
import { Dialog } from 'primereact/dialog'
import { Stepper } from 'primereact/stepper'
import { StepperPanel } from 'primereact/stepperpanel'
import {
  ArrowLeftIcon,
  IdentificationIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import Panel from '../../core/components/common/Panel'
import PageHeader from '../../core/components/common/PageHeader'
import SearchResult from '../../core/components/common/SearchResult'
import CustomCalendar from '@component/form/CustomCalendar'
import CustomFloatLabel from '@component/form/CustomFloatLabel'
import CustomTreeSelect from '@component/form/CustomTreeSelect'
import PrimaryOutlinedButton from '@component/form/buttons/PrimaryOutlinedButton'
import SecondaryButton from '@component/form/buttons/SecondaryButton'
import SecondaryOutlinedButton from '@component/form/buttons/SecondaryOutlinedButton'
import EntityMask from '../search/components/EntityMask'
import PseudonymMask from '../search/components/PseudonymMask'
import SearchPseudonymService from '../search/services/PseudonymService'
import usePseudonymStore from '../search/stores/PseudonymSearchResults'
import useSearchResultsStore from '../search/stores/SearchResultsStore'
import GroupService from '../groups/service/GroupService'
import useGroupStore from './stores/GroupStore'
import useSelectedEntityStore from './stores/SelectedEntityStore'
import useStepperControlStore from './stores/StepperControlStore'
import { PseudonymService } from './services/PseudonymService'
import { getSelectedGroupNames } from './utils/findNodeLabelByKey'

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
  const { setStepperRef, previousStep } = useStepperControlStore()
  const { groups, selectedGroup, setGroups, setSelectedGroup } = useGroupStore()
  const { selectedEntityId, setSelectedEntityId } = useSelectedEntityStore()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setPseudonymValue } = usePseudonymStore()

  const [entityWorkflowVisible, setEntityWorkflowVisible] = useState(false)
  const [entityCreating, setEntityCreating] = useState(false)
  const [entityError, setEntityError] = useState('')
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

  const resetEntityWorkflow = () => {
    clearResults()
    setSelectedGroup('')
    setSelectedEntityId({ identifier: '', identifierType: '' })
    setEntityError('')
    localStepperRef.current?.setActiveStep?.(0)
  }

  const openEntityWorkflow = () => {
    resetEntityWorkflow()
    setEntityWorkflowVisible(true)
  }

  const closeEntityWorkflow = () => {
    setEntityWorkflowVisible(false)
    resetEntityWorkflow()
  }

  async function handleEntityPseudonymCreate() {
    const selectedGroupNames = getSelectedGroupNames(selectedGroup, groups)
    if (selectedGroupNames.length === 0) {
      setEntityError(t('pseudonyms:entityFlow.validation.groupRequired'))
      return
    }

    const identifier = selectedEntityId.identifier
    const idType = selectedEntityId.identifierType || 'TrustDeckID'
    if (!identifier) {
      setEntityError(t('pseudonyms:entityFlow.validation.entityRequired'))
      return
    }

    setEntityCreating(true)
    setEntityError('')
    const payload = {
      identifierItem: {
        identifier: identifier.toString(),
        idType
      }
    }

    try {
      const responses = await Promise.all(
        selectedGroupNames.map((groupName) =>
          PseudonymService.createPseudonym(payload, groupName)
        )
      )

      const pseudonyms = responses
        .flat()
        .map((response: any) => response.psn)
        .filter(Boolean)

      if (pseudonyms.length > 0) {
        const firstPsn = pseudonyms[0]
        const firstGroup = selectedGroupNames[0]
        const pseudonymData = await SearchPseudonymService.searchPseudonym(
          firstPsn,
          firstGroup
        )
        if (pseudonymData) setPseudonymValue(pseudonymData)
        setEntityWorkflowVisible(false)
        navigate(
          `/search/pseudonym/${encodeURIComponent(firstGroup)}/${encodeURIComponent(firstPsn)}`,
          { state: { returnTo: '/pseudonym-management' } }
        )
      }
    } catch (error) {
      console.error('Error creating pseudonym for entity:', error)
      setEntityError(t('pseudonyms:entityFlow.validation.createFailed'))
    } finally {
      setEntityCreating(false)
    }
  }

  function handleStandalonePseudonym() {
    setStandaloneForm(createStandaloneForm())
    setStandaloneAdvancedOpen(false)
    setStandaloneError('')
    setStandaloneVisible(true)
  }

  async function handleStandaloneCreate() {
    const selectedGroupNames = getSelectedGroupNames(
      standaloneForm.group,
      groups
    )
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

  return (
    <div className="td-page-shell">
      <PageHeader
        title={t('pseudonyms:headers.title')}
        description={t('pseudonyms:headers.subtitle')}
      />

      <div className="grid w-full gap-6 xl:grid-cols-2">
        <Panel className="h-full !p-6">
          <div className="mb-5 flex items-start gap-4">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-color-blue dark:bg-blue-950/50 dark:text-blue-300">
              <MagnifyingGlassIcon className="h-7 w-7" />
            </span>
            <div>
              <h2 className="td-panel-title">
                {t('pseudonyms:management.searchTitle')}
              </h2>
              <p className="td-section-subtitle mt-1">
                {t('pseudonyms:management.searchDescription')}
              </p>
            </div>
          </div>
          <PseudonymMask inlineResults />
        </Panel>

        <Panel className="h-full !p-6">
          <div className="mb-5 flex items-start gap-4">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <SparklesIcon className="h-7 w-7" />
            </span>
            <div>
              <h2 className="td-panel-title">
                {t('pseudonyms:management.generateTitle')}
              </h2>
              <p className="td-section-subtitle mt-1">
                {t('pseudonyms:management.generateDescription')}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={openEntityWorkflow}
              className="group flex min-h-52 flex-col rounded-2xl border-2 border-gray-200 bg-white p-5 text-left transition hover:border-color-blue hover:bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-color-blue/40 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500 dark:hover:bg-blue-950/30"
            >
              <UserIcon className="h-9 w-9 text-color-blue dark:text-blue-300" />
              <h3 className="td-section-title mt-4">
                {t('pseudonyms:management.entityTitle')}
              </h3>
              <p className="td-section-subtitle mt-2 flex-1">
                {t('pseudonyms:management.entityDescription')}
              </p>
              <span className="mt-5 font-semibold text-color-blue group-hover:underline dark:text-blue-300">
                {t('pseudonyms:management.entityAction')}
              </span>
            </button>

            <button
              type="button"
              onClick={handleStandalonePseudonym}
              className="group flex min-h-52 flex-col rounded-2xl border-2 border-gray-200 bg-white p-5 text-left transition hover:border-amber-500 hover:bg-amber-50/50 focus:outline-none focus:ring-2 focus:ring-amber-500/40 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-amber-500 dark:hover:bg-amber-950/20"
            >
              <IdentificationIcon className="h-9 w-9 text-amber-700 dark:text-amber-300" />
              <h3 className="td-section-title mt-4">
                {t('pseudonyms:management.standaloneTitle')}
              </h3>
              <p className="td-section-subtitle mt-2 flex-1">
                {t('pseudonyms:management.standaloneDescription')}
              </p>
              <span className="mt-5 font-semibold text-amber-700 group-hover:underline dark:text-amber-300">
                {t('pseudonyms:management.standaloneAction')}
              </span>
            </button>
          </div>
        </Panel>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 text-base text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-200">
        {t('pseudonyms:infotext')}
      </div>

      <Dialog
        header={t('pseudonyms:entityFlow.modalTitle')}
        visible={entityWorkflowVisible}
        onHide={closeEntityWorkflow}
        dismissableMask
        className="w-[min(96vw,1100px)]"
      >
        <p className="mb-6 text-base text-gray-600 dark:text-gray-300">
          {t('pseudonyms:entityFlow.modalDescription')}
        </p>

        <Stepper ref={localStepperRef} linear className="td-pseudonym-stepper">
          <StepperPanel header={t('pseudonyms:entityFlow.searchStep')}>
            <div className="pt-4">
              <EntityMask psn />
            </div>
          </StepperPanel>

          <StepperPanel header={t('pseudonyms:entityFlow.selectStep')}>
            <div className="space-y-5 pt-4">
              <div className="grid gap-4 lg:grid-cols-2">
                {results.map((result, index) => (
                  <SearchResult
                    key={result.trustdeckID ?? result.trustdeckId ?? index}
                    pseudonymization
                    result={result}
                  />
                ))}
              </div>
              <PrimaryOutlinedButton
                label={t('identity:buttons.back')}
                icon={<ArrowLeftIcon className="h-5 w-5" />}
                onClick={() => previousStep()}
              />
            </div>
          </StepperPanel>

          <StepperPanel header={t('pseudonyms:entityFlow.groupStep')}>
            <div className="space-y-5 pt-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-base text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
                <h3 className="font-semibold">
                  {t('pseudonyms:selectedEntity.title')}
                </h3>
                <p className="mt-1 break-all text-lg font-medium">
                  {selectedEntityId.displayName ||
                    selectedEntityId.identifier ||
                    '—'}
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <span>
                    {t('pseudonyms:selectedEntity.identifierType')}:{' '}
                    <strong>
                      {selectedEntityId.identifierType || 'TrustDeckID'}
                    </strong>
                  </span>
                  <span className="break-all">
                    {t('pseudonyms:selectedEntity.identifier')}:{' '}
                    <strong>{selectedEntityId.identifier || '—'}</strong>
                  </span>
                </div>
              </div>

              <CustomTreeSelect
                id="entity-pseudonym-group"
                placeholder={t('pseudonyms:standalone.fields.group')}
                value={selectedGroup || null}
                options={groups || []}
                onChange={(event) =>
                  setSelectedGroup(String(event.value ?? ''))
                }
                selectionMode="single"
                required
                filter
                filterPlaceholder={t(
                  'pseudonyms:standalone.fields.groupSearch'
                )}
              />

              {entityError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                  {entityError}
                </p>
              )}

              <div className="flex flex-wrap justify-between gap-3 pt-2">
                <PrimaryOutlinedButton
                  label={t('identity:buttons.back')}
                  icon={<ArrowLeftIcon className="h-5 w-5" />}
                  onClick={() => previousStep()}
                  disabled={entityCreating}
                />
                <SecondaryButton
                  label={t('pseudonyms:buttons.generate')}
                  onClick={handleEntityPseudonymCreate}
                  loading={entityCreating}
                  disabled={entityCreating}
                />
              </div>
            </div>
          </StepperPanel>
        </Stepper>
      </Dialog>

      <Dialog
        header={t('pseudonyms:standalone.modalTitle')}
        visible={standaloneVisible}
        onHide={() => setStandaloneVisible(false)}
        dismissableMask
        className="w-[min(92vw,760px)]"
      >
        <div className="space-y-6 pt-2">
          <p className="text-base text-gray-600 dark:text-gray-300">
            {t('pseudonyms:standalone.modalDescription')}
          </p>

          <CustomTreeSelect
            id="standalone-group"
            placeholder={t('pseudonyms:standalone.fields.group')}
            value={standaloneForm.group || null}
            options={groups || []}
            onChange={(event) =>
              setStandaloneForm((current) => ({
                ...current,
                group: String(event.value ?? '')
              }))
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
              onChange={(event) =>
                setStandaloneForm((current) => ({
                  ...current,
                  identifier: event.target.value
                }))
              }
              required
            />
            <CustomFloatLabel
              id="standalone-id-type"
              placeholder={t('pseudonyms:standalone.fields.idType')}
              value={standaloneForm.idType}
              onChange={(event) =>
                setStandaloneForm((current) => ({
                  ...current,
                  idType: event.target.value
                }))
              }
              required
            />
          </div>

          <button
            type="button"
            className="text-sm font-semibold text-color-blue hover:underline dark:text-blue-300"
            onClick={() => setStandaloneAdvancedOpen((open) => !open)}
          >
            {standaloneAdvancedOpen
              ? t('pseudonyms:standalone.advanced.hide')
              : t('pseudonyms:standalone.advanced.show')}
          </button>

          {standaloneAdvancedOpen && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <CustomFloatLabel
                  id="standalone-pseudonym"
                  placeholder={t('pseudonyms:standalone.fields.pseudonym')}
                  value={standaloneForm.psn}
                  onChange={(event) =>
                    setStandaloneForm((current) => ({
                      ...current,
                      psn: event.target.value
                    }))
                  }
                />
                <CustomFloatLabel
                  id="standalone-validity-time"
                  placeholder={t('pseudonyms:standalone.fields.validityTime')}
                  value={standaloneForm.validityTime}
                  onChange={(event) =>
                    setStandaloneForm((current) => ({
                      ...current,
                      validityTime: event.target.value
                    }))
                  }
                  helpText={t('pseudonyms:standalone.fields.validityTimeHelp')}
                  helpIconInside
                />
                <CustomCalendar
                  id="standalone-valid-from"
                  placeholder={t('pseudonyms:standalone.fields.validFrom')}
                  value={standaloneForm.validFrom}
                  onChange={(event) =>
                    setStandaloneForm((current) => ({
                      ...current,
                      validFrom: event.value
                    }))
                  }
                  showTime
                  showSeconds
                  hourFormat="24"
                  dateFormat="dd.mm.yy"
                />
                <CustomCalendar
                  id="standalone-valid-to"
                  placeholder={t('pseudonyms:standalone.fields.validTo')}
                  value={standaloneForm.validTo}
                  onChange={(event) =>
                    setStandaloneForm((current) => ({
                      ...current,
                      validTo: event.value
                    }))
                  }
                  showTime
                  showSeconds
                  hourFormat="24"
                  dateFormat="dd.mm.yy"
                />
              </div>

              <label className="mt-4 flex cursor-pointer items-center gap-3 text-base text-gray-700 dark:text-gray-200">
                <Checkbox
                  checked={standaloneForm.omitPrefix}
                  onChange={(event) =>
                    setStandaloneForm((current) => ({
                      ...current,
                      omitPrefix: Boolean(event.checked)
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
