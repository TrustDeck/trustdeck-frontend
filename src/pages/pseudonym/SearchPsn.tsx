import { useEffect, useMemo, useRef, useState } from 'react'
import { Checkbox } from 'primereact/checkbox'
import { Dialog } from 'primereact/dialog'
import { Stepper } from 'primereact/stepper'
import { StepperPanel } from 'primereact/stepperpanel'
import {
  ArrowLeftIcon,
  CheckIcon,
  FingerPrintIcon,
  IdentificationIcon,
  UserIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

import Panel from '../../core/components/common/Panel'
import PageHeader from '../../core/components/common/PageHeader'
import SearchResult from '../../core/components/common/SearchResult'
import CustomCalendar from '@component/form/CustomCalendar'
import CustomFloatLabel from '@component/form/CustomFloatLabel'
import CustomTreeSelect from '@component/form/CustomTreeSelect'
import PrimaryButton from '@component/form/buttons/PrimaryButton'
import PrimaryOutlinedButton from '@component/form/buttons/PrimaryOutlinedButton'
import SecondaryOutlinedButton from '@component/form/buttons/SecondaryOutlinedButton'
import EntityMask from '../search/components/EntityMask'
import PseudonymMask from '../search/components/PseudonymMask'
import SearchPseudonymService from '../search/services/PseudonymService'
import usePseudonymStore from '../search/stores/PseudonymSearchResults'
import useSearchResultsStore from '../search/stores/SearchResultsStore'
import useSearchStore from '../search/stores/SearchStore'
import useProjectStore from '../../core/stores/ProjectStore'
import {
  collectDisplayAttributes,
  formatDisplayValue,
  readDisplayValue
} from '../search/utils/entityDisplay'
import DomainService from '../domains/services/DomainService'
import useDomainStore from './stores/DomainStore'
import useSelectedEntityStore from './stores/SelectedEntityStore'
import useStepperControlStore from './stores/StepperControlStore'
import { PseudonymService } from './services/PseudonymService'
import { getSelectedGroupNames } from './utils/findNodeLabelByKey'
import DomainSearchSelect from './components/DomainSearchSelect'

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

type GenerationMode = 'choice' | 'entity' | 'standalone' | 'secondary' | null
type ManagementTab = 'search' | 'add'

function findGroupKeyByName(nodes: any[] | null, groupName: string): string {
  if (!nodes || !groupName) return ''
  for (const node of nodes) {
    if (node.label === groupName) return String(node.key ?? '')
    const childKey = findGroupKeyByName(node.children ?? [], groupName)
    if (childKey) return childKey
  }
  return ''
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

function flattenEntityData(
  value: unknown,
  path = ''
): Array<{ label: string; value: string }> {
  if (value === null || value === undefined) {
    return path ? [{ label: path, value: '—' }] : []
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return path ? [{ label: path, value: '—' }] : []
    return value.flatMap((entry, index) =>
      flattenEntityData(entry, `${path}${path ? ' ' : ''}[${index + 1}]`)
    )
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(
      ([key, entry]) => flattenEntityData(entry, path ? `${path}.${key}` : key)
    )
  }

  return [{ label: path || 'value', value: String(value) }]
}

export default function SearchPsn() {
  const {
    results,
    entityTypeName: searchedEntityTypeName,
    clearResults: clearEntityResults
  } = useSearchResultsStore()
  const { setStepperRef, previousStep } = useStepperControlStore()
  const { groups, selectedGroup, setGroups, setSelectedGroup } = useDomainStore()
  const { selectedEntityId, setSelectedEntityId } = useSelectedEntityStore()
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const entityDefinitions = useProjectStore((state) => state.entityAttributes)
  const {
    group: pseudonymDomain,
    setPseudonym: setPseudonymQuery,
    setGroup: setPseudonymGroup
  } = useSearchStore()
  const {
    setPseudonymValue,
    setResults: setPseudonymResults,
    selectResult: selectPseudonymResult,
    clearResults: clearPseudonymResults
  } = usePseudonymStore()

  const [generationMode, setGenerationMode] = useState<GenerationMode>(null)
  const [managementTab, setManagementTab] = useState<ManagementTab>('search')
  const [viewedEntity, setViewedEntity] = useState<any | null>(null)
  const [entityCreating, setEntityCreating] = useState(false)
  const [entityError, setEntityError] = useState('')
  const [standaloneAdvancedOpen, setStandaloneAdvancedOpen] = useState(false)
  const [standaloneForm, setStandaloneForm] = useState<StandalonePseudonymForm>(
    () => createStandaloneForm()
  )
  const [standaloneError, setStandaloneError] = useState('')
  const [standaloneCreating, setStandaloneCreating] = useState(false)

  const localStepperRef = useRef<any | null>(null)
  const searchPanelRef = useRef<HTMLDivElement | null>(null)
  const viewedEntityFields = useMemo(() => {
    if (!viewedEntity) return []

    const typeName = String(
      viewedEntity.entityTypeName ??
        viewedEntity.typeName ??
        viewedEntity.type ??
        searchedEntityTypeName ??
        ''
    )
    const definition = entityDefinitions.find(
      (candidate) => candidate.name?.toLowerCase() === typeName.toLowerCase()
    )
    const schemaFields = collectDisplayAttributes(
      definition?.typeDefinition?.attributes ?? [],
      i18n.resolvedLanguage ?? i18n.language
    )
    const data = viewedEntity.data ?? viewedEntity

    if (schemaFields.length > 0) {
      return schemaFields.map((field) => ({
        label: field.label,
        value: formatDisplayValue(readDisplayValue(data, field.path))
      }))
    }

    return flattenEntityData(data)
  }, [
    entityDefinitions,
    i18n.language,
    i18n.resolvedLanguage,
    searchedEntityTypeName,
    viewedEntity
  ])

  useEffect(() => {
    setStepperRef(localStepperRef)
    clearEntityResults()
    clearPseudonymResults()
    setPseudonymQuery('')
    setPseudonymGroup('')

    const loadGroups = async () => {
      const data = await DomainService.getGroups()
      setGroups(data)
    }

    void loadGroups()
  }, [
    setStepperRef,
    clearEntityResults,
    clearPseudonymResults,
    setGroups,
    setPseudonymGroup,
    setPseudonymQuery
  ])

  useEffect(() => {
    const request = location.state as {
      entity?: {
        identifier: string
        identifierType: string
        entityTypeName?: string
        displayName?: string
      }
      secondaryPseudonym?: { domainName: string; psn: string }
    } | null
    const entity = request?.entity
    const secondaryPseudonym = request?.secondaryPseudonym

    if (secondaryPseudonym?.psn) {
      setStandaloneForm({
        ...createStandaloneForm(),
        group: findGroupKeyByName(groups, secondaryPseudonym.domainName),
        identifier: secondaryPseudonym.psn,
        idType: `${secondaryPseudonym.domainName}_PSN`
      })
      setStandaloneAdvancedOpen(false)
      setStandaloneError('')
      setGenerationMode('secondary')
      setManagementTab('add')
      navigate(location.pathname, { replace: true, state: null })
      return
    }
    if (!entity?.identifier) return

    setSelectedEntityId(entity)
    setGenerationMode('entity')
    setManagementTab('add')
    navigate(location.pathname, { replace: true, state: null })
    window.requestAnimationFrame(() => {
      localStepperRef.current?.setActiveStep?.(2)
    })
  }, [groups, location.pathname, location.state, navigate, setSelectedEntityId])

  const resetEntityWorkflow = () => {
    clearEntityResults()
    setSelectedGroup('')
    setSelectedEntityId({ identifier: '', identifierType: '' })
    setEntityError('')
    localStepperRef.current?.setActiveStep?.(0)
  }

  const startEntityWorkflow = () => {
    resetEntityWorkflow()
    const selectedDomainKey = findGroupKeyByName(groups, pseudonymDomain)
    if (selectedDomainKey) setSelectedGroup(selectedDomainKey)
    setGenerationMode('entity')
  }

  const startStandaloneWorkflow = () => {
    const selectedDomainKey = findGroupKeyByName(groups, pseudonymDomain)
    setStandaloneForm({
      ...createStandaloneForm(),
      group: selectedDomainKey
    })
    setStandaloneAdvancedOpen(false)
    setStandaloneError('')
    setGenerationMode('standalone')
  }

  const startSecondaryPseudonymWorkflow = () => {
    setStandaloneForm(createStandaloneForm())
    setStandaloneAdvancedOpen(false)
    setStandaloneError('')
    setGenerationMode('secondary')
  }

  const cancelGeneration = () => {
    resetEntityWorkflow()
    setStandaloneForm(createStandaloneForm())
    setStandaloneAdvancedOpen(false)
    setStandaloneError('')
    setGenerationMode(null)
    setManagementTab('search')
  }

  const showCreatedPseudonym = async (
    groupName: string,
    pseudonymValue: string
  ) => {
    const pseudonymData = await SearchPseudonymService.searchPseudonym(
      pseudonymValue,
      groupName
    )
    if (!pseudonymData) return

    const normalized = {
      ...pseudonymData,
      domainName: pseudonymData.domainName || groupName
    }
    setPseudonymQuery(normalized.psn)
    setPseudonymGroup(normalized.domainName)
    setPseudonymValue(normalized)
    setPseudonymResults([normalized])
    selectPseudonymResult(normalized.domainName, normalized.psn, false)
    setGenerationMode(null)

    window.requestAnimationFrame(() => {
      searchPanelRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    })
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
        selectedGroupNames.map((groupName) => {
          console.log('Creating pseudonym for group:', groupName)
          return PseudonymService.createPseudonym(payload, groupName)
        })
      )

      const pseudonyms = responses
        .flat()
        .map((response: any) => response.psn)
        .filter(Boolean)

      if (pseudonyms.length > 0) {
        const firstPsn = pseudonyms[0]
        const firstGroup = selectedGroupNames[0]
        await showCreatedPseudonym(firstGroup, firstPsn)
      }
    } catch (error) {
      console.error('Error creating pseudonym for entity:', error)
      setEntityError(t('pseudonyms:entityFlow.validation.createFailed'))
    } finally {
      setEntityCreating(false)
    }
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
        await showCreatedPseudonym(selectedGroupName, createdPsn)
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
      <div className="td-page-content flex w-full flex-col gap-6">
        <PageHeader
          className="!mb-0"
          title={t('pseudonyms:headers.title')}
          description={t('pseudonyms:headers.subtitle')}
        />
        <Panel
          noMaxWidth
          className="mx-auto w-full"
          title={t('pseudonyms:domainContext.title')}
        >
          <p className="td-section-subtitle mb-5">
            {t('pseudonyms:domainContext.description')}
          </p>
          <DomainSearchSelect
            value={pseudonymDomain}
            onChange={setPseudonymGroup}
          />
        </Panel>

        <div ref={searchPanelRef}>
          <Panel noMaxWidth className="mx-auto w-full">
            <div className="mb-5 flex flex-wrap items-center gap-2 text-lg font-medium text-gray-700 dark:text-gray-200">
              <button
                type="button"
                onClick={() => setManagementTab('search')}
                className={`rounded-md px-3 py-1 transition-colors ${
                  managementTab === 'search'
                    ? 'bg-color-blue font-bold text-white shadow-sm'
                    : 'search-toggle-unselected bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700'
                }`}
              >
                {t('pseudonyms:management.searchTitle')}
              </button>
              <span>/</span>
              <button
                type="button"
                onClick={() => {
                  setGenerationMode('choice')
                  setManagementTab('add')
                }}
                className={`rounded-md px-3 py-1 transition-colors ${
                  managementTab === 'add'
                    ? 'bg-color-blue font-bold text-white shadow-sm'
                    : 'search-toggle-unselected bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700'
                }`}
              >
                {t('pseudonyms:management.addPseudonym')}
              </button>
            </div>
            {managementTab === 'search' && (
              <>
                <p className="td-section-subtitle mb-5">
                  {t('pseudonyms:management.searchDescription')}
                </p>
                <PseudonymMask inlineResults showDomainSelector={false} />
              </>
            )}

            {managementTab === 'add' && generationMode && (
          <div>
            <div className="mb-5">
              <h2 className="td-panel-title !mb-0">
                {t('pseudonyms:management.addPseudonym')}
              </h2>
              <p className="td-section-subtitle mt-1">
                {t('pseudonyms:management.generateDescription')}
              </p>
            </div>

            {generationMode === 'choice' && (
              <div className="grid gap-4 lg:grid-cols-3">
                <button
                  type="button"
                  onClick={startEntityWorkflow}
                  className="group flex min-h-44 flex-col rounded-2xl border-2 border-gray-200 bg-white p-5 text-left transition hover:border-color-blue hover:bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-color-blue/40 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500 dark:hover:bg-blue-950/30"
                >
                  <UserIcon className="h-9 w-9 text-color-blue dark:text-blue-300" />
                  <h3 className="td-section-title mt-4">
                    {t('pseudonyms:management.entityTitle')}
                  </h3>
                  <p className="td-section-subtitle mt-2 flex-1">
                    {t('pseudonyms:management.entityDescription')}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={startSecondaryPseudonymWorkflow}
                  className="group flex min-h-44 flex-col rounded-2xl border-2 border-gray-200 bg-white p-5 text-left transition hover:border-color-blue hover:bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-color-blue/40 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500 dark:hover:bg-blue-950/30"
                >
                  <FingerPrintIcon className="h-9 w-9 text-color-blue dark:text-blue-300" />
                  <h3 className="td-section-title mt-4">
                    {t('pseudonyms:management.secondaryTitle')}
                  </h3>
                  <p className="td-section-subtitle mt-2 flex-1">
                    {t('pseudonyms:management.secondaryDescription')}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={startStandaloneWorkflow}
                  className="group order-3 flex min-h-40 flex-col rounded-2xl border border-gray-200 bg-white p-5 text-left transition hover:border-color-blue hover:bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-color-blue/40 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500 dark:hover:bg-blue-950/30"
                >
                  <IdentificationIcon className="h-9 w-9 text-color-blue dark:text-blue-300" />
                  <h3 className="td-section-title mt-4">
                    {t('pseudonyms:management.standaloneTitle')}
                  </h3>
                  <p className="td-section-subtitle mt-2 flex-1">
                    {t('pseudonyms:management.standaloneDescription')}
                  </p>
                </button>
                <div className="flex justify-center lg:col-span-3">
                  <SecondaryOutlinedButton
                    label={t('common:cancel')}
                    onClick={cancelGeneration}
                    icon={<XMarkIcon className="mr-1 h-5 w-5" />}
                  />
                </div>
              </div>
            )}

            {generationMode === 'entity' && (
              <div className="rounded-2xl border border-gray-200 p-5 dark:border-slate-700">
                <p className="mb-4 text-base text-gray-600 dark:text-gray-300">
                  {t('pseudonyms:entityFlow.modalDescription')}
                </p>

                <Stepper
                  ref={localStepperRef}
                  linear
                  className="td-pseudonym-stepper"
                >
                  <StepperPanel header={t('pseudonyms:entityFlow.searchStep')}>
                    <div className="space-y-5 pt-4">
                      <EntityMask psn />
                      <SecondaryOutlinedButton
                        label={t('common:cancel')}
                        onClick={cancelGeneration}
                        icon={<XMarkIcon className="mr-1 h-5 w-5" />}
                      />
                    </div>
                  </StepperPanel>

                  <StepperPanel header={t('pseudonyms:entityFlow.selectStep')}>
                    <div className="space-y-5 pt-4">
                      <div className="grid gap-4 lg:grid-cols-2">
                        {results.map((result, index) => (
                          <SearchResult
                            key={
                              result.trustdeckID ?? result.trustdeckId ?? index
                            }
                            pseudonymization
                            result={result}
                            onView={setViewedEntity}
                          />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <PrimaryOutlinedButton
                          label={t('identity:buttons.back')}
                          icon={<ArrowLeftIcon className="h-5 w-5" />}
                          onClick={() => previousStep()}
                        />
                          <SecondaryOutlinedButton
                          label={t('common:cancel')}
                          onClick={cancelGeneration}
                          icon={<XMarkIcon className="mr-1 h-5 w-5" />}
                        />
                      </div>
                    </div>
                  </StepperPanel>

                  <StepperPanel header={t('pseudonyms:entityFlow.groupStep')}>
                    <div className="space-y-5 pt-4">
                      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-base text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
                        <h3 className="font-semibold">
                          {t('pseudonyms:selectedEntity.title')}
                        </h3>
                        <p className="mt-1 break-all font-mono text-lg font-medium">
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
                            <strong className="font-mono">
                              {selectedEntityId.identifier || '—'}
                            </strong>
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

                      <div className="flex flex-wrap gap-3 pt-2">
                        <PrimaryButton
                          label={t('pseudonyms:buttons.create')}
                          onClick={handleEntityPseudonymCreate}
                          loading={entityCreating}
                          disabled={entityCreating}
                          icon={<CheckIcon className="mr-1 h-5 w-5" />}
                        />
                        <PrimaryOutlinedButton
                          label={t('identity:buttons.back')}
                          icon={<ArrowLeftIcon className="h-5 w-5" />}
                          onClick={() => previousStep()}
                          disabled={entityCreating}
                        />
                          <SecondaryOutlinedButton
                          label={t('common:cancel')}
                          onClick={cancelGeneration}
                          disabled={entityCreating}
                          icon={<XMarkIcon className="mr-1 h-5 w-5" />}
                        />
                      </div>
                    </div>
                  </StepperPanel>
                </Stepper>
              </div>
            )}

            {(generationMode === 'standalone' || generationMode === 'secondary') && (
              <div className="space-y-6 rounded-2xl border border-gray-200 p-5 dark:border-slate-700">
                <p className="text-base text-gray-600 dark:text-gray-300">
                  {generationMode === 'secondary'
                    ? t('pseudonyms:management.secondaryFormDescription')
                    : t('pseudonyms:standalone.modalDescription')}
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
                  filterPlaceholder={t(
                    'pseudonyms:standalone.fields.groupSearch'
                  )}
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
                      readOnly={generationMode === 'secondary'}
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
                      readOnly={generationMode === 'secondary'}
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
                        placeholder={t(
                          'pseudonyms:standalone.fields.pseudonym'
                        )}
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
                        placeholder={t(
                          'pseudonyms:standalone.fields.validityTime'
                        )}
                        value={standaloneForm.validityTime}
                        onChange={(event) =>
                          setStandaloneForm((current) => ({
                            ...current,
                            validityTime: event.target.value
                          }))
                        }
                        helpText={t(
                          'pseudonyms:standalone.fields.validityTimeHelp'
                        )}
                        helpIconInside
                      />
                      <CustomCalendar
                        id="standalone-valid-from"
                        placeholder={t(
                          'pseudonyms:standalone.fields.validFrom'
                        )}
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
                      <span>
                        {t('pseudonyms:standalone.fields.omitPrefix')}
                      </span>
                    </label>
                  </div>
                )}

                {standaloneError && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                    {standaloneError}
                  </p>
                )}

                <div className="flex flex-wrap gap-3 pt-2">
                  <PrimaryButton
                    label={t('pseudonyms:buttons.create')}
                    onClick={handleStandaloneCreate}
                    loading={standaloneCreating}
                    disabled={standaloneCreating}
                    icon={<CheckIcon className="mr-1 h-5 w-5" />}
                  />
                  <SecondaryOutlinedButton
                    label={t('common:cancel')}
                    onClick={cancelGeneration}
                    disabled={standaloneCreating}
                    icon={<XMarkIcon className="mr-1 h-5 w-5" />}
                  />
                </div>
              </div>
            )}
          </div>
            )}
          </Panel>
        </div>
      </div>

      <Dialog
        header={t('pseudonyms:entityFlow.entityDetailsTitle')}
        visible={Boolean(viewedEntity)}
        onHide={() => setViewedEntity(null)}
        dismissableMask
        className="w-[min(92vw,900px)]"
      >
        <p className="mb-5 text-base text-gray-600 dark:text-gray-300">
          {t('pseudonyms:entityFlow.entityDetailsDescription')}
        </p>
        <div className="max-h-[65vh] overflow-auto rounded-xl border border-gray-200 dark:border-slate-700">
          <table className="min-w-full divide-y divide-gray-200 text-left dark:divide-slate-700">
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {viewedEntityFields.map((field, index) => (
                <tr key={`${field.label}-${index}`}>
                  <th className="w-1/3 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 dark:bg-slate-900 dark:text-gray-200">
                    {field.label}
                  </th>
                  <td className="break-all px-4 py-3 text-base text-gray-900 dark:text-gray-100">
                    {field.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Dialog>
    </div>
  )
}
