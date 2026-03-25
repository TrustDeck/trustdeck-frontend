import type { DefinedPermission, EffectivePermission } from '../types'

export function permissionKey(p: EffectivePermission): string {
  return `${p.resourceType}:${p.resourceName ?? '*'}:${p.action}`
}

export function filterEffectivePermissions(
  effective: EffectivePermission[] | undefined,
  projectAbbreviation: string | undefined,
  projectDomainNames: Set<string>,
  includeGlobal = true
): EffectivePermission[] {
  return (effective ?? []).filter((permission) => {
    if (permission.resourceType === 'GLOBAL') return includeGlobal
    if (permission.resourceType === 'PROJECT') {
      return permission.resourceName === projectAbbreviation
    }
    if (permission.resourceType === 'DOMAIN') {
      return Boolean(permission.resourceName) && projectDomainNames.has(permission.resourceName!)
    }
    return false
  })
}

export function buildAllPermissionRows(
  definedPermissions: DefinedPermission[],
  selectedProjectAbbreviation: string | undefined,
  projectDomainNames: Iterable<string>,
  filteredEffectivePermissions: EffectivePermission[],
  includeGlobal = true
): EffectivePermission[] {
  const rows: EffectivePermission[] = []
  const globalActions = definedPermissions
    .filter((p) => p.resourceType === 'GLOBAL')
    .map((p) => p.action)
  const projectActions = definedPermissions
    .filter((p) => p.resourceType === 'PROJECT')
    .map((p) => p.action)
  const domainActions = definedPermissions
    .filter((p) => p.resourceType === 'DOMAIN')
    .map((p) => p.action)

  if (includeGlobal) {
    globalActions.forEach((action) => {
      rows.push({ resourceType: 'GLOBAL', action })
    })
  }

  if (selectedProjectAbbreviation) {
    projectActions.forEach((action) => {
      rows.push({
        resourceType: 'PROJECT',
        resourceName: selectedProjectAbbreviation,
        action
      })
    })
  }

  for (const domainName of projectDomainNames) {
    domainActions.forEach((action) => {
      rows.push({
        resourceType: 'DOMAIN',
        resourceName: domainName,
        action
      })
    })
  }

  rows.push(...filteredEffectivePermissions)

  const unique = new Map<string, EffectivePermission>()
  rows.forEach((p) => unique.set(permissionKey(p), p))
  return Array.from(unique.values())
}

export function groupPermissionsByScope(
  rows: EffectivePermission[]
): Record<string, EffectivePermission[]> {
  return rows.reduce(
    (acc, permission) => {
      const group = `${permission.resourceType} / ${permission.resourceName ?? '*'}`
      if (!acc[group]) acc[group] = []
      acc[group].push(permission)
      return acc
    },
    {} as Record<string, EffectivePermission[]>
  )
}
