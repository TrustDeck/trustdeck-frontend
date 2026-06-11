import TrustDeck from './TrustDeck'
import useUserStore from '../stores/UserStore'

export type CachedEffectivePermission = {
  resourceType?: string
  resourceName?: string
  action?: string
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

function currentUserQuery() {
  const user = useUserStore.getState()
  return user.email || user.fullname || user.username
}

function extractEffectivePermissions(operator: unknown): CachedEffectivePermission[] {
  if (!operator || typeof operator !== 'object') return []
  const candidate = operator as { effectivePermissions?: unknown }
  return Array.isArray(candidate.effectivePermissions)
    ? (candidate.effectivePermissions as CachedEffectivePermission[])
    : []
}

function isCurrentOperator(operator: unknown) {
  if (!operator || typeof operator !== 'object') return false
  const user = useUserStore.getState()
  const candidate = operator as {
    userId?: string
    username?: string
    email?: string
  }
  return Boolean(
    (user.username && (candidate.userId === user.username || candidate.username === user.username)) ||
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
    const query = currentUserQuery()

    if (query) {
      try {
        const operators = await TrustDeck.instance().searchOperators(query)
        const matchingOperator = operators.find(isCurrentOperator) ?? operators[0]
        effectivePermissions = extractEffectivePermissions(matchingOperator)
      } catch (error) {
        console.warn('Could not refresh current-user permission cache', error)
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

function hasPrivilegedRole(roles: string[]) {
  return roles.some((role) => {
    const r = normalize(role)
    return (
      r === 'admin' ||
      r === 'administrator' ||
      r === 'realm-admin' ||
      r === 'trustdeck-admin' ||
      r === 'trustdeck_admin' ||
      r === 'backend-admin' ||
      r === 'project-admin' ||
      r === 'permission-manager' ||
      r.includes('admin') ||
      r.includes('permission-manager')
    )
  })
}

function actionAllows(action: string, operation: 'create' | 'update' | 'delete') {
  const a = normalize(action)
  if (!a) return false
  if (a === '*' || a === 'all') return true
  if (
    a.includes('project-admin') ||
    a.includes('project-manage') ||
    a.includes('manage-project') ||
    a.includes('permission-manager')
  ) {
    return true
  }
  if (!a.includes('project')) return false
  if (operation === 'create') return a.includes('create') || a.includes('write')
  if (operation === 'update') return a.includes('update') || a.includes('edit') || a.includes('write')
  return a.includes('delete') || a.includes('remove')
}

export function canManageProject(
  access: CachedUserAccess | null | undefined,
  projectAbbreviation: string | undefined,
  operation: 'create' | 'update' | 'delete'
) {
  if (!access) return false
  if (hasPrivilegedRole(access.roles)) return true

  return access.effectivePermissions.some((permission) => {
    const resourceType = normalize(permission.resourceType)
    const resourceName = normalize(permission.resourceName)
    const project = normalize(projectAbbreviation)
    const action = normalize(permission.action)

    if (!actionAllows(action, operation)) return false
    if (resourceType === 'global') return true
    if (resourceType !== 'project') return false
    if (!project) return true
    return !resourceName || resourceName === project
  })
}

export const permissionCacheTtlMs = TTL_MS
