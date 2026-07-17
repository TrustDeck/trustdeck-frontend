import type { Attribute } from '../../../core/stores/ProjectStore'
import { formatDateTime } from '../../../core/utils/date'

export type DisplayAttribute = {
  key: string
  label: string
  path: string[]
  required: boolean
}

export function resolveAttributeLabel(
  attribute: Attribute | Record<string, any>,
  language: string
): string {
  const attr = attribute as Record<string, any>
  const isGerman = language.toLowerCase().startsWith('de')

  const labels = attr.labels && typeof attr.labels === 'object' ? attr.labels : {}

  if (isGerman) {
    return String(
      labels.de ??
        labels.en ??
        attr.label_de ??
        attr.labelDe ??
        attr.label_en ??
        attr.labelEn ??
        attr.name ??
        attr.key ??
        ''
    )
  }

  return String(
    labels.en ??
      labels.de ??
      attr.label_en ??
      attr.labelEn ??
      attr.label_de ??
      attr.labelDe ??
      attr.name ??
      attr.key ??
      ''
  )
}

export function collectDisplayAttributes(
  attributes: Attribute[] = [],
  language: string,
  parentPath: string[] = []
): DisplayAttribute[] {
  return attributes.flatMap((attribute, index) => {
    const attr = attribute as Attribute & Record<string, any>
    const nested = Array.isArray(attr.attributes) ? attr.attributes : []

    if (nested.length > 0) {
      const nestedPath =
        attr.layout === 'group' && attr.name
          ? [...parentPath, attr.name]
          : parentPath
      return collectDisplayAttributes(nested, language, nestedPath)
    }

    if (!attr.name) return []

    return [
      {
        key: `${parentPath.join('.')}:${attr.name}:${index}`,
        label: resolveAttributeLabel(attr, language),
        path: [...parentPath, attr.name],
        required: Boolean(attr.required)
      }
    ]
  })
}

export function selectSummaryAttributes(
  attributes: Attribute[] = [],
  language: string,
  limit = 3
): DisplayAttribute[] {
  const all = collectDisplayAttributes(attributes, language)
  const ordered = [
    ...all.filter((attribute) => attribute.required),
    ...all.filter((attribute) => !attribute.required)
  ]

  const seen = new Set<string>()
  return ordered.filter((attribute) => {
    const path = attribute.path.join('.')
    if (seen.has(path)) return false
    seen.add(path)
    return true
  }).slice(0, limit)
}

export function readDisplayValue(
  source: unknown,
  path: string[]
): unknown {
  let current: any = source

  for (const segment of path) {
    if (Array.isArray(current)) {
      const values = current
        .map((entry) => entry?.[segment])
        .filter((entry) => entry !== undefined && entry !== null && entry !== '')
      current = values
      continue
    }

    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }

    current = current[segment]
  }

  return current
}

export function formatDisplayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value)) {
    const formatted = value
      .flatMap((entry) => (Array.isArray(entry) ? entry : [entry]))
      .map(formatDisplayValue)
      .filter((entry) => entry !== '—')
    return formatted.length ? formatted.join(', ') : '—'
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return formatDateTime(value) || value
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
