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

import { describe, expect, it } from 'vitest'

import {
  GLOBAL_PERMISSION_ACTIONS,
  GLOBAL_PERMISSION_DESCRIPTION_PREFIX,
  globalPermissionDescriptionKey
} from './globalPermissionDescriptions'

const permissionLocales = import.meta.glob<Record<string, unknown>>(
  '/public/locales/*/permission.json',
  { eager: true, import: 'default' }
)

function localeFor(language: string): Record<string, unknown> {
  const locale = permissionLocales[`/public/locales/${language}/permission.json`]
  if (!locale) throw new Error(`No permission locale found for "${language}"`)
  return locale
}

function lookup(locale: Record<string, unknown>, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (node, segment) =>
        node && typeof node === 'object'
          ? (node as Record<string, unknown>)[segment]
          : undefined,
      locale
    )
}

function describedActions(locale: Record<string, unknown>): string[] {
  const descriptions = locale[GLOBAL_PERMISSION_DESCRIPTION_PREFIX] as Record<
    string,
    Record<string, unknown>
  >
  return Object.entries(descriptions ?? {}).flatMap(([resource, operations]) =>
    Object.keys(operations).map((operation) => `${resource}:${operation}`)
  )
}

describe('global permission descriptions', () => {
  it.each(['en', 'de'])(
    'has a %s description for every global permission action',
    (language) => {
      const locale = localeFor(language)
      const missing = GLOBAL_PERMISSION_ACTIONS.filter((action) => {
        const value = lookup(locale, globalPermissionDescriptionKey(action)!)
        return typeof value !== 'string' || !value.trim()
      })
      expect(missing).toEqual([])
    }
  )

  it.each(['en', 'de'])('has no %s descriptions for unknown actions', (language) => {
    expect(describedActions(localeFor(language)).sort()).toEqual(
      [...GLOBAL_PERMISSION_ACTIONS].sort()
    )
  })

  it('maps actions to nested translation keys without the namespace separator', () => {
    expect(globalPermissionDescriptionKey('base-type:read')).toBe(
      'globalPermissionDescription.base-type.read'
    )
    expect(globalPermissionDescriptionKey(' Domain:Create-Complete ')).toBe(
      'globalPermissionDescription.domain.create-complete'
    )
  })

  it('returns no key for actions without a description', () => {
    expect(globalPermissionDescriptionKey('unknown:action')).toBeUndefined()
    expect(globalPermissionDescriptionKey('')).toBeUndefined()
  })
})
