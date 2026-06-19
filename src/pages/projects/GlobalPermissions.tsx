import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from 'react-oidc-context'
import Panel from '@component/common/Panel'
import { useTranslation } from 'react-i18next'
import {
  AutoComplete,
  AutoCompleteChangeEvent,
  AutoCompleteCompleteEvent
} from 'primereact/autocomplete'
import { ChevronDownIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline'
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


function formatPermissionAction(action: string) {
  return action
    .replace(/[_:.-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

type PermissionScopeCardProps = {
  title: string
  subtitle?: string
  rows: EffectivePermission[]
  permissionState: Record<string, boolean>
  onPermissionChange: (key: string, checked: boolean) => void
  t: ReturnType<typeof useTranslation>['t']
  defaultOpen?: boolean
}

function PermissionScopeCard({
  title,
  subtitle,
  rows,
  permissionState,
  onPermissionChange,
  t,
  defaultOpen = false
}: PermissionScopeCardProps) {
  const granted = rows.filter((row) => Boolean(permissionState[permissionKey(row)]))
  const missing = rows.filter((row) => !permissionState[permissionKey(row)])

  const renderRows = (items: EffectivePermission[], grantedSection: boolean) => {
    if (!items.length) {
      return (
        <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:border-slate-700 dark:bg-slate-950 dark:text-gray-300">
          {grantedSection ? t('empty.noGrantedInScope') : t('empty.noMissingInScope')}
        </p>
      )
    }

    return (
      <div className="grid gap-2">
        {items.map((permission) => {
          const key = permissionKey(permission)
          return (
            <label
              key={key}
              className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                grantedSection
                  ? 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-emerald-950/30'
                  : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/60'
              }`}
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-color-blue focus:ring-color-blue"
                checked={Boolean(permissionState[key])}
                onChange={(event) => onPermissionChange(key, event.target.checked)}
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatPermissionAction(permission.action)}
                </span>
                <span className="mt-0.5 block truncate font-mono text-[0.72rem] text-gray-500 dark:text-gray-400">
                  {permission.action}
                </span>
              </span>
              <span
                className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${
                  grantedSection
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/70 dark:text-emerald-100'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                {grantedSection ? t('status.granted') : t('status.notGranted')}
              </span>
            </label>
          )
        })}
      </div>
    )
  }

  return (
    <details
      className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ChevronRightIcon className="h-4 w-4 text-gray-500 transition group-open:hidden" />
            <ChevronDownIcon className="hidden h-4 w-4 text-gray-500 transition group-open:block" />
            <h4 className="truncate text-base font-bold text-gray-900 dark:text-gray-50">{title}</h4>
          </div>
          {subtitle && <p className="mt-1 truncate pl-6 text-sm text-gray-500 dark:text-gray-300">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2 text-xs font-bold">
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800 dark:bg-emerald-900/70 dark:text-emerald-100">
            {t('grantedCount', { count: granted.length })}
          </span>
          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {t('missingCount', { count: missing.length })}
          </span>
        </div>
      </summary>
      <div className="grid gap-4 border-t border-gray-100 p-4 dark:border-slate-800 xl:grid-cols-2">
        <section>
          <h5 className="mb-2 text-sm font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            {t('sections.grantedRights')}
          </h5>
          {renderRows(granted, true)}
        </section>
        <section>
          <h5 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">
            {t('sections.missingRights')}
          </h5>
          {renderRows(missing, false)}
        </section>
      </div>
    </details>
  )
}

function ReadOnlyPermissionSummary({ permissions, t }: { permissions: EffectivePermission[]; t: ReturnType<typeof useTranslation>['t'] }) {
  if (!permissions.length) {
    return (
      <p className="text-base text-gray-500 dark:text-gray-300">
        {t('empty.noExplicitPermissions')}
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
  const { t } = useTranslation(['permission', 'common', 'search'])
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

  const currentUserLabel = currentUserFullname || currentUserEmail || currentUserId || t('currentUser')

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
        summary: permissions.length ? t('toast.permissionsRefreshed') : t('toast.noDefinitionsLoaded'),
        detail: permissions.length
          ? t('toast.permissionsRefreshedDetail')
          : t('toast.noDefinitionsLoadedDetail'),
        life: 3500
      })
    } catch (error) {
      console.error('Retrying permission definitions failed', error)
      showToast({
        severity: 'error',
        summary: t('toast.retryFailed'),
        detail: t('toast.retryFailedDetail'),
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
        summary: t('toast.searchFailed'),
        detail: t('toast.searchFailedDetail'),
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
        detail: t('toast.permissionsUpdated'),
        life: 3000
      })
    } catch (error) {
      console.error('Failed to update permissions', error)
      showToast({
        severity: 'error',
        summary: t('common:error'),
        detail: t('toast.updateFailedDetail'),
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

  const projectScopeCards = useMemo(() => {
    const grouped = new Map<string, EffectivePermission[]>()
    projectPermissionRows.forEach((row) => {
      const key = `${row.resourceType}:${row.resourceName ?? '*'}`
      const existing = grouped.get(key) ?? []
      existing.push(row)
      grouped.set(key, existing)
    })

    return Array.from(grouped.entries()).map(([key, rows]) => {
      const [resourceType, resourceName = '*'] = key.split(':')
      const isProject = resourceType === 'PROJECT'
      return {
        key,
        rows,
        title: isProject
          ? `${t('scope.project')}: ${selectedProject?.name ?? resourceName}`
          : `${t('scope.group')}: ${resourceName}`,
        subtitle: isProject
          ? selectedProject?.abbreviation
          : undefined
      }
    })
  }, [projectPermissionRows, selectedProject?.abbreviation, selectedProject?.name, t])

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] w-full flex-col px-4 pb-10 pt-4 text-base sm:px-8">
      <div className="w-full space-y-6">
        <Panel title={t('title')} className="w-full mx-auto">
          <p className="mb-5 text-base text-gray-500 dark:text-gray-300">
            {t('intro')}
          </p>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-50">{t('currentAccess')}</h2>
            <div className="mb-5 text-base text-gray-600 dark:text-gray-300">
              <div>{currentUserLabel}</div>
              {currentUserEmail && <div>{currentUserEmail}</div>}
            </div>
            <div className="mb-5">
              <h3 className="mb-2 text-base font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                {t('keycloakRoles')}
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
                <p className="text-base text-gray-500 dark:text-gray-300">{t('empty.noTokenRoles')}</p>
              )}
            </div>
            <div>
              <h3 className="mb-2 text-base font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                {t('effectivePermissions')}
              </h3>
              {currentAccessState === 'loading' || currentAccessState === 'idle' ? (
                <p className="text-base text-gray-500 dark:text-gray-300">{t('loading.effectivePermissions')}</p>
              ) : currentAccessState === 'forbidden' ? (
                <p className="text-base text-amber-700 dark:text-amber-300">
                  {t('errors.effectiveForbidden')}
                </p>
              ) : currentAccessState === 'error' ? (
                <p className="text-base text-amber-700 dark:text-amber-300">
                  {t('errors.effectiveError')}
                </p>
              ) : (
                <ReadOnlyPermissionSummary permissions={currentEffectivePermissions} t={t} />
              )}
            </div>
          </div>
        </Panel>

        <Panel title={t('grantOrRevoke')} className="w-full mx-auto">
          {permissionApiState === 'loading' || permissionApiState === 'idle' ? (
            <p className="text-base text-gray-500 dark:text-gray-300">{t('loading.permissionDefinitions')}</p>
          ) : null}

          {permissionApiState === 'forbidden' && (
            <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-base text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              <p>
                {t('errors.definitionsForbidden')}
              </p>
              <p>
                {t('errors.retryExplanation')}
              </p>
              <SecondaryOutlinedButton label={retryingDefinitions ? t('actions.refreshing') : t('actions.refreshAndRetry')} loading={retryingDefinitions} onClick={handleRetry} />
            </div>
          )}

          {permissionApiState === 'error' && (
            <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 text-base text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
              <p>{t('errors.definitionsError')}</p>
              <SecondaryOutlinedButton label={retryingDefinitions ? t('actions.retrying') : t('actions.retry')} loading={retryingDefinitions} onClick={handleRetry} />
            </div>
          )}

          {!permissionManagementUnavailable && permissionApiState === 'ready' && (
            <>
              <p className="mb-4 text-base text-gray-500 dark:text-gray-300">
                {t('searchHelp')}
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
                  <PermissionScopeCard
                    title={t('globalPermissions')}
                    rows={globalPermissionRows}
                    permissionState={permissionState}
                    onPermissionChange={(key, checked) =>
                      setPermissionState((prev) => ({ ...prev, [key]: checked }))
                    }
                    t={t}
                    defaultOpen
                  />

                  {selectedProject?.abbreviation ? (
                    <div className="space-y-3">
                      <h3 className="text-xl font-semibold dark:text-gray-100">
                        {t('projectAndGroupPermissionsFor', { project: selectedProject.name })}
                      </h3>
                      {projectScopeCards.length ? (
                        projectScopeCards.map((card, index) => (
                          <PermissionScopeCard
                            key={card.key}
                            title={card.title}
                            subtitle={card.subtitle}
                            rows={card.rows}
                            permissionState={permissionState}
                            onPermissionChange={(key, checked) =>
                              setPermissionState((prev) => ({ ...prev, [key]: checked }))
                            }
                            t={t}
                            defaultOpen={index === 0}
                          />
                        ))
                      ) : (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-base text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-300">
                          {t('empty.noProjectOrGroupRows')}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-base text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-300">
                      {t('selectProjectFirst')}
                    </div>
                  )}

                  <div className="mt-4 flex justify-end">
                    <PrimaryButton
                      label={loading ? t('actions.saving') : t('actions.savePermissions')}
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
