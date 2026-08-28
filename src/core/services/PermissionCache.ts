import TrustDeck from './TrustDeck'
import useUserStore from '../stores/UserStore'

export type CachedEffectivePermission = {
  resourceType?: string
  resourceName?: string
  entityTypeName?: string
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
  subjectId?: string
  roles: string[]
  effectivePermissions: CachedEffectivePermission[]
  loadedAt: number
}

const TTL_MS = 3 * 60 * 1000
let cache: CachedUserAccess | null = null
let pending: Promise<CachedUserAccess> | null = null

function currentUserKey() {
  const user = useUserStore.getState()
  const identity = user.username || user.email || user.fullname || 'anonymous'
  const roleSignature = [...(user.roles ?? [])]
    .map((role) => normalize(role))
    .sort()
    .join('|')
  return `${identity}::${roleSignature}`
}

function normalize(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

function normalizedParts(value: unknown) {
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

function currentUserQueries() {
  const user = useUserStore.getState()
  return [user.username, user.email, user.fullname].filter(
    (value): value is string => Boolean(value && value.trim())
  )
}

function extractEffectivePermissions(
  operator: unknown
): CachedEffectivePermission[] {
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
  return Array.isArray(firstArray)
    ? (firstArray as CachedEffectivePermission[])
    : []
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
    (user.username &&
      [
        candidate.userId,
        candidate.username,
        candidate.id,
        candidate.sub
      ].includes(user.username)) ||
    (user.email && candidate.email === user.email)
  )
}

export function clearPermissionCache() {
  cache = null
  pending = null
}

export async function getCurrentUserAccess(
  forceRefresh = false
): Promise<CachedUserAccess> {
  const user = useUserStore.getState()
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
    let subjectId: string | undefined
    const queries = currentUserQueries()

    for (const query of queries) {
      try {
        const operators = await TrustDeck.instance().searchOperators(query)
        const matchingOperator =
          operators.find(isCurrentOperator) ?? operators[0]
        const extracted = extractEffectivePermissions(matchingOperator)
        if (matchingOperator && typeof matchingOperator === 'object') {
          const candidate = matchingOperator as {
            userId?: string
            username?: string
            id?: string
            sub?: string
          }
          subjectId =
            candidate.userId ?? candidate.id ?? candidate.sub ?? candidate.username
        }
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
      subjectId,
      roles: user.roles ?? [],
      effectivePermissions,
      loadedAt: Date.now()
    }
    pending = null
    return cache
  })()

  return pending
}

function projectAdminRoleAllows(roles: string[]) {
  return roles.some((role) => {
    const r = normalize(role)
    const parts = normalizedParts(role)
    const joined = parts.join('-')
    const mentionsProject =
      parts.includes('project') ||
      parts.includes('projects') ||
      r.includes('trustdeck')
    const hasCrud =
      parts.includes('crud') || r.includes('create-read-update-delete')
    const hasAdmin =
      parts.includes('admin') ||
      parts.includes('administrator') ||
      parts.includes('manager') ||
      r === 'admin' ||
      r === 'administrator' ||
      r === 'realm-admin' ||
      r === 'trustdeck-admin' ||
      r === 'trustdeck_admin' ||
      r === 'backend-admin' ||
      r === 'project-admin'

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
      joined.includes('all-project') ||
      (mentionsProject && (hasCrud || hasAdmin)) ||
      (r.includes('admin') && !r.includes('permission-manager'))
    )
  })
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
      r.includes('trustdeck-admin') ||
      (r.includes('admin') && !r.includes('permission-manager'))
    )
  })
}

const ACTION_SCOPES = [
  'base-type',
  'entity',
  'project',
  'pseudonym',
  'domain',
  'record',
  'person',
  'image',
  'roles',
  'type'
]

