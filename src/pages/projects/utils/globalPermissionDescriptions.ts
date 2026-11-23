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

/**
 * The global permission actions the UI can describe. Mirrors the "global" list of the
 * backend's permission configuration (application.yml). When the backend adds a global
 * action, add it here and add its description to public/locales/{en,de}/permission.json.
 */
export const GLOBAL_PERMISSION_ACTIONS = [
  'domain:create',
  'domain:create-complete',
  'domain:list-all',
  'domain:search',
  'project:create',
  'project:list-all',
  'type:create',
  'base-type:create',
  'base-type:read',
  'base-type:search',
  'roles:delete',
  'table:delete',
  'system:statistics',
  'global:manage-permissions'
] as const

/** A global permission action the UI has a description for. */
export type GlobalPermissionAction = (typeof GLOBAL_PERMISSION_ACTIONS)[number]

/** The key prefix of the descriptions in the permission namespace. */
export const GLOBAL_PERMISSION_DESCRIPTION_PREFIX = 'globalPermissionDescription'

/** Checks whether the UI has a description for a global permission action. */
export function isKnownGlobalPermissionAction(
  action: string
): action is GlobalPermissionAction {
  return (GLOBAL_PERMISSION_ACTIONS as readonly string[]).includes(action)
}

/**
 * Returns the translation key of the description of a global permission action, or
 * undefined for actions the UI does not know. Actions such as "base-type:read" are stored
 * nested ("base-type" > "read"), because ":" separates the namespace in i18next keys.
 */
export function globalPermissionDescriptionKey(action: string): string | undefined {
  const normalized = action.trim().toLowerCase()
  if (!isKnownGlobalPermissionAction(normalized)) return undefined
  const [resource, operation] = normalized.split(':')
  return `${GLOBAL_PERMISSION_DESCRIPTION_PREFIX}.${resource}.${operation}`
}
