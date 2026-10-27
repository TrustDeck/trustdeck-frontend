import { describe, expect, it } from 'vitest'

import {
  canAccessBaseTypes,
  canManageGlobalPermissions,
  canManagePermissions,
  canUseDomainAction,
  canUseEntityTypeAction,
  canUseProjectAction,
  holdsAction,
  type CachedUserAccess
} from './PermissionCache'

function access(
  ...effectivePermissions: CachedUserAccess['effectivePermissions']
): CachedUserAccess {
  return { userId: 'user', effectivePermissions, loadedAt: Date.now() }
}

const projectReader = access({
  resourceType: 'PROJECT',
  resourceName: 'TEST',
  action: 'project:read'
})

describe('permission checks', () => {
  it('allows an action only on the granted resource', () => {
    expect(canUseProjectAction(projectReader, 'TEST', 'project:read')).toBe(true)
    expect(canUseProjectAction(projectReader, 'OTHER', 'project:read')).toBe(false)
    expect(canUseProjectAction(projectReader, 'TEST', 'project:update')).toBe(false)
  })

  it('does not derive rights from similar or wildcard action names', () => {
    const wildcard = access(
      { resourceType: 'DOMAIN', resourceName: 'Study', action: 'domain:*' },
      { resourceType: 'DOMAIN', resourceName: 'Study', action: 'domain:crud' }
    )
    expect(canUseDomainAction(wildcard, 'Study', 'domain:read')).toBe(false)
  })

  it('evaluates global actions against global grants', () => {
    const creator = access({ resourceType: 'GLOBAL', action: 'domain:create' })
    expect(canUseDomainAction(creator, undefined, 'domain:create')).toBe(true)
    expect(canUseDomainAction(projectReader, undefined, 'domain:create')).toBe(false)
  })

  it('matches entity types by name and project', () => {
    const entityReader = access({
      resourceType: 'ENTITY_TYPE',
      resourceName: 'person',
      projectAbbreviation: 'TEST',
      action: 'entity:read'
    })
    expect(canUseEntityTypeAction(entityReader, 'TEST', 'person', 'entity:read')).toBe(true)
    expect(canUseEntityTypeAction(entityReader, 'OTHER', 'person', 'entity:read')).toBe(false)
    expect(canUseEntityTypeAction(entityReader, 'TEST', 'visit', 'entity:read')).toBe(false)
  })

  it('requires the scope specific manage permission', () => {
    const domainManager = access({
      resourceType: 'DOMAIN',
      resourceName: 'Study',
      action: 'domain:manage-permissions'
    })
    expect(canManagePermissions(domainManager, 'DOMAIN', 'Study')).toBe(true)
    expect(canManagePermissions(domainManager, 'DOMAIN')).toBe(true)
    expect(canManagePermissions(domainManager, 'PROJECT', 'TEST')).toBe(false)
    expect(canManageGlobalPermissions(domainManager)).toBe(false)
    expect(
      canManageGlobalPermissions(
        access({ resourceType: 'GLOBAL', action: 'global:manage-permissions' })
      )
    ).toBe(true)
  })

  it('reports whether the editor holds an action for delegation', () => {
    expect(holdsAction(projectReader, 'PROJECT', 'project:read', 'TEST')).toBe(true)
    expect(holdsAction(projectReader, 'PROJECT', 'project:delete', 'TEST')).toBe(false)
    expect(holdsAction(projectReader, 'GLOBAL', 'project:read')).toBe(false)
  })

  it('grants base type access only through base type grants', () => {
    expect(canAccessBaseTypes(projectReader)).toBe(false)
    expect(
      canAccessBaseTypes(access({ resourceType: 'GLOBAL', action: 'base-type:read' }))
    ).toBe(true)
  })
})
