import type { Operator } from '../../core/types/Permission'

export type EffectivePermission = {
  resourceType: string
  resourceName?: string
  action: string
}

export type DomainPermissionUpdate = {
  subjectId: string
  resourceType: 'DOMAIN'
  domainName: string
  action: string
  decision: 'ALLOW' | 'DENY'
}

export type ProjectPermissionUpdate = {
  subjectId: string
  resourceType: 'PROJECT'
  projectAbbreviation: string
  action: string
  decision: 'ALLOW' | 'DENY'
}

export type GlobalPermissionUpdate = {
  subjectId: string
  resourceType: 'GLOBAL'
  action: string
  decision: 'ALLOW' | 'DENY'
}

export type PersonSuggestion = Operator & {
  name: string
  effectivePermissions?: EffectivePermission[]
}

export type DefinedPermission = {
  resourceType: string
  action: string
}
