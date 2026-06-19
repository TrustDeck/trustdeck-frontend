import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from 'react-oidc-context'
import Panel from '@component/common/Panel'
import { useTranslation } from 'react-i18next'
import {
  AutoComplete,
  AutoCompleteChangeEvent,
  AutoCompleteCompleteEvent
} from 'primereact/autocomplete'
import { XMarkIcon } from '@heroicons/react/24/outline'
import PrimaryButton from '@component/form/buttons/PrimaryButton.tsx'
import SecondaryOutlinedButton from '@component/form/buttons/SecondaryOutlinedButton.tsx'
import TrustDeck from '../../core/services/TrustDeck'
import { refreshAccessTokenForNavigation } from '../../core/services/tokenRefresh'
import useToastStore from '../../core/stores/ToastStore'
import useUserStore from '../../core/stores/UserStore'
import useProjectStore from '../../core/stores/ProjectStore'
import type { Operator } from '../../core/types/Permission'
import type {
  DefinedPermission,
  EffectivePermission,
  GlobalPermissionUpdate,
  ProjectPermissionUpdate,
  DomainPermissionUpdate
} from '../project/types'
import {
  buildAllPermissionRows,
  filterEffectivePermissions,
  groupPermissionsByScope,
  permissionKey
} from '../project/utils/permissionRows'
import { collectDomainNames } from '../project/utils/domainTree'
import EffectivePermissionsList from '../project/components/EffectivePermissionsList'

type PersonSuggestion = Operator & {
  name: string
  effectivePermissions?: EffectivePermission[]
}

type PermissionApiState = 'idle' | 'loading' | 'ready' | 'forbidden' | 'error'

function uniquePermissions(permissions: EffectivePermission[]) {
  return Array.from(new Map(permissions.map((p) => [permissionKey(p), p])).values())
}

function permissionErrorState(error: unknown): PermissionApiState {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('403') ? 'forbidden' : 'error'
}

