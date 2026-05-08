import type { Attribute } from '../../../core/stores/ProjectStore'

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
      if (!attr.name) {
        Object.assign(picked, pickSchemaData(attr.attributes, source))
        return
      }

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
