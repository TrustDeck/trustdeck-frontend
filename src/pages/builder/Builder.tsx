import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeftIcon,
  ArrowsUpDownIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  InformationCircleIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import Panel from '../../core/components/common/Panel'
import CustomFloatLabel from '@component/form/CustomFloatLabel'
import CustomDropdown from '../../core/components/form/CustomDropdown'
import PrimaryButton from '@component/form/buttons/PrimaryButton'
import PrimaryOutlinedButton from '@component/form/buttons/PrimaryOutlinedButton'
import TrustDeck from '../../core/services/TrustDeck'
import useToastStore from '../../core/stores/ToastStore'
import useProjectStore from '../../core/stores/ProjectStore'

type LayoutValue = 'row' | 'col' | 'group'
type PrivacyMode = 'plain' | 'pprl'
type PprlMethod = 'ngramBloomFilter' | 'hmacExact'
type DropIndicator = {
  targetKey: string
  position: 'before' | 'after' | 'inside'
} | null

type LabelMap = Record<string, string>

const SYSTEM_IDENTIFIER_PATTERN = /^[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)*$/

const ISO_639_1_LANGUAGE_CODES = [
  'aa',
  'ab',
  'ae',
  'af',
  'ak',
  'am',
  'an',
  'ar',
  'as',
  'av',
  'ay',
  'az',
  'ba',
  'be',
  'bg',
  'bh',
  'bi',
  'bm',
  'bn',
  'bo',
  'br',
  'bs',
  'ca',
  'ce',
  'ch',
  'co',
  'cr',
  'cs',
  'cu',
  'cv',
  'cy',
  'da',
  'de',
  'dv',
  'dz',
  'ee',
  'el',
  'en',
  'eo',
  'es',
  'et',
  'eu',
  'fa',
  'ff',
  'fi',
  'fj',
  'fo',
  'fr',
  'fy',
  'ga',
  'gd',
  'gl',
  'gn',
  'gu',
  'gv',
  'ha',
  'he',
  'hi',
  'ho',
  'hr',
  'ht',
  'hu',
  'hy',
  'hz',
  'ia',
  'id',
  'ie',
  'ig',
  'ii',
  'ik',
  'io',
  'is',
  'it',
  'iu',
  'ja',
  'jv',
  'ka',
  'kg',
  'ki',
  'kj',
  'kk',
  'kl',
  'km',
  'kn',
  'ko',
  'kr',
  'ks',
  'ku',
  'kv',
  'kw',
  'ky',
  'la',
  'lb',
  'lg',
  'li',
  'ln',
  'lo',
  'lt',
  'lu',
  'lv',
  'mg',
  'mh',
  'mi',
  'mk',
  'ml',
  'mn',
  'mr',
  'ms',
  'mt',
  'my',
  'na',
  'nb',
  'nd',
  'ne',
  'ng',
  'nl',
  'nn',
  'no',
  'nr',
  'nv',
  'ny',
  'oc',
  'oj',
  'om',
  'or',
  'os',
  'pa',
  'pi',
  'pl',
  'ps',
  'pt',
  'qu',
  'rm',
  'rn',
  'ro',
  'ru',
  'rw',
  'sa',
  'sc',
  'sd',
  'se',
  'sg',
  'si',
  'sk',
  'sl',
  'sm',
  'sn',
  'so',
  'sq',
  'sr',
  'ss',
  'st',
  'su',
  'sv',
  'sw',
  'ta',
  'te',
  'tg',
  'th',
  'ti',
  'tk',
  'tl',
  'tn',
  'to',
  'tr',
  'ts',
  'tt',
  'tw',
  'ty',
  'ug',
  'uk',
  'ur',
  'uz',
  've',
  'vi',
  'vo',
  'wa',
  'wo',
  'xh',
  'yi',
  'yo',
  'za',
  'zh',
  'zu'
]

type LinkageConfig = {
  privacyMode?: PrivacyMode
  normalizers?: string[]
  encoders?: string[]
  blocking?: string[]
  weight?: number
  pprl?: {
    method?: PprlMethod
    n?: number
    length?: number
    hashPositions?: number
    bandSize?: number
  }
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
  }
}

