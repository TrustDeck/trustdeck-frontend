import { useCallback, useEffect, useMemo, useState } from 'react'
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

type PermissionApiState = 'loading' | 'ready' | 'forbidden' | 'error'

function uniquePermissions(permissions: EffectivePermission[]) {
  return Array.from(new Map(permissions.map((p) => [permissionKey(p), p])).values())
}

function permissionErrorState(error: unknown): PermissionApiState {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('403') ? 'forbidden' : 'error'
}

function ReadOnlyPermissionSummary({ permissions }: { permissions: EffectivePermission[] }) {
  if (!permissions.length) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-300">
        No explicit TrustDeck permissions were found for this account.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {Object.entries(groupPermissionsByScope(uniquePermissions(permissions))).map(([group, perms]) => (
        <div
          key={group}
          className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800"
        >
          <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-100">{group}</h4>
          <div className="flex flex-wrap gap-2">
            {perms.map((perm) => (
              <span
                key={permissionKey(perm)}
                className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm dark:bg-slate-900 dark:text-gray-100"
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
  const currentUserId = useUserStore((state) => state.username)
  const currentUserFullname = useUserStore((state) => state.fullname)
  const currentUserEmail = useUserStore((state) => state.email)
  const currentUserRoles = useUserStore((state) => state.roles)

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const [selectedPerson, setSelectedPerson] = useState<PersonSuggestion | null>(null)
  const [personValue, setPersonValue] = useState<string>('')
  const [personSuggestions, setPersonSuggestions] = useState<PersonSuggestion[]>([])
  const [permissionState, setPermissionState] = useState<Record<string, boolean>>({})
  const [definedPermissions, setDefinedPermissions] = useState<DefinedPermission[]>([])
  const [currentEffectivePermissions, setCurrentEffectivePermissions] = useState<EffectivePermission[]>([])
  const [permissionApiState, setPermissionApiState] = useState<PermissionApiState>('loading')
  const [currentAccessState, setCurrentAccessState] = useState<PermissionApiState>('loading')
  const [loading, setLoading] = useState(false)

  const currentUserLabel = currentUserFullname || currentUserEmail || currentUserId || 'Current user'

  const loadDefinedPermissions = useCallback(async (): Promise<DefinedPermission[]> => {
    if (definedPermissions.length > 0) return definedPermissions

    try {
      const perms = await TrustDeck.instance().getDefinedPermissions()
      const resolved = perms ?? []
      setDefinedPermissions(resolved)
      setPermissionApiState('ready')
      return resolved
    } catch (error) {
      console.warn('Could not load defined permissions', error)
      setDefinedPermissions([])
      setPermissionApiState(permissionErrorState(error))
      return []
    }
  }, [definedPermissions])

  const fetchPersons = useCallback(async (query: string): Promise<PersonSuggestion[]> => {
    const fetchedOperators = await TrustDeck.instance().searchOperators(query)
    return fetchedOperators.map((operator) => ({
      ...operator,
      name: `${operator.firstName ?? ''} ${operator.lastName ?? ''}`.trim() || operator.username
    }))
  }, [])

  useEffect(() => {
    let active = true

    async function loadInitialData() {
      const query = currentUserEmail || currentUserFullname || currentUserId
      const definedPromise = loadDefinedPermissions()

      if (!query) {
        setCurrentAccessState('ready')
        await definedPromise
        return
      }

      try {
        const results = await fetchPersons(query)
        if (!active) return
        const match = results.find(
          (operator) =>
            operator.userId === currentUserId ||
            operator.email === currentUserEmail ||
            operator.username === currentUserId
        ) as PersonSuggestion | undefined
        setCurrentEffectivePermissions(match?.effectivePermissions ?? [])
        setCurrentAccessState('ready')
      } catch (error) {
        if (!active) return
        console.warn('Could not load current user effective permissions', error)
        setCurrentEffectivePermissions([])
        setCurrentAccessState(permissionErrorState(error))
      }

      await definedPromise
    }

    loadInitialData()
    return () => {
      active = false
    }
  }, [currentUserEmail, currentUserFullname, currentUserId, fetchPersons, loadDefinedPermissions])

  const globalPermissionRows = useMemo(() => {
    const rows: EffectivePermission[] = definedPermissions
      .filter((p) => p.resourceType === 'GLOBAL')
      .map((p) => ({ resourceType: 'GLOBAL', action: p.action }))

    rows.push(
      ...(selectedPerson?.effectivePermissions ?? []).filter((p) => p.resourceType === 'GLOBAL')
    )

    return uniquePermissions(rows)
  }, [definedPermissions, selectedPerson?.effectivePermissions])

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
    if (permissionApiState !== 'ready') {
      setPersonSuggestions([])
      return
    }

    await loadDefinedPermissions()
    try {
      const results = await fetchPersons(event.query)
      setPersonSuggestions(results)
    } catch (error) {
      console.error('Failed to search users', error)
      setPersonSuggestions([])
      showToast({
        severity: 'error',
        summary: 'Search failed',
        detail: 'Users could not be loaded. Please check your permission-management access.',
        life: 4000
      })
    }
  }

  const handlePersonChange = async (e: AutoCompleteChangeEvent) => {
    if (e.value == null) return
    const perms = await loadDefinedPermissions()
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
      await loadDefinedPermissions()
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
        detail: 'Failed to update permissions. The backend may have rejected this operation.',
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

  const permissionManagementUnavailable = permissionApiState === 'forbidden' || permissionApiState === 'error'

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] w-full flex-col px-4 pb-10 pt-4 sm:px-8">
      <div className="w-full space-y-6">
        <Panel title="Permission management" className="w-full mx-auto">
          <p className="text-sm text-gray-500 mb-4 dark:text-gray-300">
            Review your current TrustDeck roles and manage global permissions for other users.
          </p>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-50">Your current access</h2>
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-300">
              <div>{currentUserLabel}</div>
              {currentUserEmail && <div>{currentUserEmail}</div>}
            </div>
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                Keycloak roles in token
              </h3>
              {currentUserRoles.length ? (
                <div className="flex flex-wrap gap-2">
                  {currentUserRoles.map((role) => (
                    <span
                      key={role}
                      className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-color-blue dark:bg-blue-950/60 dark:text-blue-100"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-300">No backend client roles were present in the current access token.</p>
              )}
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                Effective TrustDeck permissions
              </h3>
              {currentAccessState === 'loading' ? (
                <p className="text-sm text-gray-500 dark:text-gray-300">Loading effective permissions...</p>
              ) : currentAccessState === 'forbidden' ? (
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Your current account is not allowed to read effective permissions from the backend. The token roles above are still shown.
                </p>
              ) : currentAccessState === 'error' ? (
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Effective permissions could not be loaded. The token roles above are still shown.
                </p>
              ) : (
                <ReadOnlyPermissionSummary permissions={currentEffectivePermissions} />
              )}
            </div>
          </div>
        </Panel>

        <Panel title="Grant or revoke global permissions" className="w-full mx-auto">
          {permissionApiState === 'loading' && (
            <p className="text-sm text-gray-500 dark:text-gray-300">Loading permission definitions...</p>
          )}

          {permissionApiState === 'forbidden' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              Permission management is not available for your current account. The backend rejected access to the permission-definition endpoint with HTTP 403. Ask a PI or system administrator to grant the required permission-management role if you should manage roles for other users.
            </div>
          )}

          {permissionApiState === 'error' && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
              Permission definitions could not be loaded. Please check the backend logs or try again later.
            </div>
          )}

          {!permissionManagementUnavailable && permissionApiState !== 'loading' && (
            <>
              <p className="text-sm text-gray-500 mb-4 dark:text-gray-300">
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
                    <h3 className="text-lg font-semibold mb-2 dark:text-gray-100">Global permissions</h3>
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
            </>
          )}
        </Panel>
      </div>
    </div>
  )
}
