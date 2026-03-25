export const PROJECT_SUBGROUP_ORDER = ['project', 'image', 'type', 'instance'] as const
export type ProjectSubgroup = (typeof PROJECT_SUBGROUP_ORDER)[number]

export const PROJECT_SUBGROUP_LABELS: Record<ProjectSubgroup, string> = {
  project: 'Project',
  image: 'Image',
  type: 'Type',
  instance: 'Instance'
}

export const DOMAIN_SUBGROUP_ORDER = ['domain', 'pseudonym', 'pseudonym-batch'] as const
export type DomainSubgroup = (typeof DOMAIN_SUBGROUP_ORDER)[number]

export const DOMAIN_SUBGROUP_LABELS: Record<DomainSubgroup, string> = {
  domain: 'Domain',
  pseudonym: 'Pseudonym',
  'pseudonym-batch': 'Pseudonym batch'
}

export function projectPermissionSubgroup(action: string): ProjectSubgroup {
  const a = action.toLowerCase()
  const firstSeg = a.split(/[:-]/)[0] ?? ''
  if (firstSeg === 'image' || a.startsWith('image')) return 'image'
  if (firstSeg === 'type' || a.startsWith('type')) return 'type'
  if (firstSeg === 'instance' || a.startsWith('instance')) return 'instance'
  if (firstSeg === 'project' || a.startsWith('project')) return 'project'
  return 'project'
}

export function domainPermissionSubgroup(action: string): DomainSubgroup {
  const a = action.toLowerCase()
  if (/^domain(?:[-_:]|$)/.test(a)) return 'domain'
  if (a.includes('-batch')) return 'pseudonym-batch'
  return 'pseudonym'
}
