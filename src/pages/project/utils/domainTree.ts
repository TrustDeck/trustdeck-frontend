/** Walks the groups API tree and collects domain display names. */
export function collectDomainNames(node: unknown, out: Set<string>): void {
  if (!node || typeof node !== 'object') return
  const n = node as Record<string, unknown>
  const domain = n.domain
  const nameFromDomain =
    domain && typeof domain === 'object' && 'name' in domain
      ? (domain as { name?: unknown }).name
      : undefined
  const name = (typeof nameFromDomain === 'string' ? nameFromDomain : n.name) as unknown
  if (typeof name === 'string' && name.length > 0) out.add(name)
  const children = n.children
  if (Array.isArray(children)) {
    children.forEach((child) => collectDomainNames(child, out))
  }
}
