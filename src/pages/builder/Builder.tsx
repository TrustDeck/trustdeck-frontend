import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  InformationCircleIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import Panel from '../../core/components/common/Panel'
import CustomDropdown from '../../core/components/form/CustomDropdown'
import InheritanceIndicator from '../../core/components/common/InheritanceIndicator'
import PrimaryButton from '@component/form/buttons/PrimaryButton'
import PrimaryOutlinedButton from '@component/form/buttons/PrimaryOutlinedButton'
import TrustDeck from '../../core/services/TrustDeck'
import useToastStore from '../../core/stores/ToastStore'
import useProjectStore from '../../core/stores/ProjectStore'

type LayoutValue = 'row' | 'col' | 'group'
type PrivacyMode = 'plain' | 'pprl'
type PprlMethod = 'ngramBloomFilter' | 'hmacExact'
type MatchAction = 'reject' | 'returnExisting'
type DropIndicator = {
  targetKey: string
  position: 'before' | 'after' | 'inside'
} | null

type LabelMap = Record<string, string>

const SYSTEM_IDENTIFIER_PATTERN = /^[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)*$/

function filterGroupOptions(
  options: { label: string; value: string }[],
  query: string
) {
  const needle = query.trim().toLowerCase()
  if (!needle || needle === '*') return options
  return options.filter(
    (option) =>
      option.label.toLowerCase().includes(needle) ||
      option.value.toLowerCase().includes(needle)
  )
}

type PprlConfig = {
  method?: PprlMethod
  n?: number
  length?: number
  hashPositions?: number
  bandSize?: number
  exact?: boolean
}

type EntityLinkageConfig = {
  enabled?: boolean
  privacyMode?: PrivacyMode
  pprl?: PprlConfig
  minScore?: number
  minNormalizedScore?: number
  bloomMinSimilarity?: number
  candidateLimit?: number
  autoLinkOnCreate?: boolean
  onMatch?: MatchAction
}

type LinkageConfig = {
  normalizers?: string[]
  encoders?: string[]
  blocking?: string[]
  weight?: number
}

type BuilderAttribute = {
  key: string
  name: string
  label_en?: string
  label_de?: string
  labels?: LabelMap
  type?: string
  required?: boolean
  linkage?: boolean
  repeatable?: boolean
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  values?: string[]
  tags?: string[]
  linkageConfig?: LinkageConfig
  layout?: LayoutValue
  attributes?: BuilderAttribute[]
  locked?: boolean
}

export type EntityTypePayload = {
  name: string
  version?: string
  isBaseType?: boolean
  baseTypeName?: string
  associatedDomainName?: string
  isDeprecated?: boolean
  isDeleted?: boolean
  typeDefinition: {
    typeName?: string
    version?: string
    layout?: LayoutValue
    repeatable?: boolean
    label_en?: string
    label_de?: string
    attributes?: any[]
    recordLinkage?: EntityLinkageConfig
  }
}

const typeOptionDefinitions = [
  { labelKey: 'entityBuilder:type.text', fallback: 'Text', value: 'string' },
  {
    labelKey: 'entityBuilder:type.number',
    fallback: 'Number',
    value: 'number'
  },
  {
    labelKey: 'entityBuilder:type.boolean',
    fallback: 'Boolean',
    value: 'boolean'
  },
  { labelKey: 'entityBuilder:type.date', fallback: 'Date', value: 'date' },
  {
    labelKey: 'entityBuilder:type.datetime',
    fallback: 'Date and time',
    value: 'datetime'
  },
  { labelKey: 'entityBuilder:type.enum', fallback: 'Dropdown', value: 'enum' }
]

const normalizerOptions = [
  'trim',
  'lower',
  'collapseWhitespace',
  'asciiFold',
  'umlautFold',
  'removePunctuation',
  'digitsOnly'
]
const encoderOptions = ['cologne', 'doubleMetaphone']
const blockingOptions = [
  'exact',
  'prefix3',
  'prefix4',
  'prefix6',
  'phonetic',
  'year',
  'yearMonth',
  'domainExact',
  'bloomBands'
]

function compactArray(values?: string[]) {
  return (values ?? []).map((value) => value.trim()).filter(Boolean)
}

function buildDefaultTag(entityTypeName: string, attributeName: string) {
  const entity = entityTypeName.trim() || 'entity'
  const attribute = attributeName.trim() || 'attribute'
  return `${entity}.${attribute}`
}

function isValidSystemIdentifier(value: string) {
  return SYSTEM_IDENTIFIER_PATTERN.test(value.trim())
}

function nextMajorEntityTypeVersion(version?: string) {
  const fallbackVersion = 'v1.0'
  const raw = version?.trim() || fallbackVersion
  const match = /^([vV]?)(\d+)(?:\.\d+)?(?:.*)?$/.exec(raw)
  if (!match) return 'v2.0'

  const prefix = match[1] || 'v'
  const currentMajor = Number.parseInt(match[2], 10)
  if (Number.isNaN(currentMajor)) return 'v2.0'

  return `${prefix}${currentMajor + 1}.0`
}

function labelKeyToCode(key: string) {
  const match = /^label_([a-z]{2})$/i.exec(key)
  return match?.[1]?.toLowerCase()
}

function labelsFromBackendAttribute(attribute: any): LabelMap {
  const labels: LabelMap = {}
  Object.entries(attribute ?? {}).forEach(([key, value]) => {
    const code = labelKeyToCode(key)
    if (code && typeof value === 'string') labels[code] = value
  })
  if (!labels.en && typeof attribute?.labelEn === 'string') {
    labels.en = attribute.labelEn
  }
  if (!labels.de && typeof attribute?.labelDe === 'string') {
    labels.de = attribute.labelDe
  }
  return labels
}

function preferredLabel(attribute: BuilderAttribute, language = 'en'): string {
  const code = language.toLowerCase().split('-')[0]
  return (
    attribute.labels?.[code] ||
    attribute.labels?.en ||
    Object.values(attribute.labels ?? {}).find(Boolean) ||
    attribute.label_en ||
    attribute.label_de ||
    attribute.name
  )
}

function serializeLabels(
  attribute: BuilderAttribute,
  fallback: string
): Record<string, string> {
  const out: Record<string, string> = {}
  Object.entries(attribute.labels ?? {}).forEach(([code, label]) => {
    const normalizedCode = code.trim().toLowerCase()
    const trimmedLabel = label.trim()
    if (/^[a-z]{2}$/.test(normalizedCode) && trimmedLabel) {
      out[`label_${normalizedCode}`] = trimmedLabel
    }
  })
  if (Object.keys(out).length === 0 && fallback.trim()) {
    out.label_en = fallback.trim()
  }
  return out
}

function defaultEntityLinkageConfig(): Required<EntityLinkageConfig> {
  return {
    enabled: true,
    privacyMode: 'plain',
    pprl: {
      method: 'ngramBloomFilter',
      n: 2,
      length: 1024,
      hashPositions: 10,
      bandSize: 32,
      exact: false
    },
    minScore: 4,
    minNormalizedScore: 0.5,
    bloomMinSimilarity: 0.75,
    candidateLimit: 250,
    autoLinkOnCreate: false,
    onMatch: 'reject'
  }
}

function defaultLinkageConfig(type?: string): LinkageConfig {
  if (type === 'date') {
    return {
      normalizers: ['trim'],
      encoders: [],
      blocking: ['exact', 'year', 'yearMonth', 'bloomBands'],
      weight: 3
    }
  }

  return {
    normalizers: ['trim', 'lower', 'collapseWhitespace'],
    encoders: [],
    blocking: ['exact', 'prefix4', 'bloomBands'],
    weight: 1
  }
}

function effectiveAttributeLinkageConfig(
  attribute: Pick<BuilderAttribute, 'type' | 'linkageConfig'>
): LinkageConfig {
  return {
    ...defaultLinkageConfig(attribute.type),
    ...(attribute.linkageConfig ?? {})
  }
}

function hasOwn(value: object | null | undefined, key: string) {
  return Boolean(value && Object.prototype.hasOwnProperty.call(value, key))
}

function normalizePprlConfig(value: any, partial = false): PprlConfig {
  const defaults = defaultEntityLinkageConfig().pprl
  const out: PprlConfig = {}
  const source = value && typeof value === 'object' ? value : {}
  const assign = <K extends keyof PprlConfig>(
    key: K,
    fallback: PprlConfig[K]
  ) => {
    if (!partial || hasOwn(source, key)) out[key] = source[key] ?? fallback
  }
  assign('method', defaults.method)
  assign('n', defaults.n)
  assign('length', defaults.length)
  assign('hashPositions', defaults.hashPositions)
  assign('bandSize', defaults.bandSize)
  assign('exact', defaults.exact)
  return out
}

function normalizeEntityLinkageConfig(
  value: any,
  partial = false
): EntityLinkageConfig {
  const defaults = defaultEntityLinkageConfig()
  const source = value && typeof value === 'object' ? value : {}
  const out: EntityLinkageConfig = {}
  const assign = <K extends Exclude<keyof EntityLinkageConfig, 'pprl'>>(
    key: K,
    fallback: EntityLinkageConfig[K]
  ) => {
    if (!partial || hasOwn(source, key)) out[key] = source[key] ?? fallback
  }

  assign('enabled', defaults.enabled)
  assign('privacyMode', defaults.privacyMode)
  assign('minScore', defaults.minScore)
  assign('minNormalizedScore', defaults.minNormalizedScore)
  assign('bloomMinSimilarity', defaults.bloomMinSimilarity)
  assign('candidateLimit', defaults.candidateLimit)
  assign('autoLinkOnCreate', defaults.autoLinkOnCreate)
  assign('onMatch', defaults.onMatch)
  if (!partial || hasOwn(source, 'pprl')) {
    out.pprl = normalizePprlConfig(source.pprl, partial)
  }
  return out
}

function mergeEntityLinkageConfig(
  ...configs: Array<EntityLinkageConfig | null | undefined>
): Required<EntityLinkageConfig> {
  const defaults = defaultEntityLinkageConfig()
  const merged: EntityLinkageConfig = {
    ...defaults,
    pprl: { ...defaults.pprl }
  }
  configs.forEach((config) => {
    if (!config) return
    Object.entries(config).forEach(([key, value]) => {
      if (key === 'pprl' || value === undefined) return
      ;(merged as any)[key] = value
    })
    if (config.pprl) {
      merged.pprl = { ...(merged.pprl ?? {}), ...config.pprl }
    }
  })
  return merged as Required<EntityLinkageConfig>
}

