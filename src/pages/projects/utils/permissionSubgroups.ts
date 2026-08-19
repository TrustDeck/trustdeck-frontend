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

/** Orders project permissions for display. */
export const PROJECT_SUBGROUP_ORDER = ['project', 'image', 'type', 'instance'] as const
/** Represents a project permission display subgroup. */
export type ProjectSubgroup = (typeof PROJECT_SUBGROUP_ORDER)[number]

/** Contains the default labels for project permission subgroups. */
export const PROJECT_SUBGROUP_LABELS: Record<ProjectSubgroup, string> = {
  project: 'Project',
  image: 'Image',
  type: 'Type',
  instance: 'Entities'
}

/** Orders domain permissions for display. */
export const DOMAIN_SUBGROUP_ORDER = ['domain', 'pseudonym', 'pseudonym-batch'] as const
/** Represents a domain permission display subgroup. */
export type DomainSubgroup = (typeof DOMAIN_SUBGROUP_ORDER)[number]

/** Contains the default labels for domain permission subgroups. */
export const DOMAIN_SUBGROUP_LABELS: Record<DomainSubgroup, string> = {
  domain: 'Domain',
  pseudonym: 'Pseudonym',
  'pseudonym-batch': 'Pseudonym batch'
}

/** Maps a project permission action to its display subgroup. */
export function projectPermissionSubgroup(action: string): ProjectSubgroup {
  const a = action.toLowerCase()
  const firstSeg = a.split(/[:-]/)[0] ?? ''
  if (firstSeg === 'image' || a.startsWith('image')) return 'image'
  if (firstSeg === 'type' || a.startsWith('type')) return 'type'
  if (firstSeg === 'instance' || a.startsWith('instance')) return 'instance'
  if (firstSeg === 'project' || a.startsWith('project')) return 'project'
  return 'project'
}

/** Maps a domain permission action to its display subgroup. */
export function domainPermissionSubgroup(action: string): DomainSubgroup {
  const a = action.toLowerCase()
  if (/^domain(?:[-_:]|$)/.test(a)) return 'domain'
  if (a.includes('-batch')) return 'pseudonym-batch'
  return 'pseudonym'
}
