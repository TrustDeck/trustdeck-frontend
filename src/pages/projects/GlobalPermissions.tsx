import { useEffect, useMemo, useState } from 'react'
import Panel from '@component/common/Panel'
import { useTranslation } from 'react-i18next'
import {
  AutoComplete,
  AutoCompleteChangeEvent,
  AutoCompleteCompleteEvent
} from 'primereact/autocomplete'
import { XMarkIcon } from '@heroicons/react/24/outline'
import PrimaryButton from '@component/form/buttons/PrimaryButton.tsx'
import TrustDeck from '../../core/services/TrustDeck'
import useToastStore from '../../core/stores/ToastStore'
import useUserStore from '../../core/stores/UserStore'
import type { Operator } from '../../core/types/Permission'
import type {
  DefinedPermission,
  EffectivePermission,
  GlobalPermissionUpdate
} from '../project/types'
import { groupPermissionsByScope, permissionKey } from '../project/utils/permissionRows'
import EffectivePermissionsList from '../project/components/EffectivePermissionsList'

type PersonSuggestion = Operator & {
  name: string
  effectivePermissions?: EffectivePermission[]
}

function uniquePermissions(permissions: EffectivePermission[]) {
  return Array.from(new Map(permissions.map((p) => [permissionKey(p), p])).values())
}

