import TrustDeck from './TrustDeck'
import useUserStore from '../stores/UserStore'

export type CachedEffectivePermission = {
  resourceType?: string
  resourceName?: string
  projectAbbreviation?: string
  projectName?: string
  domainName?: string
  action?: string
  operation?: string
  decision?: string
  [key: string]: unknown
}

export type CachedUserAccess = {
  userId: string
  roles: string[]
  effectivePermissions: CachedEffectivePermission[]
  loadedAt: number
}

const TTL_MS = 3 * 60 * 1000
let cache: CachedUserAccess | null = null
let pending: Promise<CachedUserAccess> | null = null

function currentUserKey() {
  const user = useUserStore.getState()
  return user.username || user.email || user.fullname || 'anonymous'
}

function normalize(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

function normalizedParts(value: unknown) {
  return normalize(value).split(/[^a-z0-9]+/).filter(Boolean)
}

function currentUserQueries() {
  const user = useUserStore.getState()
  return [user.username, user.email, user.fullname]
    .filter((value): value is string => Boolean(value && value.trim()))
}

function extractEffectivePermissions(operator: unknown): CachedEffectivePermission[] {
  if (!operator || typeof operator !== 'object') return []
  const candidate = operator as {
    effectivePermissions?: unknown
    permissions?: unknown
    grantedPermissions?: unknown
    grants?: unknown
  }

  const candidates = [
    candidate.effectivePermissions,
    candidate.permissions,
    candidate.grantedPermissions,
    candidate.grants
  ]

  const firstArray = candidates.find(Array.isArray)
  return Array.isArray(firstArray) ? (firstArray as CachedEffectivePermission[]) : []
}

function isCurrentOperator(operator: unknown) {
  if (!operator || typeof operator !== 'object') return false
  const user = useUserStore.getState()
  const candidate = operator as {
    userId?: string
    username?: string
    email?: string
    id?: string
    sub?: string
  }
  return Boolean(
    (user.username && [candidate.userId, candidate.username, candidate.id, candidate.sub].includes(user.username)) ||
      (user.email && candidate.email === user.email)
  )
}

export function clearPermissionCache() {
  cache = null
  pending = null
}

export async function getCurrentUserAccess(forceRefresh = false): Promise<CachedUserAccess> {
  const user = useUserStore.getState()
  const userId = currentUserKey()
  const now = Date.now()

  if (!forceRefresh && cache && cache.userId === userId && now - cache.loadedAt < TTL_MS) {
    return cache
  }

  if (!forceRefresh && pending) return pending

  pending = (async () => {
    let effectivePermissions: CachedEffectivePermission[] = []
    const queries = currentUserQueries()

    for (const query of queries) {
      try {
        const operators = await TrustDeck.instance().searchOperators(query)
        const matchingOperator = operators.find(isCurrentOperator) ?? operators[0]
        const extracted = extractEffectivePermissions(matchingOperator)
        if (matchingOperator || extracted.length) {
          effectivePermissions = extracted
          break
        }
      } catch (error) {
        console.warn('Could not refresh current-user permission cache', error)
        break
      }
    }

    cache = {
      userId,
      roles: user.roles ?? [],
      effectivePermissions,
      loadedAt: Date.now()
    }
    pending = null
    return cache
  })()

  return pending
}


function tokenRoleAllowsProjectOperation(roles: string[], operation: 'create' | 'update' | 'delete') {
  const exactAction = `project:${operation}`
  return roles.some((role) => {
    const r = normalize(role)
    if (r === exactAction) return true
    if (operation === 'delete' && (r === 'project:manage-permissions' || r === 'project:*')) return true
    if (operation === 'update' && (r === 'project:manage-permissions' || r === 'project:*')) return true
    return false
  })
}

function hasPrivilegedRole(roles: string[]) {
  return roles.some((role) => {
    const r = normalize(role)
    const parts = normalizedParts(role)
    const joined = parts.join('-')
    const hasProject = parts.includes('project') || parts.includes('projects') || r.includes('trustdeck')
    const hasCrud = parts.includes('crud') || r.includes('create-read-update-delete')
    const hasManage = parts.includes('manage') || parts.includes('manager') || parts.includes('admin')

    return (
      r === 'admin' ||
      r === 'administrator' ||
      r === 'realm-admin' ||
      r === 'trustdeck-admin' ||
      r === 'trustdeck_admin' ||
      r === 'backend-admin' ||
      r === 'project-admin' ||
      r === 'project-crud' ||
      r === 'projects-crud' ||
      r === 'all-projects-crud' ||
      r === 'permission-manager' ||
      joined.includes('all-project') ||
      (hasProject && (hasCrud || hasManage)) ||
      r.includes('admin') ||
      r.includes('permission-manager')
    )
  })
}

function operationAliases(operation: 'create' | 'update' | 'delete') {
  if (operation === 'create') return ['create', 'add', 'write', 'save', 'crud', 'manage', 'admin', '*', 'all']
  if (operation === 'update') return ['update', 'edit', 'write', 'modify', 'crud', 'manage', 'admin', '*', 'all']
  return ['delete', 'remove', 'write', 'crud', 'manage', 'admin', '*', 'all']
}

function actionAllows(actionValue: unknown, operation: 'create' | 'update' | 'delete') {
  const action = normalize(actionValue)
  if (!action) return false
  const aliases = operationAliases(operation)
  if (aliases.includes(action)) return true

  const parts = normalizedParts(action)
  if (parts.some((part) => aliases.includes(part))) return true

  // Backend actions are often namespaced, e.g. PROJECT_UPDATE, UPDATE_PROJECT, project:update.
  const mentionsProject = parts.includes('project') || parts.includes('projects') || action.includes('project')
  return mentionsProject && parts.some((part) => aliases.includes(part))
}

function permissionAction(permission: CachedEffectivePermission) {
  return permission.action ?? permission.operation ?? permission.permission ?? permission.name
}

function permissionResourceType(permission: CachedEffectivePermission) {
  return permission.resourceType ?? permission.resource ?? permission.scope ?? permission.type
}

function permissionResourceName(permission: CachedEffectivePermission) {
  return (
    permission.resourceName ??
    permission.projectAbbreviation ??
    permission.projectName ??
    permission.domainName ??
    permission.project ??
    permission.domain
  )
}

function permissionDecisionAllows(permission: CachedEffectivePermission) {
  const decision = normalize(permission.decision)
  return !decision || decision === 'allow' || decision === 'allowed' || decision === 'grant' || decision === 'granted'
}

export function canManageProject(
  access: CachedUserAccess | null | undefined,
  projectAbbreviation: string | undefined,
  operation: 'create' | 'update' | 'delete'
) {
  if (!access) return false
  if (hasPrivilegedRole(access.roles) || tokenRoleAllowsProjectOperation(access.roles, operation)) return true

  return access.effectivePermissions.some((permission) => {
    if (!permissionDecisionAllows(permission)) return false

    const resourceType = normalize(permissionResourceType(permission))
    const resourceName = normalize(permissionResourceName(permission))
    const project = normalize(projectAbbreviation)
    const action = permissionAction(permission)

    if (!actionAllows(action, operation)) return false

    if (!resourceType || resourceType === 'global' || resourceType === '*' || resourceType === 'all') return true
    if (resourceType !== 'project' && resourceType !== 'projects') return false
    if (!project) return true
    return !resourceName || resourceName === project || resourceName === '*' || resourceName === 'all'
  })
}

export const permissionCacheTtlMs = TTL_MS
