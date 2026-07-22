/*
 * Trust Deck Services
 * Copyright 2024-2026 Armin Müller and Eric Wündisch
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

import type { Operator } from '../../../core/types/Permission'

/** Describes a permission granted for a resource scope. */
export type EffectivePermission = {
  resourceType: string
  resourceName?: string
  action: string
}

/** Describes a domain-level permission update sent to the API. */
export type DomainPermissionUpdate = {
  subjectId: string
  resourceType: 'DOMAIN'
  domainName: string
  action: string
  decision: 'ALLOW' | 'DENY'
}

/** Describes a project-level permission update sent to the API. */
export type ProjectPermissionUpdate = {
  subjectId: string
  resourceType: 'PROJECT'
  projectAbbreviation: string
  action: string
  decision: 'ALLOW' | 'DENY'
}

/** Describes a global permission update sent to the API. */
export type GlobalPermissionUpdate = {
  subjectId: string
  resourceType: 'GLOBAL'
  action: string
  decision: 'ALLOW' | 'DENY'
}

/** Represents an operator returned by the permission-user search. */
export type PersonSuggestion = Operator & {
  name: string
  effectivePermissions?: EffectivePermission[]
}

/** Defines an action available for a resource type. */
export type DefinedPermission = {
  resourceType: string
  action: string
}