function findLegacyEntityLinkageConfig(
  attributes: any[] = []
): EntityLinkageConfig | null {
  for (const attribute of attributes) {
    if (Array.isArray(attribute?.attributes)) {
      const nested = findLegacyEntityLinkageConfig(attribute.attributes)
      if (nested) return nested
    }
    const legacy = attribute?.linkageConfig
    if (legacy && (legacy.privacyMode || legacy.pprl)) {
      return normalizeEntityLinkageConfig(
        {
          privacyMode: legacy.privacyMode,
          pprl: legacy.pprl
        },
        true
      )
    }
  }
  return null
}

function recordLinkageOverridesFromPayload(
  payload?: EntityTypePayload | null
): EntityLinkageConfig {
  const definition = payload?.typeDefinition as any
  if (
    definition?.recordLinkage &&
    typeof definition.recordLinkage === 'object'
  ) {
    return normalizeEntityLinkageConfig(definition.recordLinkage, true)
  }
  return findLegacyEntityLinkageConfig(definition?.attributes) ?? {}
}

function effectiveRecordLinkageFromPayload(
  payload?: EntityTypePayload | null
): Required<EntityLinkageConfig> {
  return mergeEntityLinkageConfig(
    defaultEntityLinkageConfig(),
    recordLinkageOverridesFromPayload(payload)
  )
}

function mapBackendAttribute(attribute: any): BuilderAttribute {
  if (Array.isArray(attribute?.attributes)) {
    const labels = labelsFromBackendAttribute(attribute)
    return {
      key: crypto.randomUUID(),
      name: attribute?.name ?? '',
      label_en:
        labels.en ??
        attribute?.label_en ??
        attribute?.labelEn ??
        attribute?.name ??
        '',
      label_de: labels.de ?? attribute?.label_de ?? attribute?.labelDe ?? '',
      labels,
      layout: attribute?.layout ?? 'group',
      repeatable: Boolean(attribute?.repeatable),
      attributes: attribute.attributes.map(mapBackendAttribute)
    }
  }

  const rawLinkageConfig = attribute?.linkageConfig
  const importedLinkageConfig: LinkageConfig | undefined = rawLinkageConfig
    ? {
        normalizers: Array.isArray(rawLinkageConfig.normalizers)
          ? rawLinkageConfig.normalizers
          : undefined,
        encoders: Array.isArray(rawLinkageConfig.encoders)
          ? rawLinkageConfig.encoders
          : undefined,
        blocking: Array.isArray(rawLinkageConfig.blocking)
          ? rawLinkageConfig.blocking
          : undefined,
        weight:
          rawLinkageConfig.weight === undefined
            ? undefined
            : Number(rawLinkageConfig.weight)
      }
    : undefined

  const labels = labelsFromBackendAttribute(attribute)

  return {
    key: crypto.randomUUID(),
    name: attribute?.name ?? '',
    label_en:
      labels.en ??
      attribute?.label_en ??
      attribute?.labelEn ??
      attribute?.name ??
      '',
    label_de: labels.de ?? attribute?.label_de ?? attribute?.labelDe ?? '',
    labels,
    type:
      attribute?.type === 'integer' ? 'number' : (attribute?.type ?? 'string'),
    required: Boolean(attribute?.required),
    linkage: Boolean(attribute?.linkage),
    repeatable: Boolean(attribute?.repeatable),
    minimum: attribute?.minimum,
    maximum: attribute?.maximum,
    minLength: attribute?.minLength,
    maxLength: attribute?.maxLength,
    values: attribute?.values ?? attribute?.enum,
    tags: attribute?.tags,
    linkageConfig: importedLinkageConfig
  }
}

function attributesFromPayload(payload: EntityTypePayload): BuilderAttribute[] {
  const attrs = payload.typeDefinition?.attributes
  if (!Array.isArray(attrs)) return []
  return attrs.map(mapBackendAttribute)
}

function lockBaseAttribute(attribute: BuilderAttribute): BuilderAttribute {
  return {
    ...attribute,
    locked: true,
    attributes: attribute.attributes?.map(lockBaseAttribute)
  }
}

function unlockImportedAttribute(
  attribute: BuilderAttribute
): BuilderAttribute {
  return {
    ...attribute,
    locked: false,
    attributes: attribute.attributes?.map(unlockImportedAttribute)
  }
}

function attributeNameKey(attribute: BuilderAttribute): string {
  return attribute.name.trim().toLowerCase()
}

function removeBaseAttributes(
  attributes: BuilderAttribute[],
  baseAttributes: BuilderAttribute[]
): BuilderAttribute[] {
  return attributes
    .map((attribute) => {
      const matchingBase = baseAttributes.find(
        (baseAttribute) =>
          attributeNameKey(baseAttribute) === attributeNameKey(attribute)
      )

      if (!matchingBase) return unlockImportedAttribute(attribute)

      if (attribute.attributes && matchingBase.attributes) {
        const additionalChildren = removeBaseAttributes(
          attribute.attributes,
          matchingBase.attributes
        )
        if (additionalChildren.length) {
          return {
            ...unlockImportedAttribute(attribute),
            attributes: additionalChildren
          }
        }
      }

      return null
    })
    .filter((attribute): attribute is BuilderAttribute => attribute !== null)
}

function flattenDomainsForOptions(
  domains: any[]
): { label: string; value: string }[] {
  const seen = new Set<string>()
  const out: { label: string; value: string }[] = []
  const visit = (node: any) => {
    const domain = node?.domain ?? node
    const name = domain?.name ?? node?.name ?? node?.label
    if (typeof name === 'string' && name.trim() && !seen.has(name)) {
      seen.add(name)
      out.push({ label: name, value: name })
    }
    const children = node?.children ?? domain?.children
    if (Array.isArray(children)) children.forEach(visit)
  }
  domains.forEach(visit)
  return out.sort((a, b) => a.label.localeCompare(b.label))
}

function mergeOptionLists(
  ...lists: Array<{ label: string; value: string }[]>
): { label: string; value: string }[] {
  const seen = new Set<string>()
  const merged: { label: string; value: string }[] = []
  lists.flat().forEach((option) => {
    if (!option.value || seen.has(option.value)) return
    seen.add(option.value)
    merged.push(option)
  })
  return merged.sort((a, b) => a.label.localeCompare(b.label))
}

async function loadAllGroupOptions(
  fallback: { label: string; value: string }[] = []
): Promise<{ label: string; value: string }[]> {
  const loaded: Array<{ label: string; value: string }[]> = []

  try {
    const domains = await TrustDeck.instance().searchReadableDomains('*')
    loaded.push(flattenDomainsForOptions(domains ?? []))
  } catch {
    // Search access may be restricted. Fall back to hierarchy and existing options.
  }

  try {
    const hierarchy = await TrustDeck.instance().getDomainsHierarchy()
    loaded.push(flattenDomainsForOptions(hierarchy ?? []))
  } catch {
    // Hierarchy access may be restricted as well. Existing options are still useful.
  }

  return mergeOptionLists(...loaded, fallback)
}

function cleanLinkageConfig(config: LinkageConfig): LinkageConfig {
  const cleaned: LinkageConfig = {}
  if (compactArray(config.normalizers).length)
    cleaned.normalizers = compactArray(config.normalizers)
  if (compactArray(config.encoders).length)
    cleaned.encoders = compactArray(config.encoders)
  if (compactArray(config.blocking).length)
    cleaned.blocking = compactArray(config.blocking)
  if (config.weight !== undefined && config.weight !== null)
    cleaned.weight = Number(config.weight)
  return cleaned
}

function cleanEntityLinkageConfig(
  config: EntityLinkageConfig,
  partial = false
): EntityLinkageConfig {
  const normalized = normalizeEntityLinkageConfig(config, partial)
  const cleaned: EntityLinkageConfig = {}
  const copyNumber = (key: keyof EntityLinkageConfig) => {
    if (hasOwn(normalized, key))
      (cleaned as any)[key] = Number((normalized as any)[key])
  }
  const copyValue = (key: keyof EntityLinkageConfig) => {
    if (hasOwn(normalized, key))
      (cleaned as any)[key] = (normalized as any)[key]
  }

  copyValue('enabled')
  copyValue('privacyMode')
  copyNumber('minScore')
  copyNumber('minNormalizedScore')
  copyNumber('bloomMinSimilarity')
  copyNumber('candidateLimit')
  copyValue('autoLinkOnCreate')
  copyValue('onMatch')

  if (normalized.pprl && (!partial || hasOwn(config, 'pprl'))) {
    const pprl: PprlConfig = {}
    const source = normalized.pprl
    const original = config.pprl
    const shouldCopy = (key: keyof PprlConfig) =>
      !partial || hasOwn(original, key)
    if (shouldCopy('method')) pprl.method = source.method
    if (shouldCopy('n')) pprl.n = Number(source.n)
    if (shouldCopy('length')) pprl.length = Number(source.length)
    if (shouldCopy('hashPositions'))
      pprl.hashPositions = Number(source.hashPositions)
    if (shouldCopy('bandSize')) pprl.bandSize = Number(source.bandSize)
    if (shouldCopy('exact')) pprl.exact = Boolean(source.exact)
    if (Object.keys(pprl).length) cleaned.pprl = pprl
  }

  return cleaned
}