const typeOptionDefinitions = [
  { labelKey: 'entityBuilder:type.text', fallback: 'Text', value: 'string' },
  {
    labelKey: 'entityBuilder:type.integer',
    fallback: 'Integer',
    value: 'integer'
  },
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
  'domainExact'
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

function defaultLinkageConfig(type?: string): LinkageConfig {
  const exact =
    type === 'date' ||
    type === 'datetime' ||
    type === 'boolean' ||
    type === 'integer' ||
    type === 'number'
  return {
    privacyMode: 'pprl',
    normalizers: exact
      ? ['trim']
      : [
          'trim',
          'lower',
          'collapseWhitespace',
          'umlautFold',
          'asciiFold',
          'removePunctuation'
        ],
    weight: 1,
    pprl: exact
      ? { method: 'hmacExact' }
      : {
          method: 'ngramBloomFilter',
          n: 2,
          length: 1024,
          hashPositions: 10,
          bandSize: 32
        }
  }
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

  const importedLinkageConfig = attribute?.linkageConfig
    ? { ...attribute.linkageConfig }
    : undefined
  if (importedLinkageConfig) delete importedLinkageConfig.comparator
  if (importedLinkageConfig?.pprl) delete importedLinkageConfig.pprl.exact

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
    type: attribute?.type ?? 'string',
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

function cleanLinkageConfig(config: LinkageConfig): LinkageConfig {
  const cleaned: LinkageConfig = {}
  if (config.privacyMode) cleaned.privacyMode = config.privacyMode
  if (compactArray(config.normalizers).length)
    cleaned.normalizers = compactArray(config.normalizers)
  if (compactArray(config.encoders).length)
    cleaned.encoders = compactArray(config.encoders)
  if (config.privacyMode !== 'pprl' && compactArray(config.blocking).length)
    cleaned.blocking = compactArray(config.blocking)
  if (config.weight !== undefined && config.weight !== null)
    cleaned.weight = Number(config.weight)
  if (config.privacyMode === 'pprl' && config.pprl) {
    cleaned.pprl = {
      method: config.pprl.method ?? 'ngramBloomFilter'
    }
    if ((cleaned.pprl.method ?? config.pprl.method) === 'ngramBloomFilter') {
      cleaned.pprl.n = Number(config.pprl.n ?? 2)
      cleaned.pprl.length = Number(config.pprl.length ?? 1024)
      cleaned.pprl.hashPositions = Number(config.pprl.hashPositions ?? 10)
      cleaned.pprl.bandSize = Number(config.pprl.bandSize ?? 32)
    }
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
}

export default function Builder({
  scope = 'project',
  mode = 'create',
  initialType = null,
  embedded = false,
  onSaved,
  onCancel,
  readOnly = false
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
  const [groupSearchLoading, setGroupSearchLoading] = useState(false)
  const [attributes, setAttributes] = useState<BuilderAttribute[]>([])
  const [saving, setSaving] = useState(false)
  const [draggedAttributeKey, setDraggedAttributeKey] = useState<string | null>(
    null
  )
  const [dropIndicator, setDropIndicator] = useState<DropIndicator>(null)
  const [collapsedLinkageKeys, setCollapsedLinkageKeys] = useState<
    Record<string, boolean>
  >({})
  const [advancedOptionKeys, setAdvancedOptionKeys] = useState<
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
    setDraggedAttributeKey(null)
    setDropIndicator(null)
    setCollapsedLinkageKeys({})
    setAdvancedOptionKeys({})
  }, [initialType, scope])

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
      setGroupOptions([])
      setGroupSearchLoading(false)
      return
    }

    let active = true
    const handle = window.setTimeout(async () => {
      setGroupSearchLoading(true)
      try {
        const query = associatedGroupName.trim() || '*'
        const domains = await TrustDeck.instance().searchReadableDomains(query)
        if (active) setGroupOptions(flattenDomainsForOptions(domains ?? []))
      } catch {
        if (active) setGroupOptions([])
      } finally {
        if (active) setGroupSearchLoading(false)
      }
    }, 250)

    return () => {
      active = false
      window.clearTimeout(handle)
    }
  }, [associatedGroupName, saveTarget])

  useEffect(() => {
    let active = true
    async function loadSelectedBaseType() {
      if (saveTarget !== 'project' || !selectedBaseType) return
      setBaseTypeLoading(true)
      try {
        const base = (await TrustDeck.instance().getBaseType(
          selectedBaseType
        )) as any
        if (!active) return
        const baseAttributes = attributesFromPayload(
          base as EntityTypePayload
        ).map(lockBaseAttribute)
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
        )
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

  const addAttribute = (source?: Partial<BuilderAttribute>) => {
    if (readOnly) return
    setAttributes((current) => [...current, newLeafAttribute(source)])
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
    if (saveTarget === 'project' && !finalPayload.baseTypeName) {
      showToast({
        severity: 'error',
        summary: t('toast.missingBaseSummary'),
        detail: t('toast.missingBaseDetail'),
        life: 3500
      })
      return
    }

    setSaving(true)
    try {
      const savedType =
        saveTarget === 'base'
          ? mode === 'edit' && initialType?.name
            ? await TrustDeck.instance().updateBaseType(initialType.name, {
                ...finalPayload,
                version: finalPayload.version ?? 'v1.0',
                isBaseType: true,
                baseTypeName: undefined,
                associatedDomainName: undefined
              })
            : await TrustDeck.instance().createBaseType({
                ...finalPayload,
                version: finalPayload.version ?? 'v1.0',
                isBaseType: true,
                baseTypeName: undefined,
                associatedDomainName: undefined
              })
          : mode === 'edit' && initialType?.name
            ? await TrustDeck.instance().updateEntityConfig(initialType.name, {
                ...finalPayload,
                version: finalPayload.version ?? 'v1.0',
                isBaseType: false
              })
            : await TrustDeck.instance().createEntityConfig({
                ...finalPayload,
                version: finalPayload.version ?? 'v1.0',
                isBaseType: false
              })
      if (saveTarget === 'project') await refreshProjectEntities()
      showToast({
        severity: 'success',
        summary:
          mode === 'edit'
            ? t('toast.updatedSummary', 'Entity type updated')
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
    const current = attribute.linkageConfig?.[key] ?? []
    const next = checked
      ? Array.from(new Set([...current, value]))
      : current.filter((item) => item !== value)
    updateAttribute(attribute.key, {
      linkageConfig: {
        ...(attribute.linkageConfig ?? defaultLinkageConfig(attribute.type)),
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
        ...(attribute.linkageConfig ?? defaultLinkageConfig(attribute.type)),
        ...patch
      }
    })
  }

  const updatePprlConfig = (
    attribute: BuilderAttribute,
    patch: NonNullable<LinkageConfig['pprl']>
  ) => {
    const config =
      attribute.linkageConfig ?? defaultLinkageConfig(attribute.type)
    updateAttribute(attribute.key, {
      linkageConfig: { ...config, pprl: { ...(config.pprl ?? {}), ...patch } }
    })
  }

  const renderLinkageConfig = (attribute: BuilderAttribute) => {
    if (!attribute.linkage) return null
    const config =
      attribute.linkageConfig ?? defaultLinkageConfig(attribute.type)
    const pprl = config.pprl ?? defaultLinkageConfig(attribute.type).pprl ?? {}
    const privacyMode = config.privacyMode ?? 'pprl'
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
              {t('linkageConfig.title')}
            </span>
            <span className="mt-1 block text-sm font-normal text-gray-600 dark:text-gray-300">
              {t('linkageConfig.description')}
            </span>
          </span>
          {isCollapsed ? (
            <ChevronRightIcon className="h-5 w-5 flex-none text-color-blue dark:text-blue-100" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 flex-none text-color-blue dark:text-blue-100" />
          )}
        </button>
        {isCollapsed ? null : (
          <div className="px-4 pb-4">
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <DropdownWithInfo
                id={`privacy-${attribute.key}`}
                label={t('linkageConfig.privacyMode')}
                value={privacyMode}
                info={t('linkageConfigHelp.privacyMode')}
                disabled={locked}
                options={[
                  { label: 'PPRL', value: 'pprl' },
                  { label: t('linkageConfig.plain'), value: 'plain' }
                ]}
                onChange={(value) =>
                  updateLinkageConfig(attribute, {
                    privacyMode: value as PrivacyMode
                  })
                }
              />
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
            </div>
            <div
              className={`mt-4 grid gap-4 ${privacyMode === 'pprl' ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}
            >
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
              {privacyMode !== 'pprl' && (
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
              )}
            </div>
            {privacyMode === 'pprl' && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-white p-3 dark:border-blue-900 dark:bg-slate-950">
                <h5 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                  {t('linkageConfig.pprlSettings')}
                </h5>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <DropdownWithInfo
                    id={`pprl-method-${attribute.key}`}
                    label={t('linkageConfig.pprlMethod')}
                    value={pprl.method ?? 'ngramBloomFilter'}
                    info={t('linkageConfigHelp.pprlMethod')}
                    disabled={locked}
                    options={pprlMethodOptions}
                    onChange={(value) =>
                      updatePprlConfig(attribute, {
                        method: value as PprlMethod
                      })
                    }
                  />
                  {(pprl.method ?? 'ngramBloomFilter') ===
                    'ngramBloomFilter' && (
                    <>
                      <NumberInput
                        id={`n-${attribute.key}`}
                        value={pprl.n ?? 2}
                        label={t('linkageConfig.ngramSize')}
                        info={t('linkageConfigHelp.ngramSize')}
                        disabled={locked}
                        onChange={(value) =>
                          updatePprlConfig(attribute, { n: value })
                        }
                      />
                      <NumberInput
                        id={`length-${attribute.key}`}
                        value={pprl.length ?? 1024}
                        label={t('linkageConfig.bloomLength')}
                        info={t('linkageConfigHelp.bloomLength')}
                        disabled={locked}
                        onChange={(value) =>
                          updatePprlConfig(attribute, { length: value })
                        }
                      />
                      <NumberInput
                        id={`hash-${attribute.key}`}
                        value={pprl.hashPositions ?? 10}
                        label={t('linkageConfig.hashPositions')}
                        info={t('linkageConfigHelp.hashPositions')}
                        disabled={locked}
                        onChange={(value) =>
                          updatePprlConfig(attribute, { hashPositions: value })
                        }
                      />
                      <NumberInput
                        id={`band-${attribute.key}`}
                        value={pprl.bandSize ?? 32}
                        label={t('linkageConfig.bandSize')}
                        info={t('linkageConfigHelp.bandSize')}
                        disabled={locked}
                        onChange={(value) =>
                          updatePprlConfig(attribute, { bandSize: value })
                        }
                      />
                    </>
                  )}
                </div>
              </div>
            )}
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
    const showBeforeDropLine =
      dropIndicator?.targetKey === attribute.key &&
      dropIndicator.position === 'before'
    const showInsideDropLine =
      dropIndicator?.targetKey === attribute.key &&
      dropIndicator.position === 'inside'
    const showAfterDropLine =
      dropIndicator?.targetKey === attribute.key &&
      dropIndicator.position === 'after'
    const locked = Boolean(attribute.locked)

    return (
      <div key={attribute.key} className="space-y-2">
        {showBeforeDropLine && (
          <div className="h-1 rounded-full bg-color-blue shadow-[0_0_0_3px_rgba(37,99,235,0.18)]" />
        )}
        <div
          draggable={!locked}
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
          className={`rounded-xl border border-gray-200 bg-gray-50 p-4 transition dark:border-slate-700 dark:bg-slate-900 ${depth ? 'ml-4' : ''} ${locked ? 'bg-gray-100 opacity-80 dark:bg-slate-800' : ''} ${draggedAttributeKey === attribute.key ? 'opacity-60' : ''} ${showInsideDropLine ? 'ring-2 ring-color-blue ring-offset-2 ring-offset-white dark:ring-offset-slate-900' : ''}`}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="inline-flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
              <ArrowsUpDownIcon
                className={`h-4 w-4 ${locked ? 'cursor-not-allowed text-gray-300' : 'cursor-move text-gray-400'}`}
              />
              {preferredLabel(
                attribute,
                i18n.resolvedLanguage ?? i18n.language
              ) ||
                (isGroup
                  ? t('newGroup', 'New section')
                  : t('newAttribute', 'New attribute'))}
            </h3>
            {locked ? (
              <span className="rounded-full bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 dark:bg-slate-700 dark:text-gray-300">
                {t('baseTypeAttributeLocked', 'Base type attribute')}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => removeAttribute(attribute.key)}
                className="text-red-600 hover:text-red-800"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <FloatingTextInput
              id={`attribute-name-${attribute.key}`}
              label={t(
                'systemAttributeIdentifier',
                'System attribute identifier'
              )}
              value={attribute.name}
              placeholder={t(
                'systemAttributeIdentifierPlaceholder',
                'e.g. familyName'
              )}
              info={t(
                'systemAttributeIdentifierHelp',
                'This identifier is used internally to build and reference the attribute in JSON. Use PascalCase, camelCase, or snake_case without spaces or special characters.'
              )}
              error={
                attribute.name.trim() &&
                !isValidSystemIdentifier(attribute.name)
                  ? t(
                      'systemAttributeIdentifierInvalid',
                      'Use PascalCase, camelCase, or snake_case. Start with a letter and use only letters, numbers, and underscores.'
                    )
                  : undefined
              }
              onChange={(value) => handleAttributeNameChange(attribute, value)}
              disabled={locked}
            />
            {isGroup ? (
              <div className="relative flex h-[44px] items-center rounded-lg border border-gray-200 bg-gray-100 px-3 text-gray-500 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300">
                <span>{t('sectionType', 'Section')}</span>
              </div>
            ) : (
              <CustomDropdown
                id={`type-${attribute.key}`}
                value={attribute.type ?? ''}
                onChange={(e) =>
                  updateAttribute(attribute.key, {
                    type: e.value,
                    linkageConfig: attribute.linkage
                      ? defaultLinkageConfig(e.value)
                      : attribute.linkageConfig
                  })
                }
                options={typeOptions}
                placeholder={t('attributeType', 'Attribute type')}
                disabled={locked}
              />
            )}
            <div className="md:col-span-2">
              <LabelListEditor
                labels={attribute.labels ?? {}}
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
                  onChange={(e) =>
                    updateAttribute(attribute.key, {
                      repeatable: e.target.checked
                    })
                  }
                />
                {t('attribute.repeatable')}
              </label>
            ) : (
              <AttributeOptions
                attribute={attribute}
                locked={locked}
                advanced={Boolean(advancedOptionKeys[attribute.key])}
                projectScope={scope === 'project'}
                onToggleAdvanced={() =>
                  setAdvancedOptionKeys((current) => ({
                    ...current,
                    [attribute.key]: !current[attribute.key]
                  }))
                }
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
            <input
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-slate-700 dark:bg-slate-950 dark:text-gray-100 dark:disabled:bg-slate-800 dark:disabled:text-gray-400"
              value={(attribute.values ?? []).join(', ')}
              placeholder={t('dropdownValuesCommaSeparated')}
              disabled={locked}
              onChange={(e) =>
                updateAttribute(attribute.key, {
                  values: e.target.value.split(',').map((v) => v.trim())
                })
              }
            />
          )}
          {!isGroup &&
            (scope !== 'project' ||
              Boolean(advancedOptionKeys[attribute.key])) &&
            renderLinkageConfig(attribute)}

          {isGroup && (
            <div
              className={`mt-4 space-y-4 border-l pl-4 transition ${showInsideDropLine ? 'border-color-blue bg-blue-50/50 dark:bg-blue-950/20' : 'border-gray-200 dark:border-slate-700'}`}
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

      <Panel
        title={
          embedded || readOnly
            ? t('basicSettings', 'Basic settings')
            : mode === 'edit'
              ? t('editEntityType', 'Edit entity type')
              : saveTarget === 'base'
                ? t('createBaseType', 'Create base type')
                : t('entityBuilder:createEntityType', 'Create entity type')
        }
        className="!w-full"
        noMaxWidth
      >
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          <CustomFloatLabel
            id="entityTypeName"
            value={entityName}
            placeholder={t('entityName', 'Entity name')}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setEntityName(e.target.value)
            }
            disabled={readOnly}
            required
          />

          {saveTarget === 'project' && (
            <CustomDropdown
              id="baseType"
              value={selectedBaseType}
              onChange={(e) => setSelectedBaseType(e.value)}
              options={baseTypeOptions}
              disabled={readOnly}
              placeholder={t('baseType', 'Base type')}
              required
            />
          )}

          {saveTarget === 'project' && (
            <div className="md:col-span-2">
              <GroupSearchInput
                id="associatedGroupName"
                value={associatedGroupName}
                label={t('associatedGroupName')}
                placeholder={t('associatedGroupNamePlaceholder')}
                info={t(
                  'associatedGroupNameHelp',
                  'The associated group/domain controls where pseudonyms for entities of this type are created and which domain permissions apply. Only groups you are allowed to read are offered in the search results.'
                )}
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
                <p className="mt-2 text-sm text-amber-700">
                  {t('noBaseTypesHint')}
                </p>
              )}
            </div>
          )}
        </div>
      </Panel>

      <Panel
        title={t('entityBuilder:visualPreview')}
        className="!w-full"
        noMaxWidth
      >
        {!readOnly && (
          <div className="mt-7 mb-4 flex flex-wrap gap-2">
            <PrimaryOutlinedButton
              label={
                <span className="inline-flex items-center gap-2">
                  <PlusIcon className="h-4 w-4" />
                  {t('addCustomAttribute')}
                </span>
              }
              onClick={() => addAttribute()}
            />
          </div>
        )}

        {attributes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-300">
            {t('noAttributesHint')}
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {attributes.map((attribute) => renderAttributeEditor(attribute))}
            </div>
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
                    onClick={() => addAttribute()}
                  />
                </div>
              </div>
            )}
          </>
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
  maxLength
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
}) {
  return (
    <div>
      <div className="relative">
        <input
          id={id}
          className={`h-[44px] w-full rounded-lg border px-3 ${info ? 'pr-10' : ''} text-base disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:bg-slate-950 dark:text-gray-100 dark:disabled:bg-slate-800 dark:disabled:text-gray-400 ${error ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-slate-700'}`}
          disabled={disabled}
          value={value}
          maxLength={maxLength}
          placeholder={placeholder ?? ''}
          onFocus={onFocus}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
        />
        <label
          htmlFor={id}
          className="absolute -top-2 left-3 bg-white px-1 text-sm text-gray-500 dark:bg-slate-950 dark:text-gray-300"
        >
          {label}
        </label>
        {info && <FieldInfo title={info} />}
      </div>
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

function InputWithInfo({
  id,
  label,
  value,
  onChange,
  info,
  placeholder,
  type = 'text',
  step,
  disabled = false
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
}) {
  return (
    <div className="relative">
      <input
        id={id}
        className="h-[44px] w-full rounded-lg border border-gray-300 px-3 pr-10 text-base disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-slate-700 dark:bg-slate-950 dark:text-gray-100 dark:disabled:bg-slate-800 dark:disabled:text-gray-400"
        disabled={disabled}
        type={type}
        step={step}
        value={value}
        placeholder={placeholder ?? ''}
        onChange={(event) => onChange(event.target.value)}
      />
      <label
        htmlFor={id}
        className="absolute -top-2 left-3 bg-white px-1 text-sm text-gray-500 dark:bg-slate-950 dark:text-gray-300"
      >
        {label}
      </label>
      <FieldInfo title={info} />
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
  disabled = false
}: {
  id: string
  label: string
  value: string
  options: { label: string; value: string }[]
  onChange: (value: string) => void
  info: string
  disabled?: boolean
}) {
  return (
    <div className="td-dropdown-with-info relative">
      <CustomDropdown
        id={id}
        value={value}
        onChange={(event) => onChange(event.value)}
        options={options}
        placeholder={label}
        disabled={disabled}
      />
      <span
        title={info}
        className="td-dropdown-with-info__icon pointer-events-auto absolute top-1/2 z-20 -translate-y-1/2 text-gray-500 hover:text-color-blue dark:text-gray-300 dark:hover:text-blue-200"
      >
        <InformationCircleIcon className="h-5 w-5" />
      </span>
    </div>
  )
}

function GroupSearchInput({
  id,
  value,
  label,
  placeholder,
  info,
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
  options: { label: string; value: string }[]
  loading?: boolean
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const { t } = useTranslation(['entityBuilder'])
  const [open, setOpen] = useState(false)
  const visibleOptions = options.slice(0, 12)
  const shouldShowMenu =
    open && (loading || visibleOptions.length > 0 || Boolean(value.trim()))

  return (
    <div className="relative">
      <div className="relative">
        <input
          id={id}
          className={`h-[44px] w-full rounded-lg border border-gray-300 px-3 ${info ? 'pr-10' : ''} text-base disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-slate-700 dark:bg-slate-950 dark:text-gray-100 dark:disabled:bg-slate-800 dark:disabled:text-gray-400`}
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
        <label
          htmlFor={id}
          className="absolute -top-2 left-3 bg-white px-1 text-sm text-gray-500 dark:bg-slate-950 dark:text-gray-300"
        >
          {label}
        </label>
        {info && <FieldInfo title={info} />}
      </div>
      {shouldShowMenu && (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-300">
              {t('searchingGroups')}
            </div>
          ) : visibleOptions.length > 0 ? (
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
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-300">
              {t('noMatchingGroups')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AttributeOptions({
  attribute,
  locked,
  advanced,
  projectScope,
  onToggleAdvanced,
  onToggle
}: {
  attribute: BuilderAttribute
  locked: boolean
  advanced: boolean
  projectScope: boolean
  onToggleAdvanced: () => void
  onToggle: (
    flag: 'required' | 'linkage' | 'repeatable',
    checked: boolean
  ) => void
}) {
  const { t } = useTranslation(['entityBuilder'])
  const renderFlag = (flag: 'required' | 'linkage' | 'repeatable') => (
    <label key={flag} className="inline-flex items-center gap-2">
      <input
        type="checkbox"
        checked={Boolean(attribute[flag])}
        disabled={locked}
        onChange={(event) => onToggle(flag, event.target.checked)}
      />
      <span className="inline-flex items-center gap-1.5">
        {t(`attribute.${flag}`, flag.charAt(0).toUpperCase() + flag.slice(1))}
        <InfoIcon title={t(`attributeHelp.${flag}`, '')} />
      </span>
    </label>
  )

  if (!projectScope) {
    return (
      <div className="flex flex-wrap gap-4">
        {(['required', 'linkage', 'repeatable'] as const).map(renderFlag)}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4">
        {(['required', 'repeatable'] as const).map(renderFlag)}
        <button
          type="button"
          className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 hover:border-color-blue hover:text-color-blue dark:border-slate-700 dark:text-gray-300 dark:hover:border-blue-300 dark:hover:text-blue-200"
          onClick={onToggleAdvanced}
        >
          {advanced
            ? t('advancedOptions.hide', 'Hide advanced options')
            : t('advancedOptions.show', 'Show advanced options')}
        </button>
      </div>
      {advanced && (
        <div className="flex flex-wrap gap-4">{renderFlag('linkage')}</div>
      )}
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
  const { t, i18n } = useTranslation(['entityBuilder'])
  const languageOptions = useMemo(() => {
    const uiLanguage = (i18n.resolvedLanguage ?? i18n.language ?? 'en')
      .toLowerCase()
      .split('-')[0]
    const DisplayNames = (Intl as unknown as {
      DisplayNames?: new (
        locales: string[],
        options: { type: 'language' }
      ) => { of: (code: string) => string | undefined }
    }).DisplayNames
    const displayNames = DisplayNames
      ? new DisplayNames([uiLanguage], { type: 'language' })
      : null

    return ISO_639_1_LANGUAGE_CODES.map((code) => {
      const displayName = displayNames?.of(code) ?? code.toUpperCase()
      const label = displayName.charAt(0).toUpperCase() + displayName.slice(1)
      return { label, value: code }
    }).sort((a, b) => a.label.localeCompare(b.label))
  }, [i18n.language, i18n.resolvedLanguage])
  const entries = Object.entries(
    labels.en === undefined ? { en: '', ...labels } : labels
  )
  const firstAvailableLanguage =
    languageOptions.find((option) => !labels[option.value])?.value ??
    languageOptions[0]?.value ??
    'en'

  const updateCode = (oldCode: string, newCode: string) => {
    if (oldCode === newCode) return
    const next: LabelMap = {}
    Object.entries(labels).forEach(([code, label]) => {
      if (code === oldCode) next[newCode] = label
      else next[code] = label
    })
    onChange(next)
  }

  const updateLabel = (code: string, label: string) => {
    onChange({ ...labels, [code]: label.slice(0, 80) })
  }

  const removeLabel = (code: string) => {
    const next = { ...labels }
    delete next[code]
    onChange(next)
  }

  const addLabel = () => {
    if (disabled) return
    onChange({ ...labels, [firstAvailableLanguage]: '' })
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-100">
        {t('attributeLabels', 'Attribute labels')}
      </span>
      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-300">
          {t(
            'noLabelsHint',
            'Add at least an English label for this attribute.'
          )}
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {entries.map(([code, label]) => (
            <div
              key={code}
              className="grid gap-2 md:grid-cols-[12rem_1fr_auto]"
            >
              <select
                className="h-[44px] rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-slate-700 dark:bg-slate-950 dark:text-gray-100 dark:disabled:bg-slate-800 dark:disabled:text-gray-400"
                value={code}
                disabled={disabled || code === 'en'}
                onChange={(event) => updateCode(code, event.target.value)}
              >
                {languageOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={
                      option.value !== code && Boolean(labels[option.value])
                    }
                  >
                    {option.label} ({option.value.toUpperCase()})
                  </option>
                ))}
              </select>
              <FloatingTextInput
                id={`label-${code}`}
                label={
                  code === 'en'
                    ? t('labelTextRequired', 'Label text *')
                    : t('labelText', 'Label text')
                }
                value={label}
                placeholder={t(
                  'labelTextPlaceholder',
                  'Enter a readable label'
                )}
                maxLength={80}
                disabled={disabled}
                onChange={(value) => updateLabel(code, value)}
              />
              <button
                type="button"
                className="inline-flex h-[44px] items-center justify-center rounded-lg border border-red-200 px-3 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
                disabled={disabled || code === 'en'}
                title={
                  code === 'en'
                    ? t('englishLabelRequired', 'English label is required')
                    : undefined
                }
                onClick={() => removeLabel(code)}
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 flex justify-center">
        <PrimaryOutlinedButton
          label={
            <span className="inline-flex items-center gap-2">
              <PlusIcon className="h-4 w-4" />
              {t('addLabel', 'Add label')}
            </span>
          }
          onClick={addLabel}
          disabled={disabled || entries.length >= languageOptions.length}
        />
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
  disabled = false
}: {
  id: string
  value: number
  label: string
  info: string
  onChange: (value: number) => void
  disabled?: boolean
}) {
  return (
    <InputWithInfo
      id={id}
      label={label}
      info={info}
      type="number"
      value={String(value)}
      disabled={disabled}
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
    domainExact: 'Exact domain value'
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