function ReadOnlyPermissionSummary({ permissions }: { permissions: EffectivePermission[] }) {
  if (!permissions.length) {
    return <p className="text-sm text-gray-500">No explicit TrustDeck permissions were found for this account.</p>
  }

  return (
    <div className="space-y-3">
      {Object.entries(groupPermissionsByScope(uniquePermissions(permissions))).map(([group, perms]) => (
        <div key={group} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <h4 className="mb-2 text-sm font-semibold text-gray-700">{group}</h4>
          <div className="flex flex-wrap gap-2">
            {perms.map((perm) => (
              <span
                key={permissionKey(perm)}
                className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm"
              >
                {perm.action}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function GlobalPermissions() {
  const { t } = useTranslation()
  const showToast = useToastStore((state) => state.show)
  const currentUser = useUserStore((state) => ({
    id: state.username,
    fullname: state.fullname,
    email: state.email,
    roles: state.roles
  }))

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const [selectedPerson, setSelectedPerson] = useState<PersonSuggestion | null>(null)
  const [personValue, setPersonValue] = useState<string>('')
  const [personSuggestions, setPersonSuggestions] = useState<PersonSuggestion[]>([])
  const [permissionState, setPermissionState] = useState<Record<string, boolean>>({})
  const [definedPermissions, setDefinedPermissions] = useState<DefinedPermission[]>([])
  const [currentEffectivePermissions, setCurrentEffectivePermissions] = useState<EffectivePermission[]>([])
  const [loading, setLoading] = useState(false)

  const ensureDefinedPermissions = async () => {
    if (definedPermissions.length > 0) return definedPermissions
    const perms = await TrustDeck.instance().getDefinedPermissions()
    const resolved = perms ?? []
    setDefinedPermissions(resolved)
    return resolved
  }

  useEffect(() => {
    let active = true
    async function loadCurrentUserPermissions() {
      try {
        await ensureDefinedPermissions()
        const query = currentUser.email || currentUser.fullname || currentUser.id
        if (!query) return
        const results = await TrustDeck.instance().searchOperators(query)
        if (!active) return
        const match = results.find(
          (operator) =>
            operator.userId === currentUser.id ||
            operator.email === currentUser.email ||
            operator.username === currentUser.id
        ) as PersonSuggestion | undefined
        setCurrentEffectivePermissions(match?.effectivePermissions ?? [])
      } catch (error) {
        if (!active) return
        console.warn('Could not load current user effective permissions', error)
        setCurrentEffectivePermissions([])
      }
    }
    loadCurrentUserPermissions()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.email, currentUser.fullname, currentUser.id])

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
    return uniquePermissions(rows)
  }, [definedPermissions, selectedPerson?.effectivePermissions])

  const fetchPersons = async (query: string): Promise<PersonSuggestion[]> => {
    const fetchedOperators = await TrustDeck.instance().searchOperators(query)
    return fetchedOperators.map((operator) => ({
      ...operator,
      name: `${operator.firstName ?? ''} ${operator.lastName ?? ''}`.trim() || operator.username
    }))
  }

  const buildStateForPerson = (person: PersonSuggestion, rows: EffectivePermission[]) => {
    const selectedKeys = new Set(
      (person.effectivePermissions ?? [])
        .filter((p) => p.resourceType === 'GLOBAL')
        .map((p) => permissionKey(p))
    )
    const nextState: Record<string, boolean> = {}
    rows.forEach((p) => {
      nextState[permissionKey(p)] = selectedKeys.has(permissionKey(p))
    })
    return nextState
  }

  const refreshSelectedPersonGlobals = async (userId: string, usernameFallback: string): Promise<void> => {
    const latestMatches = await fetchPersons(usernameFallback)
    const refreshed = latestMatches.find((u) => u.userId === userId)
    if (!refreshed) return
    setSelectedPerson(refreshed)
  }

  const handlePersonSearch = async (event: AutoCompleteCompleteEvent) => {
    setSelectedPersonId(null)
    const perms = await ensureDefinedPermissions()
    const results = await fetchPersons(event.query)
    setPersonSuggestions(results.length === 0 ? [] : results)
    if (!perms.length) {
      setPermissionState({})
    }
  }

  const handlePersonChange = async (e: AutoCompleteChangeEvent) => {
    if (e.value == null) return
    const perms = await ensureDefinedPermissions()
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

      const rows = uniquePermissions([
        ...perms
          .filter((p) => p.resourceType === 'GLOBAL')
          .map((p) => ({ resourceType: 'GLOBAL', action: p.action })),
        ...(personSuggestion.effectivePermissions ?? []).filter((p) => p.resourceType === 'GLOBAL')
      ])
      setPermissionState(buildStateForPerson(personSuggestion, rows))
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
      await ensureDefinedPermissions()
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
      await refreshSelectedPersonGlobals(selectedPersonId, selectedPerson.username ?? selectedPerson.name)
      showToast({
        severity: 'success',
        summary: 'Success',
        detail: 'Permissions updated successfully',
        life: 3000
      })
    } catch (error) {
      console.error('Failed to update global permissions', error)
      showToast({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to update permissions',
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
    <div className="flex min-h-[calc(100dvh-7rem)] w-full flex-col px-4 pb-10 pt-4 sm:px-8">
      <div className="w-full space-y-6">
        <Panel title="Permission management" className="w-full mx-auto">
          <p className="text-sm text-gray-500 mb-4">
            Review your current TrustDeck roles and manage global permissions for other users.
          </p>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <h2 className="mb-2 text-lg font-semibold text-gray-900">Your current access</h2>
            <div className="mb-4 text-sm text-gray-600">
              <div>{currentUser.fullname || currentUser.email || currentUser.id}</div>
              {currentUser.email && <div>{currentUser.email}</div>}
            </div>
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Keycloak roles in token</h3>
              {currentUser.roles.length ? (
                <div className="flex flex-wrap gap-2">
                  {currentUser.roles.map((role) => (
                    <span key={role} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-color-blue">
                      {role}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No backend client roles were present in the current access token.</p>
              )}
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Effective TrustDeck permissions</h3>
              <ReadOnlyPermissionSummary permissions={currentEffectivePermissions} />
            </div>
          </div>
        </Panel>

        <Panel title="Grant or revoke global permissions" className="w-full mx-auto">
          <p className="text-sm text-gray-500 mb-4">
            Search for a user and adjust global permissions. Project and group permissions are managed from the respective project and group views.
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
                  label={loading ? 'Saving...' : 'Save permissions'}
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