function serializeAttribute(
  attribute: BuilderAttribute,
  entityTypeName = ''
): any {
  if (Array.isArray(attribute.attributes)) {
    const group: any = {
      layout: attribute.layout ?? 'group',
      attributes: attribute.attributes.map((child) =>
        serializeAttribute(child, entityTypeName)
      )
    }
    if (attribute.name.trim()) group.name = attribute.name.trim()
    Object.assign(group, serializeLabels(attribute, attribute.name))
    if (attribute.repeatable) group.repeatable = true
    return group
  }

  const field: any = {
    name: attribute.name.trim(),
    ...serializeLabels(attribute, attribute.name),
    type: attribute.type || 'string',
    required: Boolean(attribute.required),
    linkage: Boolean(attribute.linkage)
  }
  if (attribute.repeatable) field.repeatable = true
  if (attribute.minimum !== undefined && attribute.minimum !== null)
    field.minimum = Number(attribute.minimum)
  if (attribute.maximum !== undefined && attribute.maximum !== null)
    field.maximum = Number(attribute.maximum)
  if (attribute.minLength !== undefined && attribute.minLength !== null)
    field.minLength = Number(attribute.minLength)
  if (attribute.maxLength !== undefined && attribute.maxLength !== null)
    field.maxLength = Number(attribute.maxLength)
  if (attribute.type === 'enum') {
    const values = compactArray(attribute.values)
    if (values.length) {
      field.values = values
      field.enum = values
    }
  }
  if (attribute.linkage) {
    const tags = compactArray(attribute.tags)
    field.tags = tags.length
      ? tags
      : [buildDefaultTag(entityTypeName, attribute.name)]
    if (attribute.linkageConfig)
      field.linkageConfig = cleanLinkageConfig(attribute.linkageConfig)
  }
  return field
}

function updateAttributeByKey(
  attributes: BuilderAttribute[],
  key: string,
  patch: Partial<BuilderAttribute>
): BuilderAttribute[] {
  return attributes.map((attribute) => {
    if (attribute.key === key) return { ...attribute, ...patch }
    if (attribute.attributes)
      return {
        ...attribute,
        attributes: updateAttributeByKey(attribute.attributes, key, patch)
      }
    return attribute
  })
}

function removeAttributeByKey(
  attributes: BuilderAttribute[],
  key: string
): BuilderAttribute[] {
  return attributes
    .filter((attribute) => attribute.key !== key)
    .map((attribute) =>
      attribute.attributes
        ? {
            ...attribute,
            attributes: removeAttributeByKey(attribute.attributes, key)
          }
        : attribute
    )
}

function hasInvalidAttribute(attributes: BuilderAttribute[]): boolean {
  return attributes.some((attribute) => {
    const identifier = attribute.name.trim()
    const hasInvalidIdentifier = identifier
      ? !isValidSystemIdentifier(identifier)
      : !attribute.attributes
    const hasMissingEnglishLabel = !attribute.labels?.en?.trim()
    const hasInvalidLabel = Object.values(attribute.labels ?? {}).some(
      (label) => label.length > 80
    )
    if (attribute.attributes)
      return (
        hasInvalidIdentifier ||
        hasMissingEnglishLabel ||
        hasInvalidLabel ||
        attribute.attributes.length === 0 ||
        hasInvalidAttribute(attribute.attributes)
      )
    return (
      hasInvalidIdentifier ||
      hasMissingEnglishLabel ||
      hasInvalidLabel ||
      !(attribute.type ?? '').trim()
    )
  })
}

function hasInvalidEntityLinkageConfig(
  config: Required<EntityLinkageConfig>
): boolean {
  const pprl = config.pprl
  return (
    !Number.isFinite(config.minScore) ||
    config.minScore < 0 ||
    !Number.isFinite(config.minNormalizedScore) ||
    config.minNormalizedScore < 0 ||
    config.minNormalizedScore > 1 ||
    !Number.isFinite(config.bloomMinSimilarity) ||
    config.bloomMinSimilarity < 0 ||
    config.bloomMinSimilarity > 1 ||
    !Number.isInteger(config.candidateLimit) ||
    config.candidateLimit < 1 ||
    !Number.isInteger(pprl.n) ||
    (pprl.n ?? 0) < 1 ||
    !Number.isInteger(pprl.length) ||
    (pprl.length ?? 0) < 128 ||
    !Number.isInteger(pprl.hashPositions) ||
    (pprl.hashPositions ?? 0) < 1 ||
    !Number.isInteger(pprl.bandSize) ||
    (pprl.bandSize ?? 0) < 8
  )
}

function extractAttribute(
  attributes: BuilderAttribute[],
  key: string
): { next: BuilderAttribute[]; found?: BuilderAttribute } {
  let found: BuilderAttribute | undefined
  const next = attributes.reduce<BuilderAttribute[]>((acc, attribute) => {
    if (attribute.key === key) {
      found = attribute
      return acc
    }
    if (attribute.attributes) {
      const extracted = extractAttribute(attribute.attributes, key)
      if (extracted.found) found = extracted.found
      acc.push({ ...attribute, attributes: extracted.next })
    } else {
      acc.push(attribute)
    }
    return acc
  }, [])
  return { next, found }
}

function insertBefore(
  attributes: BuilderAttribute[],
  targetKey: string,
  item: BuilderAttribute
): BuilderAttribute[] {
  const next: BuilderAttribute[] = []
  for (const attribute of attributes) {
    if (attribute.key === targetKey) next.push(item)
    if (attribute.attributes) {
      next.push({
        ...attribute,
        attributes: insertBefore(attribute.attributes, targetKey, item)
      })
    } else {
      next.push(attribute)
    }
  }
  return next
}

function insertAfter(
  attributes: BuilderAttribute[],
  targetKey: string,
  item: BuilderAttribute
): BuilderAttribute[] {
  const next: BuilderAttribute[] = []
  for (const attribute of attributes) {
    if (attribute.attributes) {
      next.push({
        ...attribute,
        attributes: insertAfter(attribute.attributes, targetKey, item)
      })
    } else {
      next.push(attribute)
    }
    if (attribute.key === targetKey) next.push(item)
  }
  return next
}

function appendToGroup(
  attributes: BuilderAttribute[],
  groupKey: string,
  item: BuilderAttribute
): BuilderAttribute[] {
  return attributes.map((attribute) => {
    if (attribute.key === groupKey && Array.isArray(attribute.attributes)) {
      return { ...attribute, attributes: [...attribute.attributes, item] }
    }
    if (attribute.attributes)
      return {
        ...attribute,
        attributes: appendToGroup(attribute.attributes, groupKey, item)
      }
    return attribute
  })
}

function containsKey(attribute: BuilderAttribute, key: string): boolean {
  return (
    attribute.key === key ||
    Boolean(attribute.attributes?.some((child) => containsKey(child, key)))
  )
}

export type BuilderScope = 'project' | 'base'
export type BuilderMode = 'create' | 'edit'

type BuilderProps = {
  scope?: BuilderScope
  mode?: BuilderMode
  initialType?: EntityTypePayload | null
  embedded?: boolean
  onSaved?: (savedType: EntityTypePayload) => void
  onCancel?: () => void
  readOnly?: boolean
  hideBasicSettings?: boolean
  hideEntityName?: boolean
}

