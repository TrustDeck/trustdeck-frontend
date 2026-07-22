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

import type { DefinedPermission, EffectivePermission } from '../types/Permission'

/** Returns a stable identifier for a permission in a resource scope. */
export function permissionKey(p: EffectivePermission): string {
  return `${p.resourceType}:${p.resourceName ?? '*'}:${p.action}`
}

/** Filters effective permissions to the selected project and its domains. */
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

/** Builds the complete, deduplicated set of permissions for a project scope. */
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

/** Groups permissions by their resource type and resource name. */
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
