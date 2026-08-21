/*
 * Trust Deck Services
 * Copyright 2024-2026 Armin Müller and Loic Khodarkovsky
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { useTranslation } from 'react-i18next'
import {
  AutoComplete,
  AutoCompleteChangeEvent,
  AutoCompleteCompleteEvent
} from 'primereact/autocomplete'
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PencilSquareIcon,
  XCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

import Panel from '@component/common/Panel'
import PageHeader from '@component/common/PageHeader'
import PrimaryButton from '@component/form/buttons/PrimaryButton'
import PrimaryOutlinedButton from '@component/form/buttons/PrimaryOutlinedButton'
import SecondaryOutlinedButton from '@component/form/buttons/SecondaryOutlinedButton'
import TrustDeck, { TrustDeckHttpError } from '../../core/services/TrustDeck'
import { refreshAccessTokenForNavigation } from '../../core/services/tokenRefresh'
import { getCurrentUserAccess } from '../../core/services/PermissionCache'
import useToastStore from '../../core/stores/ToastStore'
import useUserStore from '../../core/stores/UserStore'
import useProjectStore from '../../core/stores/ProjectStore'
import type { Operator } from '../../core/types/Permission'
import type {
  DefinedPermission,
  DomainPermissionUpdate,
  EffectivePermission,
  GlobalPermissionUpdate,
  ProjectPermissionUpdate
} from './types/Permission'
import { permissionKey } from './utils/permissionRows'
import {
  DOMAIN_SUBGROUP_LABELS,
  DOMAIN_SUBGROUP_ORDER,
  PROJECT_SUBGROUP_LABELS,
  PROJECT_SUBGROUP_ORDER,
  domainPermissionSubgroup,
  projectPermissionSubgroup
} from './utils/permissionSubgroups'

/** Selects the permission scopes available in the view. */
export type PermissionScopeMode = 'global' | 'project-domain'

type ScopedPermissionsProps = {
  scopeMode?: PermissionScopeMode
  embedded?: boolean
}

type PersonSuggestion = Operator & {
  name: string
  effectivePermissions?: EffectivePermission[]
}

type LoadingState = 'idle' | 'loading' | 'ready' | 'forbidden' | 'error'

type ScopeOption = {
  key: string
  label: string
  resourceType: 'GLOBAL' | 'PROJECT' | 'DOMAIN'
  resourceName?: string
}

type CurrentPermissionGroup = {
  key: string
  label: string
  rows: EffectivePermission[]
}

type PermissionSubgroup = {
  key: string
  label: string
  rows: EffectivePermission[]
}

function uniquePermissions(permissions: EffectivePermission[]) {
  return Array.from(
    new Map(permissions.map((permission) => [permissionKey(permission), permission])).values()
  )
}