export default function Builder({
  scope = 'project',
  mode = 'create',
  initialType = null,
  embedded = false,
  onSaved,
  onCancel,
  readOnly = false,
  hideBasicSettings = false,
  hideEntityName = false
}: BuilderProps = {}) {
  const { t, i18n } = useTranslation(['entityBuilder', 'common'])
  const navigate = useNavigate()
  const showToast = useToastStore((state) => state.show)
  const setProjectEntities = useProjectStore((state) => state.setEntities)
  const typeOptions = useMemo(
    () =>
      typeOptionDefinitions.map((option) => ({
        label: t(option.labelKey, option.fallback),
        value: option.value
      })),
    [t]
  )
  const pprlMethodOptions = useMemo(
    () => [
      {
        label: t('linkageConfig.pprlMethodOptions.ngramBloomFilter'),
        value: 'ngramBloomFilter'
      },
      {
        label: t('linkageConfig.pprlMethodOptions.hmacExact'),
        value: 'hmacExact'
      }
    ],
    [t]
  )

  const [entityName, setEntityName] = useState('')
  const [rootLayout, setRootLayout] = useState<LayoutValue>('group')
  const [saveTarget, setSaveTarget] = useState<BuilderScope>(scope)
  const [baseTypeOptions, setBaseTypeOptions] = useState<
    { label: string; value: string }[]
  >([])
  const [selectedBaseType, setSelectedBaseType] = useState('')
  const [baseTypeLoading, setBaseTypeLoading] = useState(false)
  const [associatedGroupName, setAssociatedGroupName] = useState('')
  const [groupOptions, setGroupOptions] = useState<
    { label: string; value: string }[]
  >([])
  const [allGroupOptions, setAllGroupOptions] = useState<
    { label: string; value: string }[]
  >([])
  const [groupSearchLoading, setGroupSearchLoading] = useState(false)
  const [attributes, setAttributes] = useState<BuilderAttribute[]>([])
  const [entityLinkageOverrides, setEntityLinkageOverrides] =
    useState<EntityLinkageConfig>({})
  const [baseEntityLinkageConfig, setBaseEntityLinkageConfig] =
    useState<EntityLinkageConfig | null>(null)
  const effectiveEntityLinkageConfig = useMemo(
    () =>
      saveTarget === 'project'
        ? mergeEntityLinkageConfig(
            defaultEntityLinkageConfig(),
            baseEntityLinkageConfig,
            entityLinkageOverrides
          )
        : mergeEntityLinkageConfig(
            defaultEntityLinkageConfig(),
            entityLinkageOverrides
          ),
    [baseEntityLinkageConfig, entityLinkageOverrides, saveTarget]
  )
  const attributeElementRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [pendingScrollAttributeKey, setPendingScrollAttributeKey] = useState<
    string | null
  >(null)
  const [saving, setSaving] = useState(false)
  const [draggedAttributeKey, setDraggedAttributeKey] = useState<string | null>(
    null
  )
  const [dropIndicator, setDropIndicator] = useState<DropIndicator>(null)
  const [collapsedLinkageKeys, setCollapsedLinkageKeys] = useState<
    Record<string, boolean>
  >({})
  const [collapsedAttributeKeys, setCollapsedAttributeKeys] = useState<
    Record<string, boolean>
  >({})
  useEffect(() => {
    setSaveTarget(scope)
    setEntityName(initialType?.name ?? '')
    setRootLayout(
      (initialType?.typeDefinition?.layout as LayoutValue | undefined) ??
        'group'
    )
    setAssociatedGroupName(initialType?.associatedDomainName ?? '')
    setSelectedBaseType(initialType?.baseTypeName ?? '')
    setAttributes(
      initialType
        ? attributesFromPayload(initialType).map(unlockImportedAttribute)
        : []
    )
    setEntityLinkageOverrides(
      initialType
        ? recordLinkageOverridesFromPayload(initialType)
        : scope === 'base'
          ? defaultEntityLinkageConfig()
          : {}
    )
    setBaseEntityLinkageConfig(null)
    setDraggedAttributeKey(null)
    setDropIndicator(null)
    setCollapsedLinkageKeys({})
    setCollapsedAttributeKeys({})
  }, [initialType, scope])

  useEffect(() => {
    if (!pendingScrollAttributeKey) return
    const handle = window.setTimeout(() => {
      const element = attributeElementRefs.current[pendingScrollAttributeKey]
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const input = element?.querySelector<HTMLInputElement>(
        `#attribute-name-${pendingScrollAttributeKey}`
      )
      input?.focus()
      setPendingScrollAttributeKey(null)
    }, 50)

    return () => window.clearTimeout(handle)
  }, [attributes, pendingScrollAttributeKey])

  useEffect(() => {
    let active = true
    async function loadBaseTypes() {
      try {
        const result = await TrustDeck.instance().getBaseTypes('*')
        if (!active) return
        const options = (result ?? [])
          .map((entry: any) => entry?.name)
          .filter(
            (name: unknown): name is string =>
              typeof name === 'string' && name.length > 0
          )
          .map((name) => ({ label: name, value: name }))
        setBaseTypeOptions(options)
        if (
          scope === 'project' &&
          options.length &&
          mode === 'create' &&
          !readOnly
        ) {
          setSelectedBaseType((current) => current || options[0].value)
        } else if (scope === 'project' && !options.length) {
          setSelectedBaseType('')
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (!message.includes('404'))
          console.error('Failed to load base types', error)
        if (active) setBaseTypeOptions([])
      }
    }
    loadBaseTypes()
    return () => {
      active = false
    }
  }, [mode, readOnly, scope])

  useEffect(() => {
    if (saveTarget !== 'project') {
      setAllGroupOptions([])
      setGroupOptions([])
      setGroupSearchLoading(false)
      return
    }

    let active = true
    setGroupSearchLoading(true)
    loadAllGroupOptions()
      .then((options) => {
        if (!active) return
        setAllGroupOptions(options)
        setGroupOptions(options)
      })
      .catch(() => {
        if (!active) return
        setAllGroupOptions([])
        setGroupOptions([])
      })
      .finally(() => {
        if (active) setGroupSearchLoading(false)
      })

    return () => {
      active = false
    }
  }, [saveTarget])

  useEffect(() => {
    if (saveTarget !== 'project') return

    let active = true
    const handle = window.setTimeout(async () => {
      setGroupSearchLoading(true)
      const localMatches = filterGroupOptions(
        allGroupOptions,
        associatedGroupName
      )
      try {
        const query = associatedGroupName.trim() || '*'
        const domains = await TrustDeck.instance().searchReadableDomains(query)
        const backendMatches = flattenDomainsForOptions(domains ?? [])
        if (active) {
          setGroupOptions(mergeOptionLists(backendMatches, localMatches))
        }
      } catch {
        if (active) setGroupOptions(localMatches)
      } finally {
        if (active) setGroupSearchLoading(false)
      }
    }, 250)

    return () => {
      active = false
      window.clearTimeout(handle)
    }
  }, [allGroupOptions, associatedGroupName, saveTarget])

  useEffect(() => {
    let active = true
    async function loadSelectedBaseType() {
      if (saveTarget !== 'project' || !selectedBaseType) {
        setBaseEntityLinkageConfig(null)
        return
      }
      setBaseTypeLoading(true)
      try {
        const base = (await TrustDeck.instance().getBaseType(
          selectedBaseType
        )) as any
        if (!active) return
        const basePayload = base as EntityTypePayload
        const baseAttributes =
          attributesFromPayload(basePayload).map(lockBaseAttribute)
        setBaseEntityLinkageConfig(
          effectiveRecordLinkageFromPayload(basePayload)
        )
        setRootLayout((base.typeDefinition?.layout as LayoutValue) ?? 'group')
        setAttributes((current) => [
          ...baseAttributes,
          ...removeBaseAttributes(
            current.filter((attribute) => !attribute.locked),
            baseAttributes
          )
        ])
      } catch {
        if (active) {
          setBaseEntityLinkageConfig(null)
          showToast({
            severity: 'error',
            summary: t('toast.baseLoadFailedSummary'),
            detail: t('toast.baseLoadFailedDetail'),
            life: 4500
          })
        }
      } finally {
        if (active) setBaseTypeLoading(false)
      }
    }
    loadSelectedBaseType()
    return () => {
      active = false
    }
  }, [saveTarget, selectedBaseType, showToast, t])

  const payload = useMemo<EntityTypePayload>(() => {
    const name = entityName.trim()
    const recordLinkage =
      saveTarget === 'base'
        ? cleanEntityLinkageConfig(effectiveEntityLinkageConfig)
        : cleanEntityLinkageConfig(entityLinkageOverrides, true)
    const built: EntityTypePayload = {
      name,
      version: 'v1.0',
      isBaseType: saveTarget === 'base',
      typeDefinition: {
        typeName: name,
        version: 'v1.0',
        layout: rootLayout,
        label_en: name,
        label_de: name,
        attributes: attributes.map((attribute) =>
          serializeAttribute(attribute, name)
        ),
        ...(Object.keys(recordLinkage).length ? { recordLinkage } : {})
      }
    }
    if (saveTarget === 'project') {
      built.baseTypeName = selectedBaseType || undefined
      built.associatedDomainName = associatedGroupName || undefined
    }
    return built
  }, [
    associatedGroupName,
    attributes,
    effectiveEntityLinkageConfig,
    entityLinkageOverrides,
    entityName,
    rootLayout,
    saveTarget,
    selectedBaseType
  ])

  const newLeafAttribute = (
    source?: Partial<BuilderAttribute>
  ): BuilderAttribute => ({
    key: crypto.randomUUID(),
    name: source?.name ?? '',
    label_en: source?.label_en ?? source?.labels?.en ?? '',
    label_de: source?.label_de ?? source?.labels?.de ?? '',
    labels: source?.labels ?? { en: '' },
    type: source?.type ?? 'string',
    required: source?.required ?? false,
    linkage: source?.linkage ?? false,
    repeatable: source?.repeatable ?? false,
    minimum: source?.minimum,
    maximum: source?.maximum,
    minLength: source?.minLength,
    maxLength: source?.maxLength,
    values: source?.values,
    tags: source?.tags,
    linkageConfig: source?.linkageConfig,
    locked: source?.locked ?? false
  })

  const addAttribute = (
    source?: Partial<BuilderAttribute>,
    scrollToNewAttribute = false
  ) => {
    if (readOnly) return
    const attribute = newLeafAttribute(source)
    if (scrollToNewAttribute) setPendingScrollAttributeKey(attribute.key)
    setAttributes((current) => [...current, attribute])
  }

  const updateAttribute = (key: string, patch: Partial<BuilderAttribute>) => {
    if (readOnly) return
    setAttributes((current) => updateAttributeByKey(current, key, patch))
  }

  const handleAttributeNameChange = (
    attribute: BuilderAttribute,
    name: string
  ) => {
    const currentDefault = buildDefaultTag(entityName, attribute.name)
    const shouldRefreshTag =
      Boolean(attribute.linkage) &&
      (!attribute.tags?.length ||
        (attribute.tags.length === 1 && attribute.tags[0] === currentDefault))
    updateAttribute(attribute.key, {
      name,
      ...(shouldRefreshTag ? { tags: [buildDefaultTag(entityName, name)] } : {})
    })
  }

  const removeAttribute = (key: string) => {
    if (readOnly) return
    setAttributes((current) => removeAttributeByKey(current, key))
  }

  const moveBefore = (sourceKey: string, targetKey: string) => {
    if (!sourceKey || sourceKey === targetKey) return
    setAttributes((current) => {
      const extracted = extractAttribute(current, sourceKey)
      if (!extracted.found || extracted.found.locked) return current
      if (containsKey(extracted.found, targetKey)) return current
      return insertBefore(extracted.next, targetKey, extracted.found)
    })
  }

  const moveAfter = (sourceKey: string, targetKey: string) => {
    if (!sourceKey || sourceKey === targetKey) return
    setAttributes((current) => {
      const extracted = extractAttribute(current, sourceKey)
      if (!extracted.found || extracted.found.locked) return current
      if (containsKey(extracted.found, targetKey)) return current
      return insertAfter(extracted.next, targetKey, extracted.found)
    })
  }

  const moveIntoGroup = (sourceKey: string, groupKey: string) => {
    if (!sourceKey || sourceKey === groupKey) return
    setAttributes((current) => {
      const extracted = extractAttribute(current, sourceKey)
      if (!extracted.found || extracted.found.locked) return current
      if (containsKey(extracted.found, groupKey)) return current
      return appendToGroup(extracted.next, groupKey, extracted.found)
    })
  }

  const resolveDropPosition = (
    event: React.DragEvent<HTMLElement>,
    canDropInside: boolean
  ): NonNullable<DropIndicator>['position'] => {
    const rect = event.currentTarget.getBoundingClientRect()
    const relativeY = event.clientY - rect.top

    if (canDropInside) {
      const edgeZone = Math.min(48, rect.height * 0.25)
      if (relativeY < edgeZone) return 'before'
      if (relativeY > rect.height - edgeZone) return 'after'
      return 'inside'
    }

    return relativeY > rect.height / 2 ? 'after' : 'before'
  }

  const handleAttributeDrop = (source: string, target: BuilderAttribute) => {
    if (dropIndicator?.targetKey !== target.key) {
      moveBefore(source, target.key)
      return
    }

    if (
      dropIndicator.position === 'inside' &&
      Array.isArray(target.attributes)
    ) {
      moveIntoGroup(source, target.key)
    } else if (dropIndicator.position === 'after') {
      moveAfter(source, target.key)
    } else {
      moveBefore(source, target.key)
    }
  }

  const refreshProjectEntities = async () => {
    try {
      const response = await TrustDeck.instance().getProjectEntities('*')
      const responseArray = Array.isArray(response) ? response : []
      const names = Array.from(
        new Set(responseArray.map((entry: any) => entry?.name).filter(Boolean))
      )
      setProjectEntities(names as string[])
    } catch {
      setProjectEntities([])
    }
  }

  const save = async () => {
    const finalPayload = payload

    if (!finalPayload.name) {
      showToast({
        severity: 'error',
        summary: t('toast.missingNameSummary'),
        detail: t('toast.missingNameDetail'),
        life: 3500
      })
      return
    }
    if (!finalPayload.typeDefinition.attributes?.length) {
      showToast({
        severity: 'error',
        summary: t('toast.missingAttributesSummary'),
        detail: t('toast.missingAttributesDetail'),
        life: 3500
      })
      return
    }
    if (hasInvalidAttribute(attributes)) {
      showToast({
        severity: 'error',
        summary: t('toast.invalidAttributesSummary'),
        detail: t('toast.invalidAttributesDetail'),
        life: 4500
      })
      return
    }
    if (hasInvalidEntityLinkageConfig(effectiveEntityLinkageConfig)) {
      showToast({
        severity: 'error',
        summary: t('toast.invalidEntityLinkageSummary'),
        detail: t('toast.invalidEntityLinkageDetail'),
        life: 4500
      })
      return
    }
    if (saveTarget === 'project' && !finalPayload.baseTypeName) {
      showToast({
        severity: 'error',
        summary: t('toast.missingBaseSummary'),
        detail: t('toast.missingBaseDetail'),
        life: 3500
      })
      return
    }

    const versionForSave =
      mode === 'edit'
        ? nextMajorEntityTypeVersion(
            initialType?.version ?? initialType?.typeDefinition?.version
          )
        : (finalPayload.version ?? 'v1.0')
    const payloadWithVersion = {
      ...finalPayload,
      version: versionForSave,
      typeDefinition: {
        ...finalPayload.typeDefinition,
        version: versionForSave
      }
    } as EntityTypePayload & { version: string }

    setSaving(true)
    try {
      const savedType =
        saveTarget === 'base'
          ? mode === 'edit' && initialType?.name
            ? await TrustDeck.instance().updateBaseType(initialType.name, {
                ...payloadWithVersion,
                isBaseType: true,
                baseTypeName: undefined,
                associatedDomainName: undefined
              })
            : await TrustDeck.instance().createBaseType({
                ...payloadWithVersion,
                isBaseType: true,
                baseTypeName: undefined,
                associatedDomainName: undefined
              })
          : mode === 'edit' && initialType?.name
            ? await TrustDeck.instance().updateEntityConfig(initialType.name, {
                ...payloadWithVersion,
                isBaseType: false
              })
            : await TrustDeck.instance().createEntityConfig({
                ...payloadWithVersion,
                isBaseType: false
              })
      if (saveTarget === 'project') await refreshProjectEntities()
      showToast({
        severity: 'success',
        summary:
          mode === 'edit'
            ? t('toast.updatedSummary', 'Entity updated')
            : t('toast.createdSummary'),
        detail:
          saveTarget === 'base'
            ? mode === 'edit'
              ? t('toast.baseUpdatedDetail', 'The base type was updated.')
              : t('toast.baseCreatedDetail')
            : mode === 'edit'
              ? t('toast.projectUpdatedDetail', 'The project type was updated.')
              : t('toast.projectCreatedDetail'),
        life: 3500
      })
      onSaved?.(savedType as EntityTypePayload)
      if (!embedded) navigate('/entity/manager')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const detail = message.includes('400')
        ? t('toast.invalidDefinitionDetail')
        : message
      showToast({
        severity: 'error',
        summary:
          mode === 'edit'
            ? t('toast.updateFailed', 'Update failed')
            : t('toast.creationFailed'),
        detail,
        life: 7000
      })
    } finally {
      setSaving(false)
    }
  }

  const setListValue = (
    attribute: BuilderAttribute,
    key: 'normalizers' | 'encoders' | 'blocking',
    value: string,
    checked: boolean
  ) => {
    const current = effectiveAttributeLinkageConfig(attribute)[key] ?? []
    const next = checked
      ? Array.from(new Set([...current, value]))
      : current.filter((item) => item !== value)
    updateAttribute(attribute.key, {
      linkageConfig: {
        ...effectiveAttributeLinkageConfig(attribute),
        [key]: next
      }
    })
  }

  const updateLinkageConfig = (
    attribute: BuilderAttribute,
    patch: Partial<LinkageConfig>
  ) => {
    updateAttribute(attribute.key, {
      linkageConfig: {
        ...effectiveAttributeLinkageConfig(attribute),
        ...patch
      }
    })
  }

  const updateEntityLinkageConfig = (patch: Partial<EntityLinkageConfig>) => {
    setEntityLinkageOverrides((current) => ({ ...current, ...patch }))
  }

  const updateEntityPprlConfig = (patch: Partial<PprlConfig>) => {
    setEntityLinkageOverrides((current) => ({
      ...current,
      pprl: { ...(current.pprl ?? {}), ...patch }
    }))
  }

  const isEntityLinkageSettingInherited = (
    key: Exclude<keyof EntityLinkageConfig, 'pprl'>
  ) =>
    saveTarget === 'project' &&
    Boolean(baseEntityLinkageConfig) &&
    !hasOwn(entityLinkageOverrides, key)

  const isEntityPprlSettingInherited = (key: keyof PprlConfig) =>
    saveTarget === 'project' &&
    Boolean(baseEntityLinkageConfig?.pprl) &&
    !hasOwn(entityLinkageOverrides.pprl, key)

  const renderEntityLinkageConfig = () => {
    const config = effectiveEntityLinkageConfig
    const pprl = config.pprl
    const locked = readOnly
    const settingsDisabled = locked || !config.enabled
    return (
      <div className="space-y-5 text-left">
        <ToggleWithInfo
          id="entity-linkage-enabled"
          label={t('entityLinkage.enabled')}
          description={t('entityLinkageHelp.enabled')}
          checked={config.enabled}
          disabled={locked}
          inherited={isEntityLinkageSettingInherited('enabled')}
          onChange={(checked) =>
            updateEntityLinkageConfig({ enabled: checked })
          }
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DropdownWithInfo
            id="entity-linkage-privacy-mode"
            label={t('linkageConfig.privacyMode')}
            value={config.privacyMode}
            info={t('linkageConfigHelp.privacyMode')}
            disabled={settingsDisabled}
            inherited={isEntityLinkageSettingInherited('privacyMode')}
            options={[
              { label: t('linkageConfig.plain'), value: 'plain' },
              { label: 'PPRL', value: 'pprl' }
            ]}
            onChange={(value) =>
              updateEntityLinkageConfig({ privacyMode: value as PrivacyMode })
            }
          />
          <NumberInput
            id="entity-linkage-min-score"
            value={config.minScore}
            label={t('entityLinkage.minScore')}
            info={t('entityLinkageHelp.minScore')}
            disabled={settingsDisabled}
            inherited={isEntityLinkageSettingInherited('minScore')}
            min={0}
            step="0.1"
            onChange={(value) => updateEntityLinkageConfig({ minScore: value })}
          />
          <NumberInput
            id="entity-linkage-min-normalized-score"
            value={config.minNormalizedScore}
            label={t('entityLinkage.minNormalizedScore')}
            info={t('entityLinkageHelp.minNormalizedScore')}
            disabled={settingsDisabled}
            inherited={isEntityLinkageSettingInherited('minNormalizedScore')}
            min={0}
            max={1}
            step="0.01"
            onChange={(value) =>
              updateEntityLinkageConfig({ minNormalizedScore: value })
            }
          />
          <NumberInput
            id="entity-linkage-candidate-limit"
            value={config.candidateLimit}
            label={t('entityLinkage.candidateLimit')}
            info={t('entityLinkageHelp.candidateLimit')}
            disabled={settingsDisabled}
            inherited={isEntityLinkageSettingInherited('candidateLimit')}
            min={1}
            step="1"
            onChange={(value) =>
              updateEntityLinkageConfig({
                candidateLimit: Math.max(1, Math.round(value))
              })
            }
          />
        </div>

        {config.privacyMode === 'pprl' && (
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
            <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {t('linkageConfig.pprlSettings')}
            </h4>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <DropdownWithInfo
                id="entity-linkage-pprl-method"
                label={t('linkageConfig.pprlMethod')}
                value={pprl.method ?? 'ngramBloomFilter'}
                info={t('linkageConfigHelp.pprlMethod')}
                disabled={settingsDisabled}
                inherited={isEntityPprlSettingInherited('method')}
                options={pprlMethodOptions}
                onChange={(value) =>
                  updateEntityPprlConfig({ method: value as PprlMethod })
                }
              />
              {(pprl.method ?? 'ngramBloomFilter') === 'ngramBloomFilter' && (
                <>
                  <NumberInput
                    id="entity-linkage-ngram-size"
                    value={pprl.n ?? 2}
                    label={t('linkageConfig.ngramSize')}
                    info={t('linkageConfigHelp.ngramSize')}
                    disabled={settingsDisabled}
                    inherited={isEntityPprlSettingInherited('n')}
                    min={1}
                    step="1"
                    onChange={(value) =>
                      updateEntityPprlConfig({
                        n: Math.max(1, Math.round(value))
                      })
                    }
                  />
                  <NumberInput
                    id="entity-linkage-bloom-length"
                    value={pprl.length ?? 1024}
                    label={t('linkageConfig.bloomLength')}
                    info={t('linkageConfigHelp.bloomLength')}
                    disabled={settingsDisabled}
                    inherited={isEntityPprlSettingInherited('length')}
                    min={128}
                    step="1"
                    onChange={(value) =>
                      updateEntityPprlConfig({
                        length: Math.max(128, Math.round(value))
                      })
                    }
                  />
                  <NumberInput
                    id="entity-linkage-hash-positions"
                    value={pprl.hashPositions ?? 10}
                    label={t('linkageConfig.hashPositions')}
                    info={t('linkageConfigHelp.hashPositions')}
                    disabled={settingsDisabled}
                    inherited={isEntityPprlSettingInherited('hashPositions')}
                    min={1}
                    step="1"
                    onChange={(value) =>
                      updateEntityPprlConfig({
                        hashPositions: Math.max(1, Math.round(value))
                      })
                    }
                  />
                  <NumberInput
                    id="entity-linkage-band-size"
                    value={pprl.bandSize ?? 32}
                    label={t('linkageConfig.bandSize')}
                    info={t('linkageConfigHelp.bandSize')}
                    disabled={settingsDisabled}
                    inherited={isEntityPprlSettingInherited('bandSize')}
                    min={8}
                    step="1"
                    onChange={(value) =>
                      updateEntityPprlConfig({
                        bandSize: Math.max(8, Math.round(value))
                      })
                    }
                  />
                  <NumberInput
                    id="entity-linkage-bloom-similarity"
                    value={config.bloomMinSimilarity}
                    label={t('entityLinkage.bloomMinSimilarity')}
                    info={t('entityLinkageHelp.bloomMinSimilarity')}
                    disabled={settingsDisabled}
                    inherited={isEntityLinkageSettingInherited(
                      'bloomMinSimilarity'
                    )}
                    min={0}
                    max={1}
                    step="0.01"
                    onChange={(value) =>
                      updateEntityLinkageConfig({ bloomMinSimilarity: value })
                    }
                  />
                  <ToggleWithInfo
                    id="entity-linkage-exact-token"
                    label={t('entityLinkage.exactToken')}
                    description={t('entityLinkageHelp.exactToken')}
                    checked={Boolean(pprl.exact)}
                    disabled={settingsDisabled}
                    inherited={isEntityPprlSettingInherited('exact')}
                    onChange={(checked) =>
                      updateEntityPprlConfig({ exact: checked })
                    }
                  />
                </>
              )}
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <ToggleWithInfo
            id="entity-linkage-auto-create"
            label={t('entityLinkage.autoLinkOnCreate')}
            description={t('entityLinkageHelp.autoLinkOnCreate')}
            checked={config.autoLinkOnCreate}
            disabled={settingsDisabled}
            inherited={isEntityLinkageSettingInherited('autoLinkOnCreate')}
            onChange={(checked) =>
              updateEntityLinkageConfig({ autoLinkOnCreate: checked })
            }
          />
          <DropdownWithInfo
            id="entity-linkage-on-match"
            label={t('entityLinkage.onMatch')}
            value={config.onMatch}
            info={t('entityLinkageHelp.onMatch')}
            disabled={settingsDisabled || !config.autoLinkOnCreate}
            inherited={isEntityLinkageSettingInherited('onMatch')}
            options={[
              { label: t('entityLinkage.onMatchReject'), value: 'reject' },
              {
                label: t('entityLinkage.onMatchReturnExisting'),
                value: 'returnExisting'
              }
            ]}
            onChange={(value) =>
              updateEntityLinkageConfig({ onMatch: value as MatchAction })
            }
          />
        </div>
      </div>
    )
  }

  const renderLinkageConfig = (attribute: BuilderAttribute) => {
    if (!attribute.linkage) return null
    const config = effectiveAttributeLinkageConfig(attribute)
    const isCollapsed = collapsedLinkageKeys[attribute.key] ?? true
    const locked = readOnly || Boolean(attribute.locked)
    return (
      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 text-left dark:border-blue-900/60 dark:bg-blue-950/30">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 rounded-t-xl px-4 py-3 text-left hover:bg-blue-100/60 dark:hover:bg-blue-900/30"
          onClick={() =>
            setCollapsedLinkageKeys((current) => ({
              ...current,
              [attribute.key]: !isCollapsed
            }))
          }
        >
          <span>
            <span className="block font-semibold text-color-blue dark:text-blue-100">
              {t('linkageConfig.attributeTitle')}
            </span>
            <span className="mt-1 block text-sm font-normal text-gray-600 dark:text-gray-300">
              {t('linkageConfig.attributeDescription')}
            </span>
          </span>
          {isCollapsed ? (
            <ChevronRightIcon className="h-5 w-5 flex-none text-color-blue dark:text-blue-100" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 flex-none text-color-blue dark:text-blue-100" />
          )}
        </button>
        {!isCollapsed && (
          <div className="grid gap-4 px-4 pb-4 pt-2 lg:grid-cols-4">
            <InputWithInfo
              id={`weight-${attribute.key}`}
              label={t('linkageConfig.weight')}
              type="number"
              step="0.1"
              value={String(config.weight ?? 1)}
              info={t('linkageConfigHelp.weight')}
              disabled={locked}
              onChange={(value) =>
                updateLinkageConfig(attribute, { weight: Number(value) })
              }
            />
            <MultiCheck
              title={t('linkageConfig.normalizers')}
              values={normalizerOptions}
              selected={config.normalizers ?? []}
              labelPrefix="normalizerOptions"
              helpPrefix="normalizerHelp"
              disabled={locked}
              onChange={(value, checked) =>
                setListValue(attribute, 'normalizers', value, checked)
              }
            />
            <MultiCheck
              title={t('linkageConfig.encoders')}
              values={encoderOptions}
              selected={config.encoders ?? []}
              labelPrefix="encoderOptions"
              helpPrefix="encoderHelp"
              disabled={locked}
              onChange={(value, checked) =>
                setListValue(attribute, 'encoders', value, checked)
              }
            />
            <MultiCheck
              title={t('linkageConfig.blocking')}
              values={blockingOptions}
              selected={config.blocking ?? []}
              labelPrefix="blockingOptions"
              helpPrefix="blockingHelp"
              disabled={locked}
              onChange={(value, checked) =>
                setListValue(attribute, 'blocking', value, checked)
              }
            />
          </div>
        )}
      </div>
    )
  }

  const renderAttributeEditor = (
    attribute: BuilderAttribute,
    depth = 0
  ): React.ReactNode => {
    const isGroup = Array.isArray(attribute.attributes)
    const inheritedFromBase = Boolean(attribute.locked)
    const locked = readOnly || inheritedFromBase
    const collapsed = collapsedAttributeKeys[attribute.key] ?? inheritedFromBase
    const showBeforeDropLine =
      dropIndicator?.targetKey === attribute.key &&
      dropIndicator.position === 'before'
    const showInsideDropLine =
      dropIndicator?.targetKey === attribute.key &&
      dropIndicator.position === 'inside'
    const showAfterDropLine =
      dropIndicator?.targetKey === attribute.key &&
      dropIndicator.position === 'after'

    return (
      <div
        key={attribute.key}
        ref={(element) => {
          attributeElementRefs.current[attribute.key] = element
        }}
        className="space-y-2"
      >
        {showBeforeDropLine && (
          <div className="h-1 rounded-full bg-color-blue shadow-[0_0_0_3px_rgba(37,99,235,0.18)]" />
        )}
        <div
          draggable={false}
          onDragStart={(event) => {
            if (locked) {
              event.preventDefault()
              return
            }
            setDraggedAttributeKey(attribute.key)
            event.dataTransfer.effectAllowed = 'move'
            event.dataTransfer.setData('text/plain', attribute.key)
          }}
          onDragEnd={() => {
            setDraggedAttributeKey(null)
            setDropIndicator(null)
          }}
          onDragOver={(event) => {
            if (draggedAttributeKey && draggedAttributeKey !== attribute.key) {
              event.preventDefault()
              event.stopPropagation()
              const position = resolveDropPosition(event, isGroup)
              setDropIndicator({ targetKey: attribute.key, position })
            }
          }}
          onDrop={(event) => {
            event.preventDefault()
            event.stopPropagation()
            const source =
              event.dataTransfer.getData('text/plain') || draggedAttributeKey
            if (source) handleAttributeDrop(source, attribute)
            setDraggedAttributeKey(null)
            setDropIndicator(null)
          }}
          className={`rounded-xl border p-4 transition ${depth ? 'ml-4' : ''} ${
            inheritedFromBase
              ? 'border-gray-300 bg-gray-100 dark:border-slate-600 dark:bg-slate-800'
              : 'border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-900'
          } ${draggedAttributeKey === attribute.key ? 'opacity-60' : ''} ${
            showInsideDropLine
              ? 'ring-2 ring-color-blue ring-offset-2 ring-offset-white dark:ring-offset-slate-900'
              : ''
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-left font-semibold text-gray-900 dark:text-gray-100"
              onClick={() =>
                setCollapsedAttributeKeys((current) => ({
                  ...current,
                  [attribute.key]: !collapsed
                }))
              }
            >
              {collapsed ? (
                <ChevronRightIcon className="h-5 w-5 flex-none text-gray-500" />
              ) : (
                <ChevronDownIcon className="h-5 w-5 flex-none text-gray-500" />
              )}
              <span className="truncate">
                {preferredLabel(
                  attribute,
                  i18n.resolvedLanguage ?? i18n.language
                ) ||
                  (isGroup
                    ? t('newGroup', 'New section')
                    : t('newAttribute', 'New attribute'))}
              </span>
            </button>

            <div className="flex flex-none items-center gap-2">
              {inheritedFromBase && (
                <span className="rounded-full bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 dark:bg-slate-700 dark:text-gray-300">
                  {t('baseTypeAttributeLocked')}
                </span>
              )}
              {!readOnly && !inheritedFromBase && (
                <button
                  type="button"
                  title={t('common:delete')}
                  aria-label={t('common:delete')}
                  onClick={() => removeAttribute(attribute.key)}
                  className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 hover:text-red-800 dark:text-red-300 dark:hover:bg-red-950/30"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {!collapsed && (
            <div className="mt-4">
              <div className="grid gap-3 md:grid-cols-2">
                <FloatingTextInput
                  id={`attribute-name-${attribute.key}`}
                  label={t('systemAttributeIdentifier')}
                  value={attribute.name}
                  placeholder={t('systemAttributeIdentifierPlaceholder')}
                  info={t('systemAttributeIdentifierHelp')}
                  error={
                    attribute.name.trim() &&
                    !isValidSystemIdentifier(attribute.name)
                      ? t('systemAttributeIdentifierInvalid')
                      : undefined
                  }
                  onChange={(value) =>
                    handleAttributeNameChange(attribute, value)
                  }
                  disabled={locked}
                  required
                />

                {isGroup ? (
                  <div>
                    <FieldLabel
                      htmlFor={`section-type-${attribute.key}`}
                      label={t('attributeType')}
                    />
                    <div
                      id={`section-type-${attribute.key}`}
                      className="flex h-[44px] items-center rounded-lg border border-gray-200 bg-gray-100 px-3 text-gray-500 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300"
                    >
                      {t('sectionType')}
                    </div>
                  </div>
                ) : (
                  <LabeledDropdown
                    id={`type-${attribute.key}`}
                    label={t('attributeType')}
                    value={attribute.type ?? ''}
                    onChange={(value) =>
                      updateAttribute(attribute.key, {
                        type: value,
                        linkageConfig: attribute.linkage
                          ? defaultLinkageConfig(value)
                          : attribute.linkageConfig
                      })
                    }
                    options={typeOptions}
                    disabled={locked}
                    required
                  />
                )}

                <div className="md:col-span-2">
                  <LabelListEditor
                    labels={attribute.labels ?? { en: '', de: '' }}
                    disabled={locked}
                    onChange={(labels) =>
                      updateAttribute(attribute.key, {
                        labels,
                        label_en: labels.en ?? '',
                        label_de: labels.de ?? ''
                      })
                    }
                  />
                </div>
              </div>

              <div className="mt-3 space-y-3 text-sm text-gray-700 dark:text-gray-200">
                {isGroup ? (
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(attribute.repeatable)}
                      disabled={locked}
                      onChange={(event) =>
                        updateAttribute(attribute.key, {
                          repeatable: event.target.checked
                        })
                      }
                    />
                    {t('attribute.repeatable')}
                  </label>
                ) : (
                  <AttributeOptions
                    attribute={attribute}
                    locked={locked}
                    onToggle={(flag, checked) => {
                      updateAttribute(attribute.key, {
                        [flag]: checked,
                        ...(flag === 'linkage' && checked
                          ? {
                              linkageConfig:
                                attribute.linkageConfig ??
                                defaultLinkageConfig(attribute.type),
                              tags: attribute.tags?.length
                                ? attribute.tags
                                : [buildDefaultTag(entityName, attribute.name)]
                            }
                          : {})
                      })
                    }}
                  />
                )}
              </div>

              {!isGroup && attribute.type === 'enum' && (
                <div className="mt-3">
                  <FloatingTextInput
                    id={`enum-values-${attribute.key}`}
                    label={t('dropdownOptions')}
                    value={(attribute.values ?? []).join(', ')}
                    placeholder={t('dropdownValuesCommaSeparated')}
                    disabled={locked}
                    onChange={(value) =>
                      updateAttribute(attribute.key, {
                        values: value.split(',').map((entry) => entry.trim())
                      })
                    }
                  />
                </div>
              )}

              {!isGroup && renderLinkageConfig(attribute)}

              {isGroup && (
                <div
                  className={`mt-4 space-y-4 border-l pl-4 transition ${
                    showInsideDropLine
                      ? 'border-color-blue bg-blue-50/50 dark:bg-blue-950/20'
                      : 'border-gray-200 dark:border-slate-700'
                  }`}
                  onDragOver={(event) => {
                    if (
                      draggedAttributeKey &&
                      draggedAttributeKey !== attribute.key
                    ) {
                      event.preventDefault()
                      event.stopPropagation()
                      setDropIndicator({
                        targetKey: attribute.key,
                        position: 'inside'
                      })
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    const source =
                      event.dataTransfer.getData('text/plain') ||
                      draggedAttributeKey
                    if (source) moveIntoGroup(source, attribute.key)
                    setDraggedAttributeKey(null)
                    setDropIndicator(null)
                  }}
                >
                  {showInsideDropLine && (
                    <div className="h-1 rounded-full bg-color-blue shadow-[0_0_0_3px_rgba(37,99,235,0.18)]" />
                  )}
                  {(attribute.attributes ?? []).length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-slate-700 dark:text-gray-300">
                      {t('emptyGroupHint')}
                    </div>
                  ) : (
                    attribute.attributes?.map((child) =>
                      renderAttributeEditor(child, depth + 1)
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        {showAfterDropLine && (
          <div className="h-1 rounded-full bg-color-blue shadow-[0_0_0_3px_rgba(37,99,235,0.18)]" />
        )}
      </div>
    )
  }

  const editorContent = (
    <div
      className={
        embedded
          ? 'w-full space-y-6'
          : 'builder-content-column mx-auto w-full max-w-5xl space-y-6'
      }
    >
      {!embedded && (
        <div className="w-full">
          <PrimaryOutlinedButton
            label={t('common:back', 'Back')}
            icon={<ArrowLeftIcon className="h-5 w-5" />}
            iconPos="left"
            onClick={() => navigate('/entity/manager')}
          />
        </div>
      )}

      {!hideBasicSettings && (
        <Panel
          title={
            embedded || readOnly
              ? t('basicSettings')
              : mode === 'edit'
                ? t('editEntityType')
                : saveTarget === 'base'
                  ? t('createBaseType')
                  : t('createEntityType')
          }
          className="!w-full"
          noMaxWidth
        >
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {!hideEntityName && (
              <FloatingTextInput
                id="entityTypeName"
                label={t('entityName')}
                value={entityName}
                placeholder={t('entityNamePlaceholder')}
                onChange={setEntityName}
                disabled={readOnly}
                required
              />
            )}

            {saveTarget === 'project' && (
              <LabeledDropdown
                id="baseType"
                label={t('baseType')}
                value={selectedBaseType}
                onChange={setSelectedBaseType}
                options={baseTypeOptions}
                disabled={readOnly}
                required
              />
            )}

            {saveTarget === 'project' && (
              <div className={hideEntityName ? '' : 'md:col-span-2'}>
                <GroupSearchInput
                  id="associatedGroupName"
                  value={associatedGroupName}
                  label={t('associatedGroupName')}
                  placeholder={t('associatedGroupNamePlaceholder')}
                  info={t('associatedGroupNameHelp')}
                  hint={
                    !readOnly ? t('associatedGroupCreationHint') : undefined
                  }
                  options={groupOptions}
                  loading={groupSearchLoading}
                  disabled={readOnly}
                  onChange={setAssociatedGroupName}
                />
                {baseTypeLoading && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-300">
                    {t('loadingBaseType')}
                  </p>
                )}
                {baseTypeOptions.length === 0 && (
                  <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                    {t('noBaseTypesHint')}
                  </p>
                )}
              </div>
            )}
          </div>
        </Panel>
      )}

      <Panel title={t('entityLinkage.title')} className="!w-full" noMaxWidth>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-300">
          {t('entityLinkage.description')}
        </p>
        {renderEntityLinkageConfig()}
      </Panel>

      <Panel title={t('visualPreview')} className="!w-full" noMaxWidth>
        {attributes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-300">
            {t('noAttributesHint')}
          </div>
        ) : (
          <div className="space-y-4">
            {attributes.map((attribute) => renderAttributeEditor(attribute))}
          </div>
        )}

        {!readOnly && (
          <div className="mt-6 border-t border-gray-200 pt-4 dark:border-slate-700">
            <p className="mb-3 text-center text-sm text-gray-500 dark:text-gray-300">
              {t('addMoreAttributesHint')}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <PrimaryOutlinedButton
                label={
                  <span className="inline-flex items-center gap-2">
                    <PlusIcon className="h-4 w-4" />
                    {t('addCustomAttribute')}
                  </span>
                }
                onClick={() => addAttribute(undefined, true)}
              />
            </div>
          </div>
        )}
      </Panel>

      {!readOnly && (
        <div className="flex w-full flex-wrap justify-center gap-2">
          {embedded && onCancel && (
            <PrimaryOutlinedButton
              label={t('common:cancel')}
              onClick={onCancel}
            />
          )}
          <PrimaryButton
            label={
              saving
                ? t('common:loading')
                : mode === 'edit'
                  ? t('saveChanges', 'Save changes')
                  : saveTarget === 'base'
                    ? t('createBaseType', 'Create base type')
                    : t('createEntityType')
            }
            loading={saving}
            onClick={save}
          />
        </div>
      )}
    </div>
  )

  if (embedded) return editorContent

  return <div className="builder-page-shell w-full">{editorContent}</div>
}

function FieldLabel({
  htmlFor,
  label,
  required = false,
  info
}: {
  htmlFor: string
  label: string
  required?: boolean
  info?: string
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-200"
    >
      <span>{label}</span>
      {required && <span className="text-red-600">*</span>}
      {info && <InfoIcon title={info} />}
    </label>
  )
}

function FloatingTextInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  onFocus,
  onBlur,
  info,
  error,
  maxLength,
  required = false
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  onFocus?: () => void
  onBlur?: () => void
  info?: string
  error?: string
  maxLength?: number
  required?: boolean
}) {
  return (
    <div>
      <FieldLabel htmlFor={id} label={label} required={required} info={info} />
      <input
        id={id}
        className={`h-[44px] w-full rounded-lg border px-3 text-base disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:bg-slate-950 dark:text-gray-100 dark:disabled:bg-slate-800 dark:disabled:text-gray-400 ${error ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-slate-700'}`}
        disabled={disabled}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder ?? ''}
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-300">{error}</p>
      )}
    </div>
  )
}

function InfoIcon({ title }: { title: string }) {
  return (
    <span
      title={title}
      className="inline-flex h-4 w-4 items-center justify-center rounded-full text-gray-500 hover:text-color-blue dark:text-gray-300 dark:hover:text-blue-200"
    >
      <InformationCircleIcon className="h-4 w-4" />
    </span>
  )
}

function FieldInfo({ title }: { title: string }) {
  return (
    <span
      title={title}
      role="img"
      aria-label={title}
      className="absolute right-2 top-1/2 z-10 -translate-y-1/2 cursor-help text-gray-500 hover:text-color-blue dark:text-gray-300 dark:hover:text-blue-200"
    >
      <InformationCircleIcon className="h-5 w-5" />
    </span>
  )
}

function LabeledDropdown({
  id,
  label,
  value,
  options,
  onChange,
  disabled = false,
  required = false,
  info,
  filter = false,
  filterPlaceholder
}: {
  id: string
  label: string
  value: string
  options: { label: string; value: string }[]
  onChange: (value: string) => void
  disabled?: boolean
  required?: boolean
  info?: string
  filter?: boolean
  filterPlaceholder?: string
}) {
  return (
    <div>
      <FieldLabel htmlFor={id} label={label} required={required} info={info} />
      <CustomDropdown
        id={id}
        value={value}
        onChange={(event) => onChange(String(event.value ?? ''))}
        options={options}
        disabled={disabled}
        placeholder=""
        filter={filter}
        filterPlaceholder={filterPlaceholder}
      />
    </div>
  )
}

function InputWithInfo({
  id,
  label,
  value,
  onChange,
  info,
  placeholder,
  type = 'text',
  step,
  disabled = false,
  maxLength,
  inputMode,
  inherited = false,
  min,
  max
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  info: string
  placeholder?: string
  type?: string
  step?: string
  disabled?: boolean
  maxLength?: number
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  inherited?: boolean
  min?: number
  max?: number
}) {
  const { t } = useTranslation(['entityBuilder'])
  const inheritedTitle = t(
    'entityLinkage.inherited',
    'Inherited from the base entity; edit to override.'
  )

  return (
    <div>
      <FieldLabel htmlFor={id} label={label} info={info} />
      <div className="relative">
        <input
          id={id}
          className={`h-[44px] w-full rounded-lg border px-3 pr-16 text-base disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:text-gray-100 dark:disabled:bg-slate-800 dark:disabled:text-gray-400 ${
            inherited
              ? 'border-blue-300 bg-blue-50/70 dark:border-blue-800 dark:bg-blue-950/30'
              : 'border-gray-300 dark:border-slate-700 dark:bg-slate-950'
          }`}
          disabled={disabled}
          type={type}
          step={step}
          maxLength={maxLength}
          min={min}
          max={max}
          inputMode={inputMode}
          value={value}
          placeholder={placeholder ?? ''}
          onChange={(event) => onChange(event.target.value)}
        />
        {inherited && (
          <InheritanceIndicator
            title={inheritedTitle}
            className="absolute right-10 top-1/2 z-10 -translate-y-1/2 text-base"
          />
        )}
        <FieldInfo title={info} />
      </div>
    </div>
  )
}

function DropdownWithInfo({
  id,
  label,
  value,
  options,
  onChange,
  info,
  disabled = false,
  inherited = false
}: {
  id: string
  label: string
  value: string
  options: { label: string; value: string }[]
  onChange: (value: string) => void
  info: string
  disabled?: boolean
  inherited?: boolean
}) {
  const { t } = useTranslation(['entityBuilder'])
  const inheritedTitle = t(
    'entityLinkage.inherited',
    'Inherited from the base entity; edit to override.'
  )

  return (
    <div>
      <FieldLabel htmlFor={id} label={label} info={info} />
      <div
        className={`relative rounded-lg ${
          inherited
            ? 'bg-blue-50/70 ring-1 ring-blue-200 dark:bg-blue-950/30 dark:ring-blue-800'
            : ''
        }`}
      >
        <CustomDropdown
          id={id}
          value={value}
          onChange={(event) => onChange(String(event.value ?? ''))}
          options={options}
          placeholder=""
          disabled={disabled}
          className={inherited ? 'td-custom-dropdown--inherited' : ''}
        />
        {inherited && (
          <InheritanceIndicator
            title={inheritedTitle}
            className="absolute right-12 top-1/2 z-20 -translate-y-1/2 text-base"
          />
        )}
      </div>
    </div>
  )
}

function ToggleWithInfo({
  id,
  label,
  description,
  checked,
  onChange,
  disabled = false,
  inherited = false
}: {
  id: string
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  inherited?: boolean
}) {
  const { t } = useTranslation(['entityBuilder'])
  const inheritedTitle = t(
    'entityLinkage.inherited',
    'Inherited from the base entity; edit to override.'
  )
  return (
    <label
      htmlFor={id}
      className={`relative flex min-h-[76px] cursor-pointer items-start gap-3 rounded-xl border p-3 pr-10 transition disabled:cursor-not-allowed ${
        inherited
          ? 'border-blue-300 bg-blue-50/70 dark:border-blue-800 dark:bg-blue-950/30'
          : 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-950'
      } ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4"
      />
      <span>
        <span className="block text-sm font-semibold text-gray-800 dark:text-gray-100">
          {label}
        </span>
        <span className="mt-1 block text-sm text-gray-500 dark:text-gray-300">
          {description}
        </span>
      </span>
      {inherited && (
        <InheritanceIndicator
          title={inheritedTitle}
          className="absolute right-3 top-3 text-base"
        />
      )}
    </label>
  )
}

function GroupSearchInput({
  id,
  value,
  label,
  placeholder,
  info,
  hint,
  options,
  loading = false,
  onChange,
  disabled = false
}: {
  id: string
  value: string
  label: string
  placeholder: string
  info?: string
  hint?: string
  options: { label: string; value: string }[]
  loading?: boolean
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const { t } = useTranslation(['entityBuilder'])
  const [open, setOpen] = useState(false)
  const visibleOptions = filterGroupOptions(options, value).slice(0, 20)
  const shouldShowMenu = open && (loading || visibleOptions.length > 0)

  return (
    <div className="relative">
      <FieldLabel htmlFor={id} label={label} info={info} />
      <input
        id={id}
        className="h-[44px] w-full rounded-lg border border-gray-300 bg-white px-3 text-base outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-slate-700 dark:bg-slate-950 dark:text-gray-100 dark:disabled:bg-slate-800 dark:disabled:text-gray-400"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => !disabled && setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(!disabled)
        }}
      />
      {hint && (
        <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-300">
          {hint}
        </p>
      )}
      {shouldShowMenu && (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-300">
              {t('searchingGroups')}
            </div>
          ) : (
            visibleOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-blue-50 dark:text-gray-100 dark:hover:bg-blue-950/40"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function AttributeOptions({
  attribute,
  locked,
  onToggle
}: {
  attribute: BuilderAttribute
  locked: boolean
  onToggle: (
    flag: 'required' | 'linkage' | 'repeatable',
    checked: boolean
  ) => void
}) {
  const { t } = useTranslation(['entityBuilder'])
  return (
    <div className="flex flex-wrap gap-4">
      {(['required', 'repeatable', 'linkage'] as const).map((flag) => (
        <label key={flag} className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(attribute[flag])}
            disabled={locked}
            onChange={(event) => onToggle(flag, event.target.checked)}
          />
          <span className="inline-flex items-center gap-1.5">
            {t(
              `attribute.${flag}`,
              flag.charAt(0).toUpperCase() + flag.slice(1)
            )}
            <InfoIcon title={t(`attributeHelp.${flag}`, '')} />
          </span>
        </label>
      ))}
    </div>
  )
}

function LabelListEditor({
  labels,
  disabled,
  onChange
}: {
  labels: LabelMap
  disabled: boolean
  onChange: (labels: LabelMap) => void
}) {
  const { t } = useTranslation(['entityBuilder'])
  const supportedLanguages = [
    { code: 'en', label: t('labelLanguages.en', 'English'), required: true },
    { code: 'de', label: t('labelLanguages.de', 'German'), required: false }
  ] as const

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-100">
        {t('attributeLabels', 'Attribute labels')}
      </span>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {supportedLanguages.map(({ code, label, required }) => (
          <FloatingTextInput
            key={code}
            id={`label-${code}`}
            label={label}
            value={labels[code] ?? ''}
            placeholder={t('labelTextPlaceholder', 'Enter a label')}
            maxLength={80}
            disabled={disabled}
            required={required}
            onChange={(value) =>
              onChange({ ...labels, [code]: value.slice(0, 80) })
            }
          />
        ))}
      </div>
    </div>
  )
}

function NumberInput({
  id,
  value,
  label,
  info,
  onChange,
  disabled = false,
  inherited = false,
  min,
  max,
  step
}: {
  id: string
  value: number
  label: string
  info: string
  onChange: (value: number) => void
  disabled?: boolean
  inherited?: boolean
  min?: number
  max?: number
  step?: string
}) {
  return (
    <InputWithInfo
      id={id}
      label={label}
      info={info}
      type="number"
      value={String(value)}
      disabled={disabled}
      inherited={inherited}
      min={min}
      max={max}
      step={step}
      onChange={(value) => onChange(Number(value))}
    />
  )
}

function readableOptionLabel(value: string) {
  const labels: Record<string, string> = {
    trim: 'Trim whitespace',
    lower: 'Lowercase text',
    collapseWhitespace: 'Collapse whitespace',
    asciiFold: 'Normalize accents',
    umlautFold: 'Normalize German umlauts',
    removePunctuation: 'Remove punctuation',
    digitsOnly: 'Keep digits only',
    cologne: 'Cologne phonetics',
    doubleMetaphone: 'Double Metaphone phonetics',
    exact: 'Exact match',
    prefix3: 'First 3 characters',
    prefix4: 'First 4 characters',
    prefix6: 'First 6 characters',
    phonetic: 'Phonetic key',
    year: 'Year',
    yearMonth: 'Year and month',
    domainExact: 'Exact group value',
    bloomBands: 'Bloom filter bands'
  }
  return labels[value] ?? value
}

function MultiCheck({
  title,
  values,
  selected,
  labelPrefix,
  helpPrefix,
  onChange,
  disabled = false
}: {
  title: string
  values: string[]
  selected: string[]
  labelPrefix: string
  helpPrefix: string
  onChange: (value: string, checked: boolean) => void
  disabled?: boolean
}) {
  const { t } = useTranslation(['entityBuilder'])
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
      <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-100">
        {title}
      </h5>
      <div className="mt-2 space-y-1">
        {values.map((value) => (
          <label
            key={value}
            className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"
          >
            <input
              type="checkbox"
              checked={selected.includes(value)}
              disabled={disabled}
              onChange={(event) => onChange(value, event.target.checked)}
            />
            <span className="min-w-0 flex-1 truncate">
              {t(`${labelPrefix}.${value}`, readableOptionLabel(value))}
            </span>
            <InfoIcon title={t(`${helpPrefix}.${value}`, '')} />
          </label>
        ))}
      </div>
    </div>
  )
}