function normalizeAction(value: unknown) {
  const raw = normalize(value)
    .replace(/[_.]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

  if (!raw) return ''
  if (raw === '*' || raw === 'all') return raw

  // Preserve the backend's scope:operation shape, but also accept role names
  // written as scope-operation, scope_operation, or with a product prefix.
  const colon = normalize(value).replace(/[_.]/g, '-').replace(/\s+/g, '-').replace(/-+/g, '-').replace(':', ':')
  if (colon.includes(':')) {
    const [scope, ...rest] = colon.split(':')
    return `${scope}:${rest.join(':').replace(/:/g, '-')}`
  }

  for (const scope of ACTION_SCOPES) {
    const prefix = `${scope}-`
    if (raw.startsWith(prefix)) return `${scope}:${raw.slice(prefix.length)}`
    const embedded = `-${scope}-`
    const embeddedIndex = raw.indexOf(embedded)
    if (embeddedIndex >= 0) return `${scope}:${raw.slice(embeddedIndex + embedded.length)}`
  }

  return raw
}

function actionPatternAllows(
  grantedAction: unknown,
  requestedAction: string
) {
  const granted = normalizeAction(grantedAction)
  const requested = normalizeAction(requestedAction)
  if (!granted || !requested) return false
  if (granted === requested) return true
  if (granted === '*' || granted === 'all') return true

  const [requestedScope] = requested.split(':')
  const grantedAsRoleSuffix = granted.replace(':', '-')
  const requestedAsRoleSuffix = requested.replace(':', '-')

  return (
    granted === `${requestedScope}:*` ||
    granted === `${requestedScope}:all` ||
    granted === `${requestedScope}:crud` ||
    granted.endsWith(`:${requested}`) ||
    grantedAsRoleSuffix.endsWith(`-${requestedAsRoleSuffix}`)
  )
}

function tokenRoleAllowsProjectAction(roles: string[], requestedAction: string) {
  if (projectAdminRoleAllows(roles)) return true
  return roles.some((role) => actionPatternAllows(role, requestedAction))
}

function permissionAction(permission: CachedEffectivePermission) {
  return (
    permission.action ??
    permission.operation ??
    permission.permission ??
    permission.name
  )
}

function permissionResourceType(permission: CachedEffectivePermission) {
  return (
    permission.resourceType ??
    permission.resource ??
    permission.scope ??
    permission.type
  )
}

function permissionResourceName(permission: CachedEffectivePermission) {
  return (
    permission.resourceName ??
    permission.entityTypeName ??
    permission.entityType ??
    permission.typeName ??
    permission.projectAbbreviation ??
    permission.projectName ??
    permission.domainName ??
    permission.project ??
    permission.domain
  )
}

function permissionDecisionAllows(permission: CachedEffectivePermission) {
  const decision = normalize(permission.decision)
  return (
    !decision ||
    decision === 'allow' ||
    decision === 'allowed' ||
    decision === 'grant' ||
    decision === 'granted'
  )
}

function permissionAllowsProjectAction(
  permission: CachedEffectivePermission,
  projectAbbreviation: string | undefined,
  requestedAction: string
) {
  if (!permissionDecisionAllows(permission)) return false
  if (!actionPatternAllows(permissionAction(permission), requestedAction)) {
    return false
  }

  const resourceType = normalize(permissionResourceType(permission))
  const resourceName = normalize(permissionResourceName(permission))
  const project = normalize(projectAbbreviation)

  if (
    !resourceType ||
    resourceType === 'global' ||
    resourceType === '*' ||
    resourceType === 'all'
  ) {
    return true
  }

  if (resourceType !== 'project' && resourceType !== 'projects') return false
  if (!project) return true

  return (
    !resourceName ||
    resourceName === project ||
    resourceName === '*' ||
    resourceName === 'all'
  )
}

export function canUseProjectAction(
  access: CachedUserAccess | null | undefined,
  projectAbbreviation: string | undefined,
  action: string
) {
  if (!access) return false
  if (tokenRoleAllowsProjectAction(access.roles, action)) return true
  return access.effectivePermissions.some((permission) =>
    permissionAllowsProjectAction(permission, projectAbbreviation, action)
  )
}

function hasGlobalPrivilegedRole(roles: string[]) {
  return roles.some((role) =>
    [
      'admin',
      'administrator',
      'realm-admin',
      'trustdeck-admin',
      'trustdeck_admin',
      'backend-admin'
    ].includes(normalize(role))
  )
}

/** Checks an entity-instance action against the grant for its entity type. */
export function canUseEntityTypeAction(
  access: CachedUserAccess | null | undefined,
  projectAbbreviation: string | undefined,
  entityTypeName: string | undefined,
  action: string
) {
  if (!access) return false
  if (hasGlobalPrivilegedRole(access.roles)) return true

  const project = normalize(projectAbbreviation)
  const entityType = normalize(entityTypeName)
  if (!project || !entityType) return false

  return access.effectivePermissions.some((permission) => {
    if (!permissionDecisionAllows(permission)) return false
    if (!actionPatternAllows(permissionAction(permission), action)) return false

    const resourceType = normalize(permissionResourceType(permission))
    const resourceName = normalize(permissionResourceName(permission))
    const permissionProject = normalize(permission.projectAbbreviation)
    return (
      (resourceType === 'entity-type' || resourceType === 'entity-types') &&
      permissionProject === project &&
      (!resourceName ||
        resourceName === entityType ||
        resourceName === '*' ||
        resourceName === 'all')
    )
  })
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


function tokenRoleAllowsDomainAction(roles: string[], requestedAction: string) {
  if (hasPrivilegedRole(roles)) return true
  return roles.some((role) => actionPatternAllows(role, requestedAction))
}

function permissionAllowsDomainAction(
  permission: CachedEffectivePermission,
  domainName: string | undefined,
  requestedAction: string
) {
  if (!permissionDecisionAllows(permission)) return false
  if (!actionPatternAllows(permissionAction(permission), requestedAction)) {
    return false
  }

  const resourceType = normalize(permissionResourceType(permission))
  const resourceName = normalize(permissionResourceName(permission))
  const domain = normalize(domainName)

  if (
    !resourceType ||
    resourceType === 'global' ||
    resourceType === '*' ||
    resourceType === 'all'
  ) {
    return true
  }

  if (resourceType !== 'domain' && resourceType !== 'domains') return false

  if (!domain) {
    return !resourceName || resourceName === '*' || resourceName === 'all'
  }

  return (
    !resourceName ||
    resourceName === domain ||
    resourceName === '*' ||
    resourceName === 'all'
  )
}

export function canUseDomainAction(
  access: CachedUserAccess | null | undefined,
  domainName: string | undefined,
  action: string
) {
  if (!access) return false
  if (tokenRoleAllowsDomainAction(access.roles, action)) return true
  return access.effectivePermissions.some((permission) =>
    permissionAllowsDomainAction(permission, domainName, action)
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
  if (hasPrivilegedRole(access.roles)) return true

  const expectedType = normalize(resourceType).replace(/_/g, '-')
  const expectedAction = `${expectedType}:manage-permissions`
  const expectedName = normalize(resourceName)
  const expectedProject = normalize(projectAbbreviation)

  if (access.roles.some((role) => actionPatternAllows(role, expectedAction))) {
    return true
  }

  return access.effectivePermissions.some((permission) => {
    if (!permissionDecisionAllows(permission)) return false
    if (!actionPatternAllows(permissionAction(permission), expectedAction)) return false

    const permissionType = normalize(permissionResourceType(permission)).replace(/_/g, '-')
    const permissionName = normalize(permissionResourceName(permission))
    if (permissionType !== expectedType) return false
    if (expectedName && permissionName && permissionName !== expectedName) return false

    return (
      resourceType !== 'ENTITY_TYPE' ||
      !expectedProject ||
      !permission.projectAbbreviation ||
      normalize(permission.projectAbbreviation) === expectedProject
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

function tokenRoleAllowsBaseType(roles: string[]) {
  return roles.some((role) => {
    const r = normalize(role)
    const parts = normalizedParts(role)
    const mentionsBaseType =
      r.includes('base-type') ||
      r.includes('base_type') ||
      r.includes('basetype') ||
      (parts.includes('base') && parts.includes('type'))
    if (!mentionsBaseType) return false
    return [
      'search',
      'read',
      'create',
      'update',
      'delete',
      'manage',
      'manager',
      'admin',
      'crud',
      '*',
      'all'
    ].some((operation) => r.includes(operation) || parts.includes(operation))
  })
}

export function canAccessBaseTypes(
  access: CachedUserAccess | null | undefined
) {
  if (!access) return false
  if (hasPrivilegedRole(access.roles) || tokenRoleAllowsBaseType(access.roles))
    return true

  return access.effectivePermissions.some((permission) => {
    if (!permissionDecisionAllows(permission)) return false

    const resourceType = normalize(permissionResourceType(permission))
    const action = normalize(permissionAction(permission))
    const actionParts = normalizedParts(action)
    const mentionsBaseType =
      action.includes('base-type') ||
      action.includes('base_type') ||
      action.includes('basetype') ||
      (actionParts.includes('base') && actionParts.includes('type')) ||
      resourceType.includes('base-type') ||
      resourceType.includes('basetype')

    if (!mentionsBaseType) return false

    return [
      'search',
      'read',
      'create',
      'update',
      'delete',
      'manage',
      'admin',
      '*',
      'all'
    ].some(
      (operation) =>
        action.includes(operation) || actionParts.includes(operation)
    )
  })
}

export const permissionCacheTtlMs = TTL_MS
