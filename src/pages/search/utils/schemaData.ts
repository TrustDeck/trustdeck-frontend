import type { Attribute } from '../../../core/stores/ProjectStore'

function isNamedDataGroup(attr: Attribute): boolean {
  return (attr as any).layout === 'group' && Boolean(attr.name)
}

export function pickSchemaData(
  attributes: Attribute[],
  source: Record<string, any>
): Record<string, any> {
  const picked: Record<string, any> = {}

  attributes.forEach((attr) => {
    if (attr.layout === 'row' && Array.isArray(attr.attributes)) {
      Object.assign(picked, pickSchemaData(attr.attributes, source))
      return
    }

    if (Array.isArray(attr.attributes)) {
      if (!isNamedDataGroup(attr)) {
        Object.assign(picked, pickSchemaData(attr.attributes, source))
        return
      }

      if (!attr.name) return
      const groupSource = source?.[attr.name]
      if (groupSource === undefined) return

      if (Array.isArray(groupSource)) {
        picked[attr.name] = groupSource.map((entry) =>
          pickSchemaData(attr.attributes ?? [], entry ?? {})
        )
        return
      }

      if (groupSource !== null && typeof groupSource === 'object') {
        picked[attr.name] = pickSchemaData(attr.attributes, groupSource)
        return
      }

      picked[attr.name] = groupSource
      return
    }

    if (!attr.name) return
    if (!Object.prototype.hasOwnProperty.call(source ?? {}, attr.name)) return
    picked[attr.name] = source[attr.name]
  })

  return picked
}