function normalize(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

function permissionErrorState(error: unknown): LoadingState {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('403') ? 'forbidden' : 'error'
}

function normalizePermission(permission: any): EffectivePermission | null {
  const resourceType = String(
    permission?.resourceType ?? permission?.resource ?? permission?.scope ?? ''
  ).toUpperCase()
  const resourceName =
    permission?.resourceName ??
    permission?.projectAbbreviation ??
    permission?.projectName ??
    permission?.domainName ??
    permission?.project ??
    permission?.domain
  const action = String(
    permission?.action ?? permission?.operation ?? permission?.permission ?? ''
  )

  if (!resourceType || !action) return null
  return {
    resourceType,
    resourceName: resourceName ? String(resourceName) : undefined,
    action
  }
}

function actionAllows(grantedAction: string, requestedAction: string) {
  const granted = normalize(grantedAction).replace(/[_.-]+/g, ':')
  const requested = normalize(requestedAction).replace(/[_.-]+/g, ':')
  if (!granted || !requested) return false
  if (granted === requested || granted === '*' || granted === 'all') return true

  const [scope] = requested.split(':')
  return (
    granted === `${scope}:*` ||
    granted === `${scope}:all` ||
    granted === `${scope}:crud`
  )
}

function sameResourceScope(a: EffectivePermission, b: EffectivePermission) {
  return (
    normalize(a.resourceType) === normalize(b.resourceType) &&
    normalize(a.resourceName ?? '*') === normalize(b.resourceName ?? '*')
  )
}

function permissionIsGranted(
  grantedPermissions: EffectivePermission[],
  requestedPermission: EffectivePermission
) {
  return grantedPermissions.some(
    (granted) =>
      sameResourceScope(granted, requestedPermission) &&
      actionAllows(granted.action, requestedPermission.action)
  )
}

function privilegedRole(roles: string[]) {
  return roles.some((role) => {
    const normalized = normalize(role)
    return (
      normalized === 'admin' ||
      normalized === 'administrator' ||
      normalized === 'realm-admin' ||
      normalized === 'trustdeck-admin' ||
      normalized === 'trustdeck_admin' ||
      normalized === 'backend-admin'
    )
  })
}

function formatPermissionAction(action: string) {
  return action
    .replace(/[_:.-]+/g, ' ')
    .replace(/\binstances?\b/gi, (term) =>
      term.toLowerCase() === 'instances' ? 'entities' : 'entity'
    )
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function nodeDomainName(node: any): string {
  return String(
    node?.name ??
      node?.label ??
      node?.data?.name ??
      node?.data?.raw?.name ??
      ''
  ).trim()
}

function collectAssignedDomainHierarchy(
  nodes: any[],
  assigned: Set<string>,
  output: Set<string>,
  ancestors: string[] = []
): boolean {
  let containsAssigned = false

  nodes.forEach((node) => {
    const name = nodeDomainName(node)
    const path = name ? [...ancestors, name] : ancestors
    const childContains = collectAssignedDomainHierarchy(
      Array.isArray(node?.children) ? node.children : [],
      assigned,
      output,
      path
    )
    const selected = Boolean(name && assigned.has(name))
    if (selected || childContains) {
      path.forEach((entry) => output.add(entry))
      containsAssigned = true
    }
  })

  return containsAssigned
}

function scopeKey(permission: EffectivePermission) {
  return `${permission.resourceType}:${permission.resourceName ?? '*'}`
}

function scopeLabel(
  option: ScopeOption,
  t: ReturnType<typeof useTranslation>['t'],
  selectedProjectName?: string
) {
  if (option.resourceType === 'GLOBAL') return t('scope.global')
  if (option.resourceType === 'PROJECT') {
    return `${t('scope.project')}: ${selectedProjectName || option.resourceName || '—'}`
  }
  return `${t('scope.domain')}: ${option.resourceName || '—'}`
}

function PermissionRows({
  rows,
  grantedPermissions,
  editable,
  permissionState,
  onChange,
  emptyText
}: {
  rows: EffectivePermission[]
  grantedPermissions: EffectivePermission[]
  editable: boolean
  permissionState?: Record<string, boolean>
  onChange?: (key: string, checked: boolean) => void
  emptyText: string
}) {
  const { t } = useTranslation('permission')

  if (!rows.length) {
    return (
      <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-center text-base text-gray-500 dark:border-slate-700 dark:bg-slate-950 dark:text-gray-300">
        {emptyText}
      </p>
    )
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {rows.map((permission) => {
        const key = permissionKey(permission)
        const checked = editable
          ? Boolean(permissionState?.[key])
          : permissionIsGranted(grantedPermissions, permission)

        return (
          <div
            key={key}
            className={`flex min-h-16 flex-col justify-center rounded-xl border px-3 py-2 transition ${
              editable
                ? 'cursor-pointer border-gray-300 bg-white hover:border-color-blue hover:bg-blue-50/40 focus-within:ring-2 focus-within:ring-color-blue/30 dark:border-slate-600 dark:bg-slate-900 dark:hover:border-blue-500 dark:hover:bg-blue-950/25'
                : 'border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-950'
            }`}
          >
            <span className="flex min-w-0 items-start justify-between gap-3">
              <span className="min-w-0 text-base font-semibold text-gray-900 dark:text-gray-100">
                {formatPermissionAction(permission.action)}
              </span>
              {editable ? (
                <button
                  type="button"
                  role="switch"
                  aria-checked={checked}
                  aria-label={`${formatPermissionAction(permission.action)}: ${
                    checked ? t('status.granted') : t('status.notGranted')
                  }`}
                  onClick={() => onChange?.(key, !checked)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                    checked
                      ? 'bg-emerald-600'
                      : 'bg-gray-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      checked ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              ) : (
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    checked
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-200'
                      : 'bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-gray-300'
                  }`}
                >
                  {checked ? (
                    <CheckCircleIcon className="h-4 w-4 shrink-0" />
                  ) : (
                    <XCircleIcon className="h-4 w-4 shrink-0" />
                  )}
                  {checked ? t('status.granted') : t('status.notGranted')}
                </span>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function buildGrantedPermissionSubgroups(
  group: CurrentPermissionGroup,
  t: ReturnType<typeof useTranslation>['t']
): PermissionSubgroup[] {
  const resourceType = group.rows[0]?.resourceType

  if (resourceType === 'PROJECT') {
    return PROJECT_SUBGROUP_ORDER.map((subgroup) => ({
      key: subgroup,
      label: t(
        `subgroup.project.${subgroup}`,
        PROJECT_SUBGROUP_LABELS[subgroup]
      ),
      rows: group.rows.filter(
        (permission) =>
          projectPermissionSubgroup(permission.action) === subgroup
      )
    })).filter((subgroup) => subgroup.rows.length > 0)
  }

  if (resourceType === 'DOMAIN') {
    return DOMAIN_SUBGROUP_ORDER.map((subgroup) => ({
      key: subgroup,
      label: t(
        `subgroup.group.${subgroup}`,
        DOMAIN_SUBGROUP_LABELS[subgroup]
      ),
      rows: group.rows.filter(
        (permission) => domainPermissionSubgroup(permission.action) === subgroup
      )
    })).filter((subgroup) => subgroup.rows.length > 0)
  }

  return [
    {
      key: 'permissions',
      label: t('scope.permissions'),
      rows: group.rows
    }
  ]
}

function GrantedPermissionList({
  groups,
  grantedPermissions,
  emptyText,
  searchable = true
}: {
  groups: CurrentPermissionGroup[]
  grantedPermissions: EffectivePermission[]
  emptyText: string
  searchable?: boolean
}) {
  const { t } = useTranslation('permission')
  const [openScopes, setOpenScopes] = useState<Record<string, boolean>>({})
  const [query, setQuery] = useState('')
  const groupSignature = groups.map((group) => group.key).join('|')
  const visibleGroups = groups.map((group) => ({
    ...group,
    rows: group.rows.filter(
      (permission) =>
        !searchable ||
        !query.trim() ||
        group.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) ||
        permission.action.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
    )
  }))
    .filter((group) => group.rows.length > 0)

  useEffect(() => {
    setOpenScopes({})
  }, [groupSignature])

  if (!groups.length) {
    return (
      <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-center text-base text-gray-500 dark:border-slate-700 dark:bg-slate-950 dark:text-gray-300">
        {emptyText}
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {searchable && (
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('scope.searchPlaceholder')}
          className="h-[40px] w-full rounded-lg border border-color-light-gray bg-white px-3 font-font-text text-base text-gray-900 outline-none transition focus:border-color-blue focus:ring-1 focus:ring-color-blue dark:bg-slate-950 dark:text-gray-100"
        />
      )}
      {visibleGroups.map((group) => {
        const isOpen = Boolean(openScopes[group.key])
        const subgroups = buildGrantedPermissionSubgroups(group, t)
        const grantedCount = group.rows.filter((permission) =>
          permissionIsGranted(grantedPermissions, permission)
        ).length
        const missingCount = group.rows.length - grantedCount

        return (
          <section
            key={group.key}
            className={`overflow-hidden rounded-xl border ${
              group.rows[0]?.resourceType === 'DOMAIN'
                ? 'border-violet-200 bg-violet-50/70 dark:border-violet-900 dark:bg-violet-950/20'
                : group.rows[0]?.resourceType === 'PROJECT'
                  ? 'border-sky-200 bg-sky-50/70 dark:border-sky-900 dark:bg-sky-950/20'
                  : 'border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-900'
            }`}
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/50 dark:hover:bg-slate-900/30"
              onClick={() =>
                setOpenScopes((current) => ({
                  ...current,
                  [group.key]: !isOpen
                }))
              }
              aria-expanded={isOpen}
            >
              <span className="min-w-0">
                <span className="block truncate text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {group.label}
                </span>
                <span className="mt-1 flex flex-wrap gap-2">
                  <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-200">
                    {t('grantedCount', { count: grantedCount })}
                  </span>
                  {missingCount > 0 && (
                    <span className="inline-flex rounded-full bg-gray-200 px-2.5 py-1 text-sm font-semibold text-gray-600 dark:bg-slate-700 dark:text-gray-300">
                      {t('missingCount', { count: missingCount })}
                    </span>
                  )}
                </span>
              </span>
              {isOpen ? (
                <ChevronDownIcon className="h-5 w-5 shrink-0" />
              ) : (
                <ChevronRightIcon className="h-5 w-5 shrink-0" />
              )}
            </button>

            {isOpen && (
              <div className="space-y-5 border-t border-gray-200 px-5 py-5 dark:border-slate-700">
                {subgroups.map((subgroup) => (
                  <section key={`${group.key}:${subgroup.key}`}>
                    <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {subgroup.label}
                    </h4>
                    <PermissionRows
                      rows={subgroup.rows}
                      grantedPermissions={grantedPermissions}
                      editable={false}
                      emptyText={emptyText}
                    />
                  </section>
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

/** Displays and updates permission grants for the selected scope and operator. */
export default function PermissionManagement({
  scopeMode = 'project-domain',
  embedded = false
}: ScopedPermissionsProps) {
  const { t } = useTranslation(['permission', 'common', 'search'])
  const auth = useAuth()
  const showToast = useToastStore((state) => state.show)
  const currentUserId = useUserStore((state) => state.username)
  const currentUserEmail = useUserStore((state) => state.email)
  const currentUserFullname = useUserStore((state) => state.fullname)
  const currentUserRoles = useUserStore((state) => state.roles)
  const selectedProject = useProjectStore((state) => state.selectedProject)

  const [definedPermissions, setDefinedPermissions] = useState<DefinedPermission[]>([])
  const definedPermissionsRef = useRef<DefinedPermission[] | null>(null)
  const [currentEffectivePermissions, setCurrentEffectivePermissions] = useState<EffectivePermission[]>([])
  const [permissionDomainNames, setPermissionDomainNames] = useState<Set<string>>(new Set<string>())
  const [permissionState, setPermissionState] = useState<Record<string, boolean>>({})
  const [permissionApiState, setPermissionApiState] = useState<LoadingState>('idle')
  const [currentAccessState, setCurrentAccessState] = useState<LoadingState>('idle')
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [targetScopePermissions, setTargetScopePermissions] = useState<EffectivePermission[]>([])
  const [targetAccessState, setTargetAccessState] = useState<LoadingState>('idle')
  const [userSearchRestricted, setUserSearchRestricted] = useState(false)

  const [personValue, setPersonValue] = useState('')
  const [personSuggestions, setPersonSuggestions] = useState<PersonSuggestion[]>([])
  const [selectedPerson, setSelectedPerson] = useState<PersonSuggestion | null>(null)
  const [selectedScopeKey, setSelectedScopeKey] = useState('')
  const [scopeQuery, setScopeQuery] = useState('')
  const [scopePage, setScopePage] = useState(0)

  const currentUserLabel =
    currentUserFullname || currentUserEmail || currentUserId || t('currentUser')

  const loadDefinedPermissions = useCallback(
    async (force = false) => {
      if (!force && definedPermissionsRef.current) {
        return definedPermissionsRef.current
      }

      setPermissionApiState('loading')
      try {
        await refreshAccessTokenForNavigation(auth)
        const permissions = await TrustDeck.instance().getDefinedPermissions()
        const resolved = (permissions ?? []).map((permission) => ({
          ...permission,
          resourceType: String(permission.resourceType ?? '').toUpperCase()
        }))
        definedPermissionsRef.current = resolved
        setDefinedPermissions(resolved)
        setPermissionApiState('ready')
        return resolved
      } catch (error) {
        console.warn('Could not load permission definitions', error)
        definedPermissionsRef.current = null
        setDefinedPermissions([])
        setPermissionApiState(permissionErrorState(error))
        return []
      }
    },
    [auth]
  )

  const fetchPersons = useCallback(
    async (query: string): Promise<PersonSuggestion[]> => {
      await refreshAccessTokenForNavigation(auth)
      const operators = await TrustDeck.instance().searchOperators(query)
      return operators.map((operator: any) => ({
        ...operator,
        name:
          `${operator.firstName ?? ''} ${operator.lastName ?? ''}`.trim() ||
          operator.username,
        effectivePermissions: Array.isArray(operator.effectivePermissions)
          ? operator.effectivePermissions
              .map(normalizePermission)
              .filter(Boolean) as EffectivePermission[]
          : []
      }))
    },
    [auth]
  )

  useEffect(() => {
    if (!auth.isAuthenticated || auth.isLoading) return
    if (auth.user?.access_token) {
      TrustDeck.instance().setToken(auth.user.access_token)
    }
    void loadDefinedPermissions(false)
  }, [
    auth.isAuthenticated,
    auth.isLoading,
    auth.user?.access_token,
    loadDefinedPermissions
  ])

  useEffect(() => {
    let active = true

    async function loadPermissionDomains() {
      if (scopeMode !== 'project-domain' || !selectedProject?.abbreviation) {
        if (active) setPermissionDomainNames(new Set<string>())
        return
      }

      const currentProjectAssigned = new Set<string>()
      const allAssigned = new Set<string>()
      const readableProjectDomains = new Set<string>()

      try {
        const entityTypes = await TrustDeck.instance().getProjectEntities(
          '*',
          selectedProject.abbreviation
        )
        entityTypes.forEach((entityType: any) => {
          const domain = String(entityType?.associatedDomainName ?? '').trim()
          if (!domain) return
          currentProjectAssigned.add(domain)
          allAssigned.add(domain)
        })
      } catch (error) {
        console.warn('Could not load project pseudonym domains', error)
      }

      const resolved = new Set(currentProjectAssigned)
      let domainHierarchy: any[] = []
      try {
        domainHierarchy = await TrustDeck.instance().getDomainsHierarchy()
        if (currentProjectAssigned.size > 0) {
          collectAssignedDomainHierarchy(
            domainHierarchy,
            currentProjectAssigned,
            resolved
          )
        }
      } catch (error) {
        console.warn('Could not load the pseudonym-domain hierarchy', error)
      }

      let assignmentLookupComplete = false
      try {
        const projects = await TrustDeck.instance().getProjects()
        const results = await Promise.allSettled(
          projects.map(async (project: any) => {
            const abbreviation = String(project?.abbreviation ?? '').trim()
            if (!abbreviation) return []
            return TrustDeck.instance().getProjectEntities('*', abbreviation)
          })
        )

        results.forEach((result) => {
          if (result.status !== 'fulfilled') return
          result.value.forEach((entityType: any) => {
            const domain = String(entityType?.associatedDomainName ?? '').trim()
            if (domain) allAssigned.add(domain)
          })
        })
        assignmentLookupComplete = results.every(
          (result) => result.status === 'fulfilled'
        )
      } catch (error) {
        console.warn(
          'Could not determine domain assignments across projects',
          error
        )
      }

      if (assignmentLookupComplete) {
        const assignedWithAncestors = new Set(allAssigned)
        if (domainHierarchy.length > 0 && allAssigned.size > 0) {
          collectAssignedDomainHierarchy(
            domainHierarchy,
            allAssigned,
            assignedWithAncestors
          )
        }

      }

      try {
        const readableDomains = await TrustDeck.instance().searchReadableDomains('*')
        readableDomains.forEach((domain) => {
          const domainName = String(domain?.name ?? '').trim()
          const belongsToProject =
            String(domain?.projectAbbreviation ?? '').toLowerCase() ===
            selectedProject.abbreviation.toLowerCase()
          if (domainName && belongsToProject) {
            resolved.add(domainName)
            readableProjectDomains.add(domainName)
          }
        })
      } catch (error) {
        console.warn('Could not load readable pseudonym domains', error)
      }

      if (active) setPermissionDomainNames(readableProjectDomains)
    }

    void loadPermissionDomains()
    return () => {
      active = false
    }
  }, [scopeMode, selectedProject?.abbreviation])

  useEffect(() => {
    let active = true

    async function loadCurrentScopedPermissions() {
      if (!auth.isAuthenticated || auth.isLoading) return

      setCurrentAccessState('loading')
      const cachedPermissions: EffectivePermission[] = []
      let subjectId = String(auth.user?.profile?.sub ?? '').trim()

      try {
        const cachedAccess = await getCurrentUserAccess(false)
        subjectId = subjectId || String(cachedAccess.subjectId ?? '').trim()
        cachedPermissions.push(
          ...((cachedAccess.effectivePermissions ?? [])
            .map(normalizePermission)
            .filter(Boolean) as EffectivePermission[])
        )
      } catch (error) {
        console.warn('Could not read cached current-user permissions', error)
      }

      const fetchedPermissions: EffectivePermission[] = []
      let hardFailure = false

      if (subjectId) {
        if (scopeMode === 'global') {
          try {
            const permissions = await TrustDeck.instance().getGlobalPermissions(subjectId)
            fetchedPermissions.push(
              ...(permissions.map(normalizePermission).filter(Boolean) as EffectivePermission[])
            )
          } catch (error) {
            if (!(error instanceof TrustDeckHttpError && [403, 404].includes(error.status))) {
              hardFailure = true
              console.warn('Could not load current global permissions', error)
            }
          }
        } else if (selectedProject?.abbreviation) {
          const requests: Promise<unknown[]>[] = [
            TrustDeck.instance().getProjectPermissions(
              selectedProject.abbreviation,
              subjectId
            ) as Promise<unknown[]>
          ]

          Array.from(permissionDomainNames).forEach((domainName) => {
            requests.push(
              TrustDeck.instance().getDomainPermissions(
                domainName,
                subjectId
              ) as Promise<unknown[]>
            )
          })

          const results = await Promise.allSettled(requests)
          results.forEach((result) => {
            if (result.status === 'fulfilled') {
              fetchedPermissions.push(
                ...(result.value
                  .map(normalizePermission)
                  .filter(Boolean) as EffectivePermission[])
              )
              return
            }

            const error = result.reason
            if (!(error instanceof TrustDeckHttpError && [403, 404].includes(error.status))) {
              hardFailure = true
              console.warn('Could not load a current scoped permission set', error)
            }
          })
        }
      }

      if (!active) return
      const merged = uniquePermissions([...cachedPermissions, ...fetchedPermissions])
      setCurrentEffectivePermissions(merged)
      setCurrentAccessState(hardFailure && merged.length === 0 ? 'error' : 'ready')
    }

    void loadCurrentScopedPermissions()
    return () => {
      active = false
    }
  }, [
    auth.isAuthenticated,
    auth.isLoading,
    auth.user?.profile?.sub,
    permissionDomainNames,
    scopeMode,
    selectedProject?.abbreviation
  ])

  const scopeRows = useMemo(() => {
    const rows: EffectivePermission[] = []

    if (scopeMode === 'global') {
      definedPermissions
        .filter((permission) => permission.resourceType === 'GLOBAL')
        .forEach((permission) =>
          rows.push({ resourceType: 'GLOBAL', action: permission.action })
        )
    } else if (selectedProject?.abbreviation) {
      definedPermissions
        .filter((permission) => permission.resourceType === 'PROJECT')
        .forEach((permission) =>
          rows.push({
            resourceType: 'PROJECT',
            resourceName: selectedProject.abbreviation,
            action: permission.action
          })
        )

      Array.from(permissionDomainNames)
        .sort((a, b) => a.localeCompare(b))
        .forEach((domainName) => {
          definedPermissions
            .filter((permission) => permission.resourceType === 'DOMAIN')
            .forEach((permission) =>
              rows.push({
                resourceType: 'DOMAIN',
                resourceName: domainName,
                action: permission.action
              })
            )
        })
    }

    return uniquePermissions(rows)
  }, [definedPermissions, permissionDomainNames, scopeMode, selectedProject?.abbreviation])

  const scopedCurrentPermissions = useMemo(() => {
    return currentEffectivePermissions.filter((permission) => {
      if (scopeMode === 'global') return permission.resourceType === 'GLOBAL'
      if (
        permission.resourceType === 'PROJECT' &&
        permission.resourceName === selectedProject?.abbreviation
      ) {
        return true
      }
      return (
        permission.resourceType === 'DOMAIN' &&
        Boolean(permission.resourceName) &&
        permissionDomainNames.has(permission.resourceName!)
      )
    })
  }, [currentEffectivePermissions, permissionDomainNames, scopeMode, selectedProject?.abbreviation])

  const canManageAll = privilegedRole(currentUserRoles ?? [])
  const manageableRows = useMemo(() => {
    const availableRows = uniquePermissions([
      ...scopeRows,
      ...scopedCurrentPermissions
    ])
    return availableRows.filter(
      (row) => canManageAll || permissionIsGranted(scopedCurrentPermissions, row)
    )
  }, [canManageAll, scopeRows, scopedCurrentPermissions])

  const scopeOptions = useMemo<ScopeOption[]>(() => {
    const options = new Map<string, ScopeOption>()
    manageableRows.forEach((row) => {
      const key = scopeKey(row)
      if (options.has(key)) return
      options.set(key, {
        key,
        resourceType: row.resourceType as ScopeOption['resourceType'],
        resourceName: row.resourceName,
        label: ''
      })
    })

    return Array.from(options.values()).map((option) => ({
      ...option,
      label: scopeLabel(option, t, selectedProject?.name)
    }))
  }, [manageableRows, selectedProject?.name, t])

  useEffect(() => {
    if (scopeMode === 'global') {
      setSelectedScopeKey('GLOBAL:*')
      return
    }
    setSelectedScopeKey((current) =>
      scopeOptions.some((option) => option.key === current)
        ? current
        : scopeOptions[0]?.key ?? ''
    )
  }, [scopeMode, scopeOptions])

  const selectedScopeRows = useMemo(
    () => manageableRows.filter((row) => scopeKey(row) === selectedScopeKey),
    [manageableRows, selectedScopeKey]
  )

  const selectedScope = useMemo(
    () => scopeOptions.find((option) => option.key === selectedScopeKey),
    [scopeOptions, selectedScopeKey]
  )

  const scopeSearchResults = useMemo(() => {
    const project = scopeOptions.find((option) => option.resourceType === 'PROJECT')
    const domains = scopeOptions
      .filter((option) => option.resourceType === 'DOMAIN')
      .sort((a, b) => a.label.localeCompare(b.label))
    const query = scopeQuery.trim().toLocaleLowerCase()

    if (!query) return [...(project ? [project] : []), ...domains]
    return [...(project ? [project] : []), ...domains].filter((option) =>
      option.label.toLocaleLowerCase().includes(query)
    )
  }, [scopeOptions, scopeQuery])

  const scopePageSize = 5
  const scopePageCount = Math.max(1, Math.ceil(scopeSearchResults.length / scopePageSize))
  const visibleScopeResults = scopeSearchResults.slice(
    scopePage * scopePageSize,
    (scopePage + 1) * scopePageSize
  )

  const selectScope = useCallback((scopeKey: string) => {
    setSelectedScopeKey(scopeKey)
    setIsEditing(false)
  }, [])

  useEffect(() => {
    setScopePage(0)
  }, [scopeQuery])

  useEffect(() => {
    setScopePage((page) => Math.min(page, scopePageCount - 1))
  }, [scopePageCount])

  const loadTargetPermissions = useCallback(async () => {
    const userId = selectedPerson?.userId
    if (!userId || !selectedScope) {
      setTargetScopePermissions([])
      setTargetAccessState('idle')
      return
    }

    setTargetAccessState('loading')
    try {
      let permissions: unknown[] = []
      if (selectedScope.resourceType === 'GLOBAL') {
        permissions = (await TrustDeck.instance().getGlobalPermissions(userId)) as unknown[]
      } else if (
        selectedScope.resourceType === 'PROJECT' &&
        selectedScope.resourceName
      ) {
        permissions = (await TrustDeck.instance().getProjectPermissions(
          selectedScope.resourceName,
          userId
        )) as unknown[]
      } else if (
        selectedScope.resourceType === 'DOMAIN' &&
        selectedScope.resourceName
      ) {
        permissions = (await TrustDeck.instance().getDomainPermissions(
          selectedScope.resourceName,
          userId
        )) as unknown[]
      }

      setTargetScopePermissions(
        permissions.map(normalizePermission).filter(Boolean) as EffectivePermission[]
      )
      setTargetAccessState('ready')
    } catch (error) {
      if (error instanceof TrustDeckHttpError && error.status === 404) {
        setTargetScopePermissions([])
        setTargetAccessState('ready')
        return
      }
      console.warn('Could not load permissions for selected user and scope', error)
      setTargetScopePermissions([])
      setTargetAccessState(permissionErrorState(error))
    }
  }, [selectedPerson?.userId, selectedScope])

  useEffect(() => {
    void loadTargetPermissions()
  }, [loadTargetPermissions])

  const selectedPersonPermissions = targetScopePermissions

  const resetPermissionState = useCallback(() => {
    const next: Record<string, boolean> = {}
    selectedScopeRows.forEach((permission) => {
      next[permissionKey(permission)] = permissionIsGranted(
        selectedPersonPermissions,
        permission
      )
    })
    setPermissionState(next)
  }, [selectedPersonPermissions, selectedScopeRows])

  useEffect(() => {
    setIsEditing(false)
    if (!selectedPerson || targetAccessState === 'loading') {
      setPermissionState({})
      return
    }
    resetPermissionState()
  }, [selectedPerson, resetPermissionState, targetAccessState])

  const hasPermissionChanges = useMemo(
    () =>
      selectedScopeRows.some((permission) => {
        const key = permissionKey(permission)
        return (
          Boolean(permissionState[key]) !==
          permissionIsGranted(selectedPersonPermissions, permission)
        )
      }),
    [permissionState, selectedPersonPermissions, selectedScopeRows]
  )

  const groupedCurrentRows = useMemo(() => {
    const groups = new Map<string, EffectivePermission[]>()
    uniquePermissions([...scopeRows, ...scopedCurrentPermissions]).forEach(
      (permission) => {
        const key = scopeKey(permission)
        const entries = groups.get(key) ?? []
        entries.push(permission)
        groups.set(key, entries)
      }
    )

    const resourceOrder: Record<string, number> = {
      GLOBAL: 0,
      PROJECT: 1,
      DOMAIN: 2
    }

    return Array.from(groups.entries())
      .map(([key, rows]) => {
        const [resourceType, resourceName = '*'] = key.split(':')
        const option: ScopeOption = {
          key,
          resourceType: resourceType as ScopeOption['resourceType'],
          resourceName: resourceName === '*' ? undefined : resourceName,
          label: ''
        }
        return {
          key,
          label: scopeLabel(option, t, selectedProject?.name),
          rows: uniquePermissions(rows)
        }
      })
      .sort((left, right) => {
        const leftType = left.rows[0]?.resourceType ?? ''
        const rightType = right.rows[0]?.resourceType ?? ''
        const typeDifference =
          (resourceOrder[leftType] ?? 99) - (resourceOrder[rightType] ?? 99)
        return typeDifference || left.label.localeCompare(right.label)
      })
  }, [scopeRows, scopedCurrentPermissions, selectedProject?.name, t])

  const handlePersonSearch = async (event: AutoCompleteCompleteEvent) => {
    if (!event.query.trim()) {
      setPersonSuggestions([])
      return
    }
    try {
      setUserSearchRestricted(false)
      setPersonSuggestions(await fetchPersons(event.query))
    } catch (error) {
      console.error('Failed to search permission users', error)
      setPersonSuggestions([])
      if (error instanceof TrustDeckHttpError && error.status === 403) {
        setUserSearchRestricted(true)
        return
      }
      showToast({
        severity: 'error',
        summary: t('toast.searchFailed'),
        detail: t('toast.searchFailedDetail'),
        life: 4000
      })
    }
  }

  const handlePersonChange = (event: AutoCompleteChangeEvent) => {
    const value = event.value
    if (value && typeof value === 'object' && 'username' in value) {
      const person = value as PersonSuggestion
      setSelectedPerson(person)
      setIsEditing(false)
      setPersonValue(
        [person.name, person.email ? `(${person.email})` : '']
          .filter(Boolean)
          .join(' ')
      )
      return
    }

    setPersonValue(String(value ?? ''))
    setSelectedPerson(null)
    setIsEditing(false)
  }

  const clearPersonSelection = () => {
    setPersonValue('')
    setSelectedPerson(null)
    setPersonSuggestions([])
    setPermissionState({})
    setIsEditing(false)
  }

  const useEnteredUserId = () => {
    const userId = personValue.trim()
    if (!userId) return
    setIsEditing(false)
    setSelectedPerson({
      userId,
      username: userId,
      name: userId,
      effectivePermissions: []
    })
  }


  const handleSave = async () => {
    const selectedPersonId = selectedPerson?.userId
    if (!selectedPersonId || !selectedScopeRows.length) return

    setSaving(true)
    try {
      await refreshAccessTokenForNavigation(auth)

      const scopeTemplate = selectedScopeRows[0]
      const targetExistingInScope = selectedPersonPermissions.filter((permission) =>
        sameResourceScope(permission, scopeTemplate)
      )
      const manageableKeys = new Set(selectedScopeRows.map(permissionKey))
      const preservedUnmanaged = targetExistingInScope.filter(
        (permission) => !manageableKeys.has(permissionKey(permission))
      )
      const selectedVisible = selectedScopeRows.filter((permission) =>
        Boolean(permissionState[permissionKey(permission)])
      )
      const finalPermissions = uniquePermissions([
        ...preservedUnmanaged,
        ...selectedVisible
      ])

      if (scopeTemplate.resourceType === 'GLOBAL') {
        const payload: GlobalPermissionUpdate[] = finalPermissions.map((permission) => ({
          subjectId: selectedPersonId,
          resourceType: 'GLOBAL',
          action: permission.action,
          decision: 'ALLOW'
        }))
        await TrustDeck.instance().updateGlobalPermissions(selectedPersonId, payload)
      } else if (
        scopeTemplate.resourceType === 'PROJECT' &&
        scopeTemplate.resourceName
      ) {
        const payload: ProjectPermissionUpdate[] = finalPermissions.map((permission) => ({
          subjectId: selectedPersonId,
          resourceType: 'PROJECT',
          projectAbbreviation: scopeTemplate.resourceName!,
          action: permission.action,
          decision: 'ALLOW'
        }))
        await TrustDeck.instance().updateProjectPermissionGrants(
          scopeTemplate.resourceName,
          selectedPersonId,
          payload
        )
      } else if (
        scopeTemplate.resourceType === 'DOMAIN' &&
        scopeTemplate.resourceName
      ) {
        const payload: DomainPermissionUpdate[] = finalPermissions.map((permission) => ({
          subjectId: selectedPersonId,
          resourceType: 'DOMAIN',
          domainName: scopeTemplate.resourceName!,
          action: permission.action,
          decision: 'ALLOW'
        }))
        await TrustDeck.instance().updateDomainPermissionGrants(
          scopeTemplate.resourceName,
          selectedPersonId,
          payload
        )
      }

      await loadTargetPermissions()
      setIsEditing(false)
      showToast({
        severity: 'success',
        summary: t('common:success'),
        detail: t('toast.permissionsUpdated'),
        life: 3000
      })
    } catch (error) {
      console.error('Failed to update scoped permissions', error)
      showToast({
        severity: 'error',
        summary: t('common:error'),
        detail: t('toast.updateFailedDetail'),
        life: 4500
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEditing = () => {
    resetPermissionState()
    setIsEditing(false)
  }

  const handleRetry = async () => {
    setRetrying(true)
    try {
      await refreshAccessTokenForNavigation(auth, { force: true })
      await loadDefinedPermissions(true)
    } finally {
      setRetrying(false)
    }
  }

  const personTemplate = (person: PersonSuggestion) => (
    <div>
      <span className="font-semibold">{person.name}</span>
      {person.email && (
        <span className="ml-2 text-sm text-gray-500">{person.email}</span>
      )}
    </div>
  )

  const projectScopeSelector =
    scopeMode === 'project-domain' ? (
      <section className="space-y-4 border-t border-gray-200 pt-5 dark:border-slate-700">
        <div>
          <h3 className="td-section-title">{t('scope.selectScope')}</h3>
          <p className="td-section-subtitle mt-1">
            {t('scope.selectDescription')}
          </p>
        </div>
        {scopeOptions.length > 0 ? (
          <div className="space-y-3">
            <input
              id="permission-scope-search"
              type="search"
              value={scopeQuery}
              onChange={(event) => setScopeQuery(event.target.value)}
              placeholder={t('scope.searchPlaceholder')}
              className="h-[44px] w-full rounded-lg border border-color-light-gray bg-white px-3 font-font-text text-base text-gray-900 outline-none transition focus:border-color-blue focus:ring-1 focus:ring-color-blue dark:bg-slate-950 dark:text-gray-100"
            />
            {visibleScopeResults.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
                {visibleScopeResults.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => selectScope(option.key)}
                    className={`flex w-full items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 text-left last:border-b-0 dark:border-slate-800 ${
                      option.key === selectedScopeKey
                        ? 'bg-blue-50 text-color-blue dark:bg-blue-950/30 dark:text-blue-100'
                        : 'bg-white text-gray-800 hover:bg-gray-50 dark:bg-slate-900 dark:text-gray-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="min-w-0 truncate text-base font-semibold">
                      {option.label}
                    </span>
                    <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {option.resourceType === 'PROJECT'
                        ? t('scope.project')
                        : t('scope.domain')}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-center text-base text-gray-500 dark:border-slate-700 dark:bg-slate-950 dark:text-gray-300">
                {t('empty.noProjectOrGroupRows')}
              </p>
            )}
            {scopeQuery.trim() && scopeSearchResults.length > scopePageSize && (
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setScopePage((page) => Math.max(0, page - 1))}
                  disabled={scopePage === 0}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:border-color-blue hover:text-color-blue disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-gray-200"
                >
                  {t('search:pagination.previous')}
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {t('search:pagination.pageOf', {
                    page: scopePage + 1,
                    pages: scopePageCount
                  })}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setScopePage((page) => Math.min(scopePageCount - 1, page + 1))
                  }
                  disabled={scopePage >= scopePageCount - 1}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:border-color-blue hover:text-color-blue disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-gray-200"
                >
                  {t('search:pagination.next')}
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-center text-base text-gray-500 dark:border-slate-700 dark:bg-slate-950 dark:text-gray-300">
            {t('empty.noProjectOrGroupRows')}
          </p>
        )}
      </section>
    ) : null

  const currentRightsContent = (
    <div className="space-y-5">
      <div className="text-base text-gray-600 dark:text-gray-300">
        <div className="font-semibold text-gray-900 dark:text-gray-100">
          {currentUserLabel}
        </div>
        {currentUserEmail && <div>{currentUserEmail}</div>}
      </div>
      {projectScopeSelector}

      {currentAccessState === 'loading' || currentAccessState === 'idle' ? (
        <p className="text-base text-gray-500 dark:text-gray-300">
          {t('loading.effectivePermissions')}
        </p>
      ) : currentAccessState === 'forbidden' || currentAccessState === 'error' ? (
        <p className="text-base text-amber-700 dark:text-amber-300">
          {t('errors.effectiveError')}
        </p>
      ) : (
        <GrantedPermissionList
          groups={
            scopeMode === 'project-domain'
              ? groupedCurrentRows.filter((group) => group.key === selectedScopeKey)
              : groupedCurrentRows
          }
          grantedPermissions={scopedCurrentPermissions}
          emptyText={t('empty.noRightsInScope')}
          searchable={false}
        />
      )}
    </div>
  )

  const grantContent = (
    <div className="space-y-5">
      {manageableRows.length === 0 &&
      (permissionApiState === 'loading' || permissionApiState === 'idle') ? (
        <p className="text-base text-gray-500 dark:text-gray-300">
          {t('loading.permissionDefinitions')}
        </p>
      ) : manageableRows.length === 0 &&
        (permissionApiState === 'forbidden' || permissionApiState === 'error') ? (
        <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-base text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <p>{t('errors.definitionsForbidden')}</p>
          <SecondaryOutlinedButton
            label={retrying ? t('actions.retrying') : t('actions.retry')}
            loading={retrying}
            onClick={handleRetry}
          />
        </div>
      ) : manageableRows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-center text-base text-gray-500 dark:border-slate-700 dark:bg-slate-950 dark:text-gray-300">
          {t('empty.noManageableRights')}
        </p>
      ) : (
        <>
          <p className="text-base text-gray-600 dark:text-gray-300">
            {scopeMode === 'global'
              ? t('globalSearchHelp')
              : t('projectDomainSearchHelp')}
          </p>
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-base text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
            {t('assignmentNote')}
          </div>

          {(permissionApiState === 'forbidden' ||
            permissionApiState === 'error') && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              {t('errors.usingHeldRightsOnly')}
            </div>
          )}

          <div className="space-y-2">
            <div className="relative flex w-full min-w-0 items-center gap-2">
              <AutoComplete
                value={personValue}
                suggestions={personSuggestions}
                completeMethod={handlePersonSearch}
                onChange={handlePersonChange}
                field="name"
                itemTemplate={personTemplate}
                forceSelection={false}
                placeholder={t('userSearchPlaceholder')}
                className="min-w-0 flex-1 !w-full"
                inputClassName="w-full min-w-0 text-base"
              />
              {!selectedPerson && personValue.trim() && (
                <PrimaryButton
                  label={t('actions.useUserId')}
                  onClick={useEnteredUserId}
                />
              )}
              {personValue && (
                <button
                  type="button"
                  onClick={clearPersonSelection}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-color-blue text-white"
                  aria-label={t('common:close')}
                  title={t('common:close')}
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              )}
            </div>
            {userSearchRestricted && !selectedPerson && (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {t('userSearchRestrictedFallback')}
              </p>
            )}
          </div>

          {selectedPerson && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-700 dark:border-slate-700 dark:bg-slate-950 dark:text-gray-200">
                <div>
                  <span className="font-semibold">
                    {t('selectedUserPrefix')}
                  </span>{' '}
                  <span>{selectedPerson.name}</span>
                </div>
              </div>

              <section className="border-t border-gray-200 pt-5 dark:border-slate-700">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="td-section-title">
                      {selectedScope?.label || t('scope.global')}
                    </h3>
                    <p className="td-section-subtitle mt-1">
                      {isEditing ? t('editModeHint') : t('viewModeHint')}
                    </p>
                  </div>

                  {!isEditing && (
                    <PrimaryOutlinedButton
                      label={t('actions.editPermissions')}
                      icon={<PencilSquareIcon className="h-5 w-5" />}
                      onClick={() => setIsEditing(true)}
                      disabled={
                        !selectedScopeRows.length ||
                        targetAccessState === 'loading' ||
                        targetAccessState === 'forbidden' ||
                        targetAccessState === 'error'
                      }
                    />
                  )}
                </div>

                {targetAccessState === 'loading' ? (
                  <p className="text-base text-gray-500 dark:text-gray-300">
                    {t('loading.selectedUserPermissions')}
                  </p>
                ) : targetAccessState === 'forbidden' ||
                  targetAccessState === 'error' ? (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                    {t('errors.selectedUserPermissions')}
                  </p>
                ) : (
                  <PermissionRows
                    rows={selectedScopeRows}
                    grantedPermissions={selectedPersonPermissions}
                    editable={isEditing}
                    permissionState={permissionState}
                    onChange={(key, checked) =>
                      setPermissionState((current) => ({
                        ...current,
                        [key]: checked
                      }))
                    }
                    emptyText={t('empty.noManageableRights')}
                  />
                )}
              </section>

              {isEditing && (
                <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-5 dark:border-slate-700">
                  <SecondaryOutlinedButton
                    label={t('actions.cancelEditing')}
                    onClick={handleCancelEditing}
                    disabled={saving}
                  />
                  <PrimaryButton
                    label={
                      saving
                        ? t('actions.saving')
                        : t('actions.savePermissions')
                    }
                    onClick={handleSave}
                    loading={saving}
                    disabled={
                      !hasPermissionChanges ||
                      !selectedScopeRows.length ||
                      targetAccessState === 'loading' ||
                      targetAccessState === 'forbidden' ||
                      targetAccessState === 'error'
                    }
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )

  if (embedded) {
    return (
      <Panel noMaxWidth className="mx-auto !w-full">
        <div className="mb-5">
          <h2 className="td-panel-title !mb-0">{t('globalBoxTitle')}</h2>
          <p className="td-section-subtitle mt-1">{t('globalBoxSubtitle')}</p>
        </div>
        <section>
          <h3 className="td-section-title mb-4">{t('currentAccess')}</h3>
          {currentRightsContent}
        </section>
        <section className="mt-6 border-t border-gray-200 pt-6 dark:border-slate-700">
          <h3 className="td-section-title mb-4">{t('grantOrRevoke')}</h3>
          {grantContent}
        </section>
      </Panel>
    )
  }

  return (
    <div className="td-page-shell text-base">
      <PageHeader
        title={t('projectDomainTitle')}
        description={t('projectDomainIntro')}
      />
      <div className="td-page-content space-y-6">
        <Panel title={t('currentAccess')} noMaxWidth className="!w-full">
          {currentRightsContent}
        </Panel>
        <Panel title={t('grantOrRevoke')} noMaxWidth className="!w-full">
          {grantContent}
        </Panel>
      </div>
    </div>
  )
}