function ReadOnlyPermissionSummary({ permissions, t }: { permissions: EffectivePermission[]; t: ReturnType<typeof useTranslation>['t'] }) {
  if (!permissions.length) {
    return (
      <p className="text-base text-gray-500 dark:text-gray-300">
        {t('permission:empty.noExplicitPermissions')}
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
          <h4 className="mb-2 text-base font-semibold text-gray-700 dark:text-gray-100">{group}</h4>
          <div className="flex flex-wrap gap-2">
            {perms.map((perm) => (
              <span
                key={permissionKey(perm)}
                className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm dark:bg-slate-900 dark:text-gray-100"
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
  const auth = useAuth()
  const showToast = useToastStore((state) => state.show)
  const currentUserId = useUserStore((state) => state.username)
  const currentUserFullname = useUserStore((state) => state.fullname)
  const currentUserEmail = useUserStore((state) => state.email)
  const currentUserRoles = useUserStore((state) => state.roles)
  const selectedProject = useProjectStore((state) => state.selectedProject)

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const [selectedPerson, setSelectedPerson] = useState<PersonSuggestion | null>(null)
  const [personValue, setPersonValue] = useState<string>('')
  const [personSuggestions, setPersonSuggestions] = useState<PersonSuggestion[]>([])
  const [permissionState, setPermissionState] = useState<Record<string, boolean>>({})
  const [definedPermissions, setDefinedPermissions] = useState<DefinedPermission[]>([])
  const definedPermissionsRef = useRef<DefinedPermission[] | null>(null)
  const [projectDomainNames, setProjectDomainNames] = useState<Set<string>>(new Set())
  const [currentEffectivePermissions, setCurrentEffectivePermissions] = useState<EffectivePermission[]>([])
  const [permissionApiState, setPermissionApiState] = useState<PermissionApiState>('idle')
  const [currentAccessState, setCurrentAccessState] = useState<PermissionApiState>('idle')
  const [loading, setLoading] = useState(false)
  const [retryingDefinitions, setRetryingDefinitions] = useState(false)

  const currentUserLabel = currentUserFullname || currentUserEmail || currentUserId || t('permission:currentUser')

  const loadDefinedPermissions = useCallback(async (force = false): Promise<DefinedPermission[]> => {
    if (!force && definedPermissionsRef.current) return definedPermissionsRef.current

    setPermissionApiState('loading')
    try {
      await refreshAccessTokenForNavigation(auth)
      const perms = await TrustDeck.instance().getDefinedPermissions()
      const resolved = perms ?? []
      definedPermissionsRef.current = resolved
      setDefinedPermissions(resolved)
      setPermissionApiState('ready')
      return resolved
    } catch (error) {
      console.warn('Could not load defined permissions', error)
      definedPermissionsRef.current = null
      setDefinedPermissions([])
      setPermissionApiState(permissionErrorState(error))
      return []
    }
  }, [auth])

  const fetchPersons = useCallback(async (query: string): Promise<PersonSuggestion[]> => {
    await refreshAccessTokenForNavigation(auth)
    const fetchedOperators = await TrustDeck.instance().searchOperators(query)
    return fetchedOperators.map((operator) => ({
      ...operator,
      name: `${operator.firstName ?? ''} ${operator.lastName ?? ''}`.trim() || operator.username
    }))
  }, [auth])

  const findCurrentUserSuggestion = useCallback(async (): Promise<PersonSuggestion | undefined> => {
    const queries = [currentUserId, currentUserEmail].filter(
      (value): value is string => Boolean(value && value.trim())
    )

    for (const query of queries) {
      const results = await fetchPersons(query)
      const match = results.find(
        (operator) =>
          operator.username === currentUserId ||
          operator.userId === currentUserId ||
          operator.email === currentUserEmail
      )
      if (match) return match
    }

    return undefined
  }, [currentUserEmail, currentUserId, fetchPersons])

  useEffect(() => {
    let active = true
    async function loadProjectDomains() {
      if (!selectedProject?.abbreviation) {
        if (active) setProjectDomainNames(new Set())
        return
      }
      try {
        const subtree = await TrustDeck.instance().getGroups()
        const names = new Set<string>()
        collectDomainNames(subtree, names)
        if (active) setProjectDomainNames(names)
      } catch (error) {
        console.warn('Could not load project groups for permission management', error)
        if (active) setProjectDomainNames(new Set())
      }
    }
    void loadProjectDomains()
    return () => {
      active = false
    }
  }, [selectedProject?.abbreviation])

  useEffect(() => {
    let active = true

    async function loadInitialData() {
      if (!auth.isAuthenticated || auth.isLoading) return
      await refreshAccessTokenForNavigation(auth)
      const definedPromise = loadDefinedPermissions(false)

      if (!currentUserId && !currentUserEmail) {
        setCurrentAccessState('ready')
        await definedPromise
        return
      }

      setCurrentAccessState('loading')
      try {
        const match = await findCurrentUserSuggestion()
        if (!active) return
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

    void loadInitialData()
    return () => {
      active = false
    }
  }, [auth, auth.isAuthenticated, auth.isLoading, currentUserEmail, currentUserId, findCurrentUserSuggestion, loadDefinedPermissions])

  const globalPermissionRows = useMemo(() => {
    const rows: EffectivePermission[] = definedPermissions
      .filter((p) => p.resourceType === 'GLOBAL')
      .map((p) => ({ resourceType: 'GLOBAL', action: p.action }))

    rows.push(
      ...(selectedPerson?.effectivePermissions ?? []).filter((p) => p.resourceType === 'GLOBAL')
    )

    return uniquePermissions(rows)
  }, [definedPermissions, selectedPerson?.effectivePermissions])

  const projectPermissionRows = useMemo(() => {
    const filteredEffective = filterEffectivePermissions(
      selectedPerson?.effectivePermissions,
      selectedProject?.abbreviation,
      projectDomainNames,
      false
    )
    return buildAllPermissionRows(
      definedPermissions,
      selectedProject?.abbreviation,
      projectDomainNames,
      filteredEffective,
      false
    )
  }, [definedPermissions, projectDomainNames, selectedPerson?.effectivePermissions, selectedProject?.abbreviation])

  const allSelectableRows = useMemo(
    () => uniquePermissions([...globalPermissionRows, ...projectPermissionRows]),
    [globalPermissionRows, projectPermissionRows]
  )

  const buildStateForPerson = (person: PersonSuggestion, rows: EffectivePermission[]) => {
    const selectedKeys = new Set((person.effectivePermissions ?? []).map((p) => permissionKey(p)))
    const nextState: Record<string, boolean> = {}
    rows.forEach((p) => {
      nextState[permissionKey(p)] = selectedKeys.has(permissionKey(p))
    })
    return nextState
  }

  const refreshSelectedPerson = async (userId: string, usernameFallback: string): Promise<void> => {
    const latestMatches = await fetchPersons(usernameFallback)
    const refreshed = latestMatches.find((u) => u.userId === userId)
    if (!refreshed) return
    setSelectedPerson(refreshed)
    setPermissionState(buildStateForPerson(refreshed, allSelectableRows))
  }

  const handleRetry = async () => {
    try {
      setRetryingDefinitions(true)
      await refreshAccessTokenForNavigation(auth, { force: true })
      const permissions = await loadDefinedPermissions(true)
      showToast({
        severity: permissions.length ? 'success' : 'warn',
        summary: permissions.length ? t('permission:toast.permissionsRefreshed') : t('permission:toast.noDefinitionsLoaded'),
        detail: permissions.length
          ? t('permission:toast.permissionsRefreshedDetail')
          : t('permission:toast.noDefinitionsLoadedDetail'),
        life: 3500
      })
    } catch (error) {
      console.error('Retrying permission definitions failed', error)
      showToast({
        severity: 'error',
        summary: t('permission:toast.retryFailed'),
        detail: t('permission:toast.retryFailedDetail'),
        life: 4500
      })
    } finally {
      setRetryingDefinitions(false)
    }
  }

  const handlePersonSearch = async (event: AutoCompleteCompleteEvent) => {
    setSelectedPersonId(null)
    const perms = await loadDefinedPermissions(false)
    if (!perms.length && permissionApiState !== 'ready') {
      setPersonSuggestions([])
      return
    }

    try {
      const results = await fetchPersons(event.query)
      setPersonSuggestions(results)
    } catch (error) {
      console.error('Failed to search users', error)
      setPersonSuggestions([])
      showToast({
        severity: 'error',
        summary: t('permission:toast.searchFailed'),
        detail: t('permission:toast.searchFailedDetail'),
        life: 4000
      })
    }
  }

  const handlePersonChange = async (e: AutoCompleteChangeEvent) => {
    if (e.value == null) return
    await loadDefinedPermissions(false)
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
      setPermissionState(buildStateForPerson(personSuggestion, allSelectableRows))
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
      await refreshAccessTokenForNavigation(auth)
      await loadDefinedPermissions(false)

      const globalPermissions = globalPermissionRows.filter(
        (p) => p.resourceType === 'GLOBAL' && Boolean(permissionState[permissionKey(p)])
      )
      const globalPayload: GlobalPermissionUpdate[] = globalPermissions.map((p) => ({
        subjectId: selectedPersonId,
        resourceType: 'GLOBAL',
        action: p.action,
        decision: 'ALLOW'
      }))

      const updateCalls: Promise<unknown>[] = [
        TrustDeck.instance().updateGlobalPermissions(selectedPersonId, globalPayload)
      ]

      if (selectedProject?.abbreviation) {
        const checkedProjectRows = projectPermissionRows.filter(
          (p) => p.resourceType === 'PROJECT' && Boolean(permissionState[permissionKey(p)])
        )
        const projectPayload: ProjectPermissionUpdate[] = checkedProjectRows.map((p) => ({
          subjectId: selectedPersonId,
          resourceType: 'PROJECT',
          projectAbbreviation: selectedProject.abbreviation,
          action: p.action,
          decision: 'ALLOW'
        }))
        updateCalls.push(
          TrustDeck.instance().updateProjectPermissionGrants(
            selectedProject.abbreviation,
            selectedPersonId,
            projectPayload as never
          )
        )

        Array.from(projectDomainNames).forEach((domainName) => {
          const domainPayload: DomainPermissionUpdate[] = projectPermissionRows
            .filter(
              (p) =>
                p.resourceType === 'DOMAIN' &&
                p.resourceName === domainName &&
                Boolean(permissionState[permissionKey(p)])
            )
            .map((p) => ({
              subjectId: selectedPersonId,
              resourceType: 'DOMAIN',
              domainName,
              action: p.action,
              decision: 'ALLOW'
            }))
          updateCalls.push(
            TrustDeck.instance().updateDomainPermissionGrants(
              domainName,
              selectedPersonId,
              domainPayload as never
            )
          )
        })
      }

      await Promise.all(updateCalls)
      await refreshSelectedPerson(
        selectedPersonId,
        selectedPerson.name || selectedPerson.email || selectedPerson.username || selectedPersonId
      )
      showToast({
        severity: 'success',
        summary: t('common:success'),
        detail: t('permission:toast.permissionsUpdated'),
        life: 3000
      })
    } catch (error) {
      console.error('Failed to update permissions', error)
      showToast({
        severity: 'error',
        summary: t('common:error'),
        detail: t('permission:toast.updateFailedDetail'),
        life: 4000
      })
    } finally {
      setLoading(false)
    }
  }

  const personItemTemplate = (item: PersonSuggestion) => (
    <div>
      <span className="font-semibold">{item.name}</span>
      {item.email && <span className="ml-2 text-sm text-gray-500">{item.email}</span>}
      {item.federation && <span className="ml-2 text-sm text-gray-400">({item.federation})</span>}
    </div>
  )

  const permissionManagementUnavailable = permissionApiState === 'forbidden' || permissionApiState === 'error'

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] w-full flex-col px-4 pb-10 pt-4 text-base sm:px-8">
      <div className="w-full space-y-6">
        <Panel title={t('permission:title')} className="w-full mx-auto">
          <p className="mb-5 text-base text-gray-500 dark:text-gray-300">
            {t('permission:intro')}
          </p>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-50">{t('permission:currentAccess')}</h2>
            <div className="mb-5 text-base text-gray-600 dark:text-gray-300">
              <div>{currentUserLabel}</div>
              {currentUserEmail && <div>{currentUserEmail}</div>}
            </div>
            <div className="mb-5">
              <h3 className="mb-2 text-base font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                {t('permission:keycloakRoles')}
              </h3>
              {currentUserRoles.length ? (
                <div className="flex flex-wrap gap-2">
                  {currentUserRoles.map((role) => (
                    <span
                      key={role}
                      className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-color-blue dark:bg-blue-950/60 dark:text-blue-100"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-base text-gray-500 dark:text-gray-300">{t('permission:empty.noTokenRoles')}</p>
              )}
            </div>
            <div>
              <h3 className="mb-2 text-base font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                {t('permission:effectivePermissions')}
              </h3>
              {currentAccessState === 'loading' || currentAccessState === 'idle' ? (
                <p className="text-base text-gray-500 dark:text-gray-300">{t('permission:loading.effectivePermissions')}</p>
              ) : currentAccessState === 'forbidden' ? (
                <p className="text-base text-amber-700 dark:text-amber-300">
                  {t('permission:errors.effectiveForbidden')}
                </p>
              ) : currentAccessState === 'error' ? (
                <p className="text-base text-amber-700 dark:text-amber-300">
                  {t('permission:errors.effectiveError')}
                </p>
              ) : (
                <ReadOnlyPermissionSummary permissions={currentEffectivePermissions} t={t} />
              )}
            </div>
          </div>
        </Panel>

        <Panel title={t('permission:grantOrRevoke')} className="w-full mx-auto">
          {permissionApiState === 'loading' || permissionApiState === 'idle' ? (
            <p className="text-base text-gray-500 dark:text-gray-300">{t('permission:loading.permissionDefinitions')}</p>
          ) : null}

          {permissionApiState === 'forbidden' && (
            <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-base text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              <p>
                {t('permission:errors.definitionsForbidden')}
              </p>
              <p>
                {t('permission:errors.retryExplanation')}
              </p>
              <SecondaryOutlinedButton label={retryingDefinitions ? t('permission:actions.refreshing') : t('permission:actions.refreshAndRetry')} loading={retryingDefinitions} onClick={handleRetry} />
            </div>
          )}

          {permissionApiState === 'error' && (
            <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 text-base text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
              <p>{t('permission:errors.definitionsError')}</p>
              <SecondaryOutlinedButton label={retryingDefinitions ? t('permission:actions.retrying') : t('permission:actions.retry')} loading={retryingDefinitions} onClick={handleRetry} />
            </div>
          )}

          {!permissionManagementUnavailable && permissionApiState === 'ready' && (
            <>
              <p className="mb-4 text-base text-gray-500 dark:text-gray-300">
                {t('permission:searchHelp')}
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
                  inputClassName="w-full min-w-0 text-base"
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
                <div className="mt-6 space-y-6">
                  <div>
                    <h3 className="mb-2 text-xl font-semibold dark:text-gray-100">{t('permission:globalPermissions')}</h3>
                    <EffectivePermissionsList
                      allPermissionRows={globalPermissionRows}
                      permissionState={permissionState}
                      onPermissionChange={(key, checked) =>
                        setPermissionState((prev) => ({ ...prev, [key]: checked }))
                      }
                    />
                  </div>

                  {selectedProject?.abbreviation ? (
                    <div>
                      <h3 className="mb-2 text-xl font-semibold dark:text-gray-100">
                        {t('permission:projectAndGroupPermissionsFor', { project: selectedProject.name })}
                      </h3>
                      <EffectivePermissionsList
                        allPermissionRows={projectPermissionRows}
                        permissionState={permissionState}
                        onPermissionChange={(key, checked) =>
                          setPermissionState((prev) => ({ ...prev, [key]: checked }))
                        }
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-base text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-300">
                      {t('permission:selectProjectFirst')}
                    </div>
                  )}

                  <div className="mt-4 flex justify-end">
                    <PrimaryButton
                      label={loading ? t('permission:actions.saving') : t('permission:actions.savePermissions')}
                      onClick={handleSave}
                      loading={loading}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </Panel>
      </div>
    </div>
  )
}
