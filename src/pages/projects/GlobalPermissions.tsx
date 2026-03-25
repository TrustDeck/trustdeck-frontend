import { useMemo, useState } from 'react'
import Panel from '@component/common/Panel'
import { useTranslation } from 'react-i18next'
import {
  AutoComplete,
  AutoCompleteChangeEvent,
  AutoCompleteCompleteEvent
} from 'primereact/autocomplete'
import { ArrowLeftIcon, XMarkIcon } from '@heroicons/react/24/outline'
import PrimaryButton from '@component/form/buttons/PrimaryButton.tsx'
import { useNavigate } from 'react-router-dom'
import TrustDeck from '../../core/services/TrustDeck'
import useToastStore from '../../core/stores/ToastStore'
import type { Operator } from '../../core/types/Permission'
import type {
  DefinedPermission,
  EffectivePermission,
  GlobalPermissionUpdate
} from '../project/types'
import { permissionKey } from '../project/utils/permissionRows'
import EffectivePermissionsList from '../project/components/EffectivePermissionsList'
import PrimaryOutlinedButton from '@component/form/buttons/PrimaryOutlinedButton'

type PersonSuggestion = Operator & {
  name: string
  effectivePermissions?: EffectivePermission[]
}

export default function GlobalPermissions() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const showToast = useToastStore((state) => state.show)
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const [selectedPerson, setSelectedPerson] = useState<PersonSuggestion | null>(null)
  const [personValue, setPersonValue] = useState<string>('')
  const [personSuggestions, setPersonSuggestions] = useState<PersonSuggestion[]>([])
  const [permissionState, setPermissionState] = useState<Record<string, boolean>>({})
  const [definedPermissions, setDefinedPermissions] = useState<DefinedPermission[]>([])
  const [loading, setLoading] = useState(false)

  const ensureDefinedPermissions = async () => {
    if (definedPermissions.length > 0) return definedPermissions
    const perms = await TrustDeck.instance().getDefinedPermissions()
    const resolved = perms ?? []
    setDefinedPermissions(resolved)
    return resolved
  }

  const globalPermissionRows = useMemo(() => {
    const globalActions = definedPermissions
      .filter((p) => p.resourceType === 'GLOBAL')
      .map((p) => p.action)

    const rows: EffectivePermission[] = globalActions.map((action) => ({
      resourceType: 'GLOBAL',
      action
    }))

    const selectedGlobal = (selectedPerson?.effectivePermissions ?? []).filter(
      (p) => p.resourceType === 'GLOBAL'
    )
    rows.push(...selectedGlobal)

    const unique = new Map<string, EffectivePermission>()
    rows.forEach((p) => unique.set(permissionKey(p), p))
    return Array.from(unique.values())
  }, [definedPermissions, selectedPerson?.effectivePermissions])

  const fetchPersons = async (query: string): Promise<PersonSuggestion[]> => {
    const fetchedOperators = await TrustDeck.instance().searchOperators(query)
    return fetchedOperators.map((operator) => ({
      ...operator,
      name: `${operator.firstName} ${operator.lastName}`
    }))
  }

  const handlePersonSearch = async (event: AutoCompleteCompleteEvent) => {
    setSelectedPersonId(null)
    await ensureDefinedPermissions()
    const results = await fetchPersons(event.query)
    setPersonSuggestions(results.length === 0 ? [] : results)
  }

  const handlePersonChange = async (e: AutoCompleteChangeEvent) => {
    if (e.value == null) return
    if (e.value && (e.value as PersonSuggestion).username) {
      const personSuggestion = e.value as PersonSuggestion
      setPersonValue(
        [
          personSuggestion.name,
          personSuggestion.email ? `(${personSuggestion.email})` : '',
          personSuggestion.federation ? `(${personSuggestion.federation})` : ''
        ].join(' ')
      )
      setSelectedPersonId(personSuggestion.userId ?? null)
      setSelectedPerson(personSuggestion)

      const initialState: Record<string, boolean> = {}
      const selectedKeys = new Set(
        (personSuggestion.effectivePermissions ?? [])
          .filter((p) => p.resourceType === 'GLOBAL')
          .map((p) => permissionKey(p))
      )
      globalPermissionRows.forEach((p) => {
        initialState[permissionKey(p)] = selectedKeys.has(permissionKey(p))
      })
      setPermissionState(initialState)
      return
    }

    setPersonValue(e.value as string)
    setSelectedPersonId(null)
    setSelectedPerson(null)
    setPermissionState({})
  }

  const clearPersonSelection = () => {
    setPersonValue('')
    setSelectedPersonId(null)
    setPersonSuggestions([])
    setSelectedPerson(null)
    setPermissionState({})
  }

  const handleSave = async () => {
    if (!selectedPersonId || !selectedPerson) return
    try {
      setLoading(true)
      const globalPermissions = globalPermissionRows.filter(
        (p) => p.resourceType === 'GLOBAL' && Boolean(permissionState[permissionKey(p)])
      )
      const payload: GlobalPermissionUpdate[] = globalPermissions.map((p) => ({
        subjectId: selectedPersonId,
        resourceType: 'GLOBAL',
        action: p.action,
        decision: 'ALLOW'
      }))
      await TrustDeck.instance().updateGlobalPermissions(selectedPersonId, payload)
      showToast({
        severity: 'success',
        summary: 'Success',
        detail: 'Global permissions updated successfully',
        life: 3000
      })
    } catch (error) {
      console.error('Failed to update global permissions', error)
      showToast({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to update global permissions',
        life: 4000
      })
    } finally {
      setLoading(false)
    }
  }

  const personItemTemplate = (item: PersonSuggestion) => (
    <div>
      <span className="font-semibold">{item.name}</span>
      {item.email && <span className="ml-2 text-xs text-gray-500">{item.email}</span>}
      {item.federation && <span className="ml-2 text-xs text-gray-400">({item.federation})</span>}
    </div>
  )

  return (
    <div
      className="relative flex min-h-[calc(100dvh-7rem)] w-full flex-col justify-center px-4 pb-10 pt-14 sm:px-8"
    >
      <PrimaryOutlinedButton
        label="Back to projects"
        className="absolute left-4 top-4 z-10 sm:left-6"
        onClick={() => navigate('/projects')}
        icon={<ArrowLeftIcon className="h-5 w-5" />}
        iconPos="left"
      />
      <div className="mx-auto w-full max-w-[min(94vw,90rem)]">
        <Panel title="Global Permissions" className="w-full">
          <p className="text-sm text-gray-500 mb-4">
            Search for a user and manage only global permissions.
          </p>
          <div className="relative flex flex-row items-center w-full min-w-0 gap-2">
            <AutoComplete
              value={personValue}
              suggestions={personSuggestions}
              completeMethod={handlePersonSearch}
              onChange={handlePersonChange}
              field="name"
              itemTemplate={personItemTemplate}
              forceSelection
              placeholder={t('search:searchFor')}
              className="flex-1 min-w-0 w-full"
              inputClassName="w-full min-w-0"
            />
            {personValue && (
              <button
                type="button"
                onClick={clearPersonSelection}
                className="flex-shrink-0 flex px-4 py-2 bg-blue-500 text-white rounded"
                tabIndex={-1}
                aria-label="Clear"
              >
                <XMarkIcon className="h-7 w-7" />
              </button>
            )}
          </div>

          {selectedPersonId && (
            <>
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">Global permissions</h3>
                <EffectivePermissionsList
                  allPermissionRows={globalPermissionRows}
                  permissionState={permissionState}
                  onPermissionChange={(key, checked) =>
                    setPermissionState((prev) => ({ ...prev, [key]: checked }))
                  }
                />
              </div>

              <div className="mt-4 flex justify-end">
                <PrimaryButton
                  label={loading ? 'Saving...' : 'Save Permissions'}
                  onClick={handleSave}
                  loading={loading}
                />
              </div>
            </>
          )}
        </Panel>
      </div>
    </div>
  )
}
