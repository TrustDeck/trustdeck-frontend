import TrustDeck from './TrustDeck'
import useUserStore from '../stores/UserStore'

/** One of the current user's effective grants as reported by the backend. */
export type CachedEffectivePermission = {
  resourceType?: string
  resourceName?: string
  projectAbbreviation?: string
  action?: string
}

export type CachedUserAccess = {
  userId: string
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
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

export function clearPermissionCache() {
  cache = null
  pending = null
}

/**
 * Loads the current user's effective grants from GET /permissions/me.
 * Keycloak roles are deliberately ignored: only TrustDeck grants decide what the UI offers.
 */
export async function getCurrentUserAccess(
  forceRefresh = false
): Promise<CachedUserAccess> {
  const userId = currentUserKey()
  const now = Date.now()

  if (
    !forceRefresh &&
    cache &&
    cache.userId === userId &&
    now - cache.loadedAt < TTL_MS
  ) {
    return cache
  }

  if (!forceRefresh && pending) return pending

  pending = (async () => {
    let effectivePermissions: CachedEffectivePermission[] = []
    try {
      effectivePermissions = await TrustDeck.instance().getOwnPermissions()
    } catch (error) {
      console.warn('Could not refresh current-user permission cache', error)
    }

    cache = { userId, effectivePermissions, loadedAt: Date.now() }
    pending = null
    return cache
  })()

  return pending
}

/**
 * Checks whether a grant allows an action on a resource. Global grants have no resource;
 * a missing resource name in the request matches any resource of the given type.
 */
function grantAllows(
  permission: CachedEffectivePermission,
  action: string,
  resourceType: 'PROJECT' | 'DOMAIN' | 'ENTITY_TYPE',
  resourceName?: string,
  projectAbbreviation?: string
) {
  if (permission.action !== action) return false

  const type = normalize(permission.resourceType)
  if (type === 'global') return true
  if (type !== normalize(resourceType)) return false
  if (resourceName && normalize(permission.resourceName) !== normalize(resourceName)) {
    return false
  }

  return (
    resourceType !== 'ENTITY_TYPE' ||
    !projectAbbreviation ||
    normalize(permission.projectAbbreviation) === normalize(projectAbbreviation)
  )
}

export function canUseProjectAction(
  access: CachedUserAccess | null | undefined,
  projectAbbreviation: string | undefined,
  action: string
) {
  if (!access) return false
  return access.effectivePermissions.some((permission) =>
    grantAllows(permission, action, 'PROJECT', projectAbbreviation)
  )
}

/** Checks an entity-instance action against the grant for its entity type. */
export function canUseEntityTypeAction(
  access: CachedUserAccess | null | undefined,
  projectAbbreviation: string | undefined,
  entityTypeName: string | undefined,
  action: string
) {
  if (!access || !projectAbbreviation || !entityTypeName) return false
  return access.effectivePermissions.some((permission) =>
    grantAllows(permission, action, 'ENTITY_TYPE', entityTypeName, projectAbbreviation)
  )
}

/** Resolves the current user's grant before an entity-instance mutation. */
export async function canCurrentUserUseEntityTypeAction(
  projectAbbreviation: string | undefined,
  entityTypeName: string | undefined,
  action: string
) {
  return canUseEntityTypeAction(
    await getCurrentUserAccess(false),
    projectAbbreviation,
    entityTypeName,
    action
  )
}

export function canUseDomainAction(
  access: CachedUserAccess | null | undefined,
  domainName: string | undefined,
  action: string
) {
  if (!access) return false
  return access.effectivePermissions.some((permission) =>
    grantAllows(permission, action, 'DOMAIN', domainName)
  )
}

/** Checks whether the user may administer grants for a concrete permission scope. */
export function canManagePermissions(
  access: CachedUserAccess | null | undefined,
  resourceType: 'PROJECT' | 'DOMAIN' | 'ENTITY_TYPE',
  resourceName?: string,
  projectAbbreviation?: string
) {
  if (!access) return false
  const action = `${normalize(resourceType).replace(/_/g, '-')}:manage-permissions`
  return access.effectivePermissions.some(
    (permission) =>
      normalize(permission.resourceType) !== 'global' &&
      grantAllows(permission, action, resourceType, resourceName, projectAbbreviation)
  )
}

/** Checks whether the user may administer global grants. */
export function canManageGlobalPermissions(
  access: CachedUserAccess | null | undefined
) {
  if (!access) return false
  return access.effectivePermissions.some(
    (permission) =>
      normalize(permission.resourceType) === 'global' &&
      permission.action === 'global:manage-permissions'
  )
}

/** Checks whether the user holds an action on a resource, e.g. to decide whether they can delegate it. */
export function holdsAction(
  access: CachedUserAccess | null | undefined,
  resourceType: 'GLOBAL' | 'PROJECT' | 'DOMAIN' | 'ENTITY_TYPE',
  action: string,
  resourceName?: string,
  projectAbbreviation?: string
) {
  if (!access) return false
  return access.effectivePermissions.some((permission) => {
    if (permission.action !== action) return false
    if (normalize(permission.resourceType) !== normalize(resourceType)) return false
    if (resourceType === 'GLOBAL') return true
    if (normalize(permission.resourceName) !== normalize(resourceName)) return false
    return (
      resourceType !== 'ENTITY_TYPE' ||
      normalize(permission.projectAbbreviation) === normalize(projectAbbreviation)
    )
  })
}

export function canManageProject(
  access: CachedUserAccess | null | undefined,
  projectAbbreviation: string | undefined,
  operation: 'create' | 'update' | 'delete'
) {
  return canUseProjectAction(access, projectAbbreviation, `project:${operation}`)
}

export function canAccessBaseTypes(
  access: CachedUserAccess | null | undefined
) {
  if (!access) return false
  return access.effectivePermissions.some(
    (permission) =>
      normalize(permission.resourceType) === 'global' &&
      String(permission.action ?? '').startsWith('base-type:')
  )
}

export const permissionCacheTtlMs = TTL_MS
