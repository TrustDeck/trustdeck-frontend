import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeftIcon,
  ArrowPathRoundedSquareIcon,
  ArrowsUpDownIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  InformationCircleIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { Dialog } from 'primereact/dialog'
import Panel from '../../core/components/common/Panel'
import CustomFloatLabel from '@component/form/CustomFloatLabel'
import CustomDropdown from '../../core/components/form/CustomDropdown'
import PrimaryButton from '@component/form/buttons/PrimaryButton'
import PrimaryOutlinedButton from '@component/form/buttons/PrimaryOutlinedButton'
import TrustDeck from '../../core/services/TrustDeck'
import useToastStore from '../../core/stores/ToastStore'
import useProjectStore from '../../core/stores/ProjectStore'
import { LABEL_ALPHA2_CODE_OPTIONS } from './labelAlpha2CodeOptions'
import {
  algorithmOptions,
  defaultAlphabetForAlgorithm
} from '../groups/utils/algorithmOptions'
import {
  alphabetOptions,
  characters,
  CUSTOM_ALPHABET_VALUE,
  getAlphabetKeyByCharacters
} from '../groups/utils/alphabetOptions'
import type { Domain } from '../../core/types/Domain'

type LayoutValue = 'row' | 'col' | 'group'
type PrivacyMode = 'plain' | 'pprl'
type PprlMethod = 'ngramBloomFilter' | 'hmacExact'
type DropIndicator = {
  targetKey: string
  position: 'before' | 'after' | 'inside'
} | null

type LabelMap = Record<string, string>

type NewGroupDraft = {
  name: string
  parentGroupName: string
  prefix: string
  pseudonymLength: string
  algorithm: string
  alphabet: string
  customAlphabetCharacters: string
  randomAlgorithmDesiredSize: string
  randomAlgorithmDesiredSuccessProbability: string
  consecutiveValueCounter: string
  paddingCharacter: string
  multiplePsnAllowed: boolean
  addCheckDigit: boolean
  lengthIncludesCheckDigit: boolean
  validFrom: string
  validTo: string
  validityTime: string
  enforceStartDateValidity: boolean
  enforceEndDateValidity: boolean
  salt: string
  saltLength: string
  description: string
}

const defaultNewGroupDraft = (): NewGroupDraft => ({
  name: '',
  parentGroupName: '',
  prefix: '',
  pseudonymLength: '8',
  algorithm: 'RANDOM_LET',
  alphabet: 'LETTERS_ONLY_ALPHABET',
  customAlphabetCharacters: '',
  randomAlgorithmDesiredSize: '',
  randomAlgorithmDesiredSuccessProbability: '',
  consecutiveValueCounter: '1',
  paddingCharacter: '0',
  multiplePsnAllowed: false,
  addCheckDigit: false,
  lengthIncludesCheckDigit: false,
  validFrom: '',
  validTo: '',
  validityTime: '',
  enforceStartDateValidity: false,
  enforceEndDateValidity: false,
  salt: '',
  saltLength: BACKEND_DEFAULT_SALT_LENGTH,
  description: ''
})

const SYSTEM_IDENTIFIER_PATTERN = /^[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)*$/
const BACKEND_DEFAULT_SALT_LENGTH = '32'

function isConsecutiveAlgorithm(algorithm?: string) {
  return algorithm?.trim().toUpperCase() === 'CONSECUTIVE'
}

function formatIntegerForLocale(locale: string | undefined, value: number) {
  return new Intl.NumberFormat(locale || undefined, { maximumFractionDigits: 0 }).format(value)
}

function formatIntegerInputForLocale(locale: string | undefined, value: string) {
  const digits = value.replace(/[^0-9]/g, '')
  if (!digits) return ''

  try {
    return new Intl.NumberFormat(locale || undefined, {
      maximumFractionDigits: 0,
      useGrouping: true
    }).format(BigInt(digits))
  } catch {
    return new Intl.NumberFormat(locale || undefined, {
      maximumFractionDigits: 0,
      useGrouping: true
    }).format(Number(digits))
  }
}

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

function formatDecimalForLocale(locale: string | undefined, value: number) {
  return new Intl.NumberFormat(locale || undefined, {
    minimumFractionDigits: 8,
    maximumFractionDigits: 8
  }).format(value)
}

function parseLocalizedDecimal(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return Number.NaN
  const normalized = trimmed
    .replace(/\s/g, '')
    .replace(/(?<=\d)[.,](?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.')
  return Number(normalized)
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

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
  const [allGroupOptions, setAllGroupOptions] = useState<
    { label: string; value: string }[]
  >([])
  const [groupSearchLoading, setGroupSearchLoading] = useState(false)
  const [attributes, setAttributes] = useState<BuilderAttribute[]>([])
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
  const [advancedOptionKeys, setAdvancedOptionKeys] = useState<
    Record<string, boolean>
  >({})
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  const [showGroupAdvanced, setShowGroupAdvanced] = useState(false)
  const [newGroupDraft, setNewGroupDraft] = useState<NewGroupDraft>(
    defaultNewGroupDraft
  )
  const [newGroupParentOptions, setNewGroupParentOptions] = useState<
    { label: string; value: string }[]
  >([])
  const [newGroupInheritedFields, setNewGroupInheritedFields] = useState<string[]>([])
  const [creatingGroup, setCreatingGroup] = useState(false)
  const desiredPoolSizePlaceholder = useMemo(
    () => formatIntegerForLocale(i18n.language, 1000000),
    [i18n.language]
  )
  const desiredSuccessProbabilityPlaceholder = useMemo(
    () => formatDecimalForLocale(i18n.language, 0.99999998),
    [i18n.language]
  )


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
        setGroupOptions(filterGroupOptions(options, associatedGroupName))
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
      const localMatches = filterGroupOptions(allGroupOptions, associatedGroupName)
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
    setNewGroupDraft((current) => {
      const formattedDesiredSize = formatIntegerInputForLocale(
        i18n.language,
        current.randomAlgorithmDesiredSize
      )
      if (formattedDesiredSize === current.randomAlgorithmDesiredSize) return current
      return {
        ...current,
        randomAlgorithmDesiredSize: formattedDesiredSize
      }
    })
  }, [i18n.language])

  const updateNewGroupDraft = (patch: Partial<NewGroupDraft>) => {
    setNewGroupDraft((current) => ({ ...current, ...patch }))
    const touched = Object.keys(patch).filter((key) => key !== 'parentGroupName')
    if (touched.length > 0) {
      setNewGroupInheritedFields((current) =>
        current.filter((key) => !touched.includes(key))
      )
    }
  }

  const applyParentGroupDefaults = async (parentGroupName: string) => {
    if (!parentGroupName) {
      setNewGroupInheritedFields([])
      updateNewGroupDraft({ parentGroupName: '' })
      return
    }

    try {
      const parent = (await TrustDeck.instance().getDomain(parentGroupName)) as Domain
      const alphabetKey = getAlphabetKeyByCharacters(parent.alphabet)
      const inheritedPatch: Partial<NewGroupDraft> = {
        parentGroupName,
        pseudonymLength:
          parent.pseudonymLength !== undefined && parent.pseudonymLength !== null
            ? String(parent.pseudonymLength)
            : '',
        algorithm: parent.algorithm ?? 'RANDOM_LET',
        alphabet: alphabetKey ?? CUSTOM_ALPHABET_VALUE,
        customAlphabetCharacters: alphabetKey === null ? parent.alphabet ?? '' : '',
        randomAlgorithmDesiredSize:
          parent.randomAlgorithmDesiredSize !== undefined && parent.randomAlgorithmDesiredSize !== null
            ? formatIntegerInputForLocale(
                i18n.language,
                String(parent.randomAlgorithmDesiredSize)
              )
            : '',
        randomAlgorithmDesiredSuccessProbability:
          parent.randomAlgorithmDesiredSuccessProbability !== undefined && parent.randomAlgorithmDesiredSuccessProbability !== null
            ? String(parent.randomAlgorithmDesiredSuccessProbability)
            : '',
        paddingCharacter: parent.paddingCharacter ?? '0',
        multiplePsnAllowed: Boolean(parent.multiplePsnAllowed),
        addCheckDigit: Boolean(parent.addCheckDigit),
        lengthIncludesCheckDigit: Boolean(parent.lengthIncludesCheckDigit),
        validFrom: toDateTimeLocal(parent.validFrom),
        validTo: toDateTimeLocal(parent.validTo),
        enforceStartDateValidity: Boolean(parent.enforceStartDateValidity),
        enforceEndDateValidity: Boolean(parent.enforceEndDateValidity)
      }
      setNewGroupDraft((current) => ({ ...current, ...inheritedPatch }))
      setNewGroupInheritedFields([
        'pseudonymLength',
        'algorithm',
        'alphabet',
        ...(alphabetKey === null ? ['customAlphabetCharacters'] : []),
        'randomAlgorithmDesiredSize',
        'randomAlgorithmDesiredSuccessProbability',
        'paddingCharacter',
        'multiplePsnAllowed',
        'addCheckDigit',
        'lengthIncludesCheckDigit',
        'validFrom',
        'validTo',
        'enforceStartDateValidity',
        'enforceEndDateValidity'
      ])
    } catch {
      setNewGroupDraft((current) => ({ ...current, parentGroupName }))
      setNewGroupInheritedFields([])
    }
  }

  const openCreateGroupModal = async () => {
    const typedName = associatedGroupName.trim()
    setShowGroupAdvanced(false)
    setNewGroupInheritedFields([])
    setNewGroupDraft({
      ...defaultNewGroupDraft(),
      name: typedName,
      prefix: typedName ? `${typedName.toUpperCase().slice(0, 8)}-` : ''
    })
    setShowCreateGroupModal(true)
    setNewGroupParentOptions(await loadAllGroupOptions(groupOptions))
  }

  const createNewGroup = async () => {
    const name = newGroupDraft.name.trim()
    const prefix = newGroupDraft.prefix.trim()
    const pseudonymLength = Number(newGroupDraft.pseudonymLength)
    const randomAlgorithmDesiredSize = newGroupDraft.randomAlgorithmDesiredSize.trim()
      ? Number(newGroupDraft.randomAlgorithmDesiredSize.replace(/[^0-9]/g, ''))
      : Number.NaN
    const randomAlgorithmDesiredSuccessProbability = parseLocalizedDecimal(
      newGroupDraft.randomAlgorithmDesiredSuccessProbability
    )
    const consecutiveValueCounter = isConsecutiveAlgorithm(newGroupDraft.algorithm)
      ? Number(newGroupDraft.consecutiveValueCounter)
      : 1
    const saltLength = Number(newGroupDraft.saltLength || BACKEND_DEFAULT_SALT_LENGTH)
    const isCustomAlphabet = newGroupDraft.alphabet === CUSTOM_ALPHABET_VALUE
    const selectedAlphabet = isCustomAlphabet
      ? newGroupDraft.customAlphabetCharacters.trim()
      : characters[newGroupDraft.alphabet] ?? newGroupDraft.alphabet

    if (
      !name ||
      !prefix ||
      !Number.isFinite(pseudonymLength) ||
      pseudonymLength < 4
    ) {
      showToast({
        severity: 'error',
        summary: t('groupCreate.validationSummary', 'Missing group settings'),
        detail: t(
          'groupCreate.validationDetail',
          'Enter a group name, a pseudonym prefix, and a pseudonym length of at least 4.'
        ),
        life: 4000
      })
      return
    }

    if (isCustomAlphabet && !selectedAlphabet) {
      showToast({
        severity: 'error',
        summary: t('groupCreate.validationSummary', 'Missing group settings'),
        detail: t(
          'groupCreate.customAlphabetRequired',
          'Enter the characters that are allowed in the custom alphabet.'
        ),
        life: 4000
      })
      return
    }

    if (selectedAlphabet.includes(';')) {
      showToast({
        severity: 'error',
        summary: t('groupCreate.validationSummary', 'Missing group settings'),
        detail: t(
          'groupCreate.customAlphabetNoSemicolon',
          'The alphabet must not contain a semicolon.'
        ),
        life: 4000
      })
      return
    }

    if (newGroupDraft.addCheckDigit && selectedAlphabet.length % 2 !== 0) {
      showToast({
        severity: 'error',
        summary: t('groupCreate.validationSummary', 'Missing group settings'),
        detail: t(
          'groupCreate.checkDigitAlphabetEven',
          'When check digits are enabled, the alphabet must contain an even number of characters.'
        ),
        life: 4000
      })
      return
    }

    const optionalString = (value: string) => {
      const trimmed = value.trim()
      return trimmed ? trimmed : undefined
    }
    const optionalNumber = (value: number) =>
      Number.isFinite(value) ? value : undefined

    setCreatingGroup(true)
    try {
      const createGroupPayload: Record<string, unknown> = {
        name,
        ...(newGroupDraft.parentGroupName
          ? { superDomainName: newGroupDraft.parentGroupName }
          : {}),
        prefix,
        description: newGroupDraft.description,
        consecutiveValueCounter: optionalNumber(consecutiveValueCounter),
        salt: optionalString(newGroupDraft.salt),
        saltLength: optionalNumber(saltLength)
      }

      const addIfNotInherited = (
        draftField: keyof NewGroupDraft,
        payloadField: string,
        value: unknown
      ) => {
        if (!newGroupInheritedFields.includes(draftField) && value !== undefined) {
          createGroupPayload[payloadField] = value
        }
      }

      addIfNotInherited('multiplePsnAllowed', 'multiplePsnAllowed', newGroupDraft.multiplePsnAllowed)
      addIfNotInherited('paddingCharacter', 'paddingCharacter', newGroupDraft.paddingCharacter.slice(0, 1))
      addIfNotInherited('pseudonymLength', 'pseudonymLength', pseudonymLength)
      addIfNotInherited('randomAlgorithmDesiredSize', 'randomAlgorithmDesiredSize', optionalNumber(randomAlgorithmDesiredSize))
      addIfNotInherited(
        'randomAlgorithmDesiredSuccessProbability',
        'randomAlgorithmDesiredSuccessProbability',
        optionalNumber(randomAlgorithmDesiredSuccessProbability)
      )
      addIfNotInherited('addCheckDigit', 'addCheckDigit', newGroupDraft.addCheckDigit)
      addIfNotInherited('lengthIncludesCheckDigit', 'lengthIncludesCheckDigit', newGroupDraft.lengthIncludesCheckDigit)
      addIfNotInherited('validFrom', 'validFrom', optionalString(newGroupDraft.validFrom))
      addIfNotInherited('validTo', 'validTo', optionalString(newGroupDraft.validTo))
      addIfNotInherited('validityTime', 'validityTime', optionalString(newGroupDraft.validityTime))
      addIfNotInherited('enforceStartDateValidity', 'enforceStartDateValidity', newGroupDraft.enforceStartDateValidity)
      addIfNotInherited('enforceEndDateValidity', 'enforceEndDateValidity', newGroupDraft.enforceEndDateValidity)
      addIfNotInherited('algorithm', 'algorithm', newGroupDraft.algorithm)
      addIfNotInherited('alphabet', 'alphabet', selectedAlphabet)

      await TrustDeck.instance().createGroupComplete(createGroupPayload)
      setAssociatedGroupName(name)
      setGroupOptions((current) =>
        current.some((option) => option.value === name)
          ? current
          : [...current, { label: name, value: name }].sort((a, b) =>
              a.label.localeCompare(b.label)
            )
      )
      setShowCreateGroupModal(false)
      showToast({
        severity: 'success',
        summary: t('groupCreate.createdSummary', 'Group created'),
        detail: t(
          'groupCreate.createdDetail',
          'The new group was created and assigned to this entity type.'
        ),
        life: 3500
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      showToast({
        severity: 'error',
        summary: t('groupCreate.failedSummary', 'Group creation failed'),
        detail: message,
        life: 7000
      })
    } finally {
      setCreatingGroup(false)
    }
  }

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
                disabled={readOnly}
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
                  'The associated group controls where pseudonyms for entities of this type are created and which group permissions apply. Only groups you are allowed to read are offered in the search results.'
                )}
                options={groupOptions}
                loading={groupSearchLoading}
                disabled={readOnly}
                onChange={setAssociatedGroupName}
                onCreateGroup={openCreateGroupModal}
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
          <div className="mt-7 mb-4 flex flex-wrap justify-center gap-2">
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
        <Dialog
          visible={showCreateGroupModal}
          onHide={() => {
            setShowCreateGroupModal(false)
            setShowGroupAdvanced(false)
          }}
          header={t('groupCreate.title', 'Create new group')}
          modal
          className="w-full md:w-3/4 xl:w-1/2"
          footer={
            <div className="flex justify-end gap-2">
              <PrimaryOutlinedButton
                label={t('common:cancel', 'Cancel')}
                onClick={() => setShowCreateGroupModal(false)}
              />
              <PrimaryButton
                label={
                  creatingGroup
                    ? t('common:loading', 'Loading...')
                    : t('groupCreate.createButton', 'Create and assign group')
                }
                loading={creatingGroup}
                onClick={createNewGroup}
              />
            </div>
          }
        >
          <div className="mt-2 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t(
                'groupCreate.description',
                'Create a new group and assign it to this entity type. The group settings define how pseudonyms are generated.'
              )}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <CustomFloatLabel
                id="newGroupName"
                value={newGroupDraft.name}
                placeholder={t('groupCreate.name', 'Group name')}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  updateNewGroupDraft({ name: event.target.value })
                }
                required
              />
              <CustomFloatLabel
                id="newGroupPrefix"
                value={newGroupDraft.prefix}
                placeholder={t('groupCreate.prefix', 'Pseudonym prefix')}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  updateNewGroupDraft({ prefix: event.target.value })
                }
                required
              />
              <div className="md:col-span-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-600 hover:border-color-blue hover:text-color-blue dark:border-slate-700 dark:text-gray-300 dark:hover:border-blue-300 dark:hover:text-blue-200"
                  onClick={() => setShowGroupAdvanced((current) => !current)}
                >
                  {showGroupAdvanced ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}
                  {showGroupAdvanced
                    ? t('groupCreate.advancedHide', 'Hide advanced configuration')
                    : t('groupCreate.advancedShow', 'Show advanced configuration')}
                </button>
              </div>
              {showGroupAdvanced && (
                <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
                  <DropdownWithInfo
                    id="newGroupParent"
                    value={newGroupDraft.parentGroupName}
                    options={[
                      {
                        label: t('groupCreate.noParent', 'No parent group'),
                        value: ''
                      },
                      ...newGroupParentOptions.filter(
                        (option) =>
                          option.value !== newGroupDraft.name.trim() &&
                          option.value !== ''
                      )
                    ]}
                    label={t('groupCreate.parentGroup', 'Parent group')}
                    info={t(
                      'groupCreateHelp.parentGroup',
                      'Optional parent group. Leave empty to create a top-level group.'
                    )}
                    onChange={(value) => {
                      void applyParentGroupDefaults(value)
                    }}
                  />
                  <InputWithInfo
                    id="newGroupLength"
                    value={newGroupDraft.pseudonymLength}
                    inherited={newGroupInheritedFields.includes('pseudonymLength')}
                    label={t('groupCreate.pseudonymLength', 'Pseudonym length')}
                    info={t(
                      'groupCreateHelp.pseudonymLength',
                      'Total length of generated pseudonym values, excluding the prefix unless check digit inclusion is enabled.'
                    )}
                    type="number"
                    onChange={(value) =>
                      updateNewGroupDraft({ pseudonymLength: value })
                    }
                  />
                  <DropdownWithInfo
                    id="newGroupAlgorithm"
                    value={newGroupDraft.algorithm}
                    inherited={newGroupInheritedFields.includes('algorithm')}
                    options={algorithmOptions}
                    label={t('groupCreate.algorithm', 'Algorithm')}
                    info={t(
                      'groupCreateHelp.algorithm',
                      'Algorithm used to generate pseudonym values for this group.'
                    )}
                    onChange={(value) =>
                      updateNewGroupDraft({
                        algorithm: value,
                        alphabet: defaultAlphabetForAlgorithm(value),
                        consecutiveValueCounter: isConsecutiveAlgorithm(value)
                          ? newGroupDraft.consecutiveValueCounter || '1'
                          : '1'
                      })
                    }
                  />
                  <DropdownWithInfo
                    id="newGroupAlphabet"
                    value={newGroupDraft.alphabet}
                    inherited={newGroupInheritedFields.includes('alphabet')}
                    options={alphabetOptions}
                    label={t('groupCreate.alphabet', 'Alphabet')}
                    info={t(
                      'groupCreateHelp.alphabet',
                      'Character set used for generated pseudonyms when the selected algorithm allows configurable alphabets.'
                    )}
                    onChange={(value) =>
                      updateNewGroupDraft({
                        alphabet: value,
                        customAlphabetCharacters:
                          value === CUSTOM_ALPHABET_VALUE
                            ? newGroupDraft.customAlphabetCharacters
                            : ''
                      })
                    }
                  />
                  {newGroupDraft.alphabet === CUSTOM_ALPHABET_VALUE && (
                    <div className="md:col-span-2">
                      <InputWithInfo
                        id="newGroupCustomAlphabet"
                        value={newGroupDraft.customAlphabetCharacters}
                        inherited={newGroupInheritedFields.includes('customAlphabetCharacters')}
                        label={t(
                          'groupCreate.customAlphabetCharacters',
                          'Allowed characters'
                        )}
                        info={t(
                          'groupCreateHelp.customAlphabetCharacters',
                          'Enter every character that may appear in generated pseudonyms. This is a literal character list, not a regular expression, for example abcdefghijklmno1234,.-*+.'
                        )}
                        placeholder={t(
                          'groupCreate.customAlphabetCharactersPlaceholder',
                          'e.g. abcdefghijklmno1234,.-*+'
                        )}
                        onChange={(value) =>
                          updateNewGroupDraft({
                            alphabet: CUSTOM_ALPHABET_VALUE,
                            customAlphabetCharacters: value
                          })
                        }
                      />
                    </div>
                  )}
                  <InputWithInfo
                    id="newGroupDesiredSize"
                    value={newGroupDraft.randomAlgorithmDesiredSize}
                    inherited={newGroupInheritedFields.includes('randomAlgorithmDesiredSize')}
                    label={t(
                      'groupCreate.randomAlgorithmDesiredSize',
                      'Desired pseudonym pool size'
                    )}
                    info={t(
                      'groupCreateHelp.randomAlgorithmDesiredSize',
                      'Expected maximum number of pseudonyms for random generation. This helps evaluate collision risk.'
                    )}
                    placeholder={desiredPoolSizePlaceholder}
                    inputMode="numeric"
                    onChange={(value) =>
                      updateNewGroupDraft({
                        randomAlgorithmDesiredSize: formatIntegerInputForLocale(
                          i18n.language,
                          value
                        )
                      })
                    }
                  />
                  <InputWithInfo
                    id="newGroupDesiredSuccessProbability"
                    value={newGroupDraft.randomAlgorithmDesiredSuccessProbability}
                    inherited={newGroupInheritedFields.includes('randomAlgorithmDesiredSuccessProbability')}
                    label={t(
                      'groupCreate.randomAlgorithmDesiredSuccessProbability',
                      'Desired generation success probability'
                    )}
                    info={t(
                      'groupCreateHelp.randomAlgorithmDesiredSuccessProbability',
                      'Target probability that a random pseudonym can be generated without collision. Use a value between 0 and 1, for example 0.99999998 in English or 0,99999998 in German.'
                    )}
                    placeholder={desiredSuccessProbabilityPlaceholder}
                    inputMode="decimal"
                    onChange={(value) =>
                      updateNewGroupDraft({
                        randomAlgorithmDesiredSuccessProbability: value
                      })
                    }
                  />
                  {isConsecutiveAlgorithm(newGroupDraft.algorithm) && (
                    <InputWithInfo
                      id="newGroupConsecutiveCounter"
                      value={newGroupDraft.consecutiveValueCounter}
                      inherited={newGroupInheritedFields.includes('consecutiveValueCounter')}
                      label={t(
                        'groupCreate.consecutiveValueCounter',
                        'Consecutive start counter'
                      )}
                      info={t(
                        'groupCreateHelp.consecutiveValueCounter',
                        'Starting counter used when the consecutive-number algorithm is selected.'
                      )}
                      type="number"
                      onChange={(value) =>
                        updateNewGroupDraft({ consecutiveValueCounter: value })
                      }
                    />
                  )}
                  <InputWithInfo
                    id="newGroupPadding"
                    value={newGroupDraft.paddingCharacter}
                    inherited={newGroupInheritedFields.includes('paddingCharacter')}
                    label={t('groupCreate.paddingCharacter', 'Padding character')}
                    info={t(
                      'groupCreateHelp.paddingCharacter',
                      'Single character used to pad shorter generated values up to the configured pseudonym length.'
                    )}
                    maxLength={1}
                    onChange={(value) =>
                      updateNewGroupDraft({ paddingCharacter: value.slice(0, 1) })
                    }
                  />
                  <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
                    <InputWithInfo
                      id="newGroupValidFrom"
                      value={newGroupDraft.validFrom}
                      inherited={newGroupInheritedFields.includes('validFrom')}
                      label={t('groupCreate.validFrom', 'Valid from')}
                      info={t(
                        'groupCreateHelp.validFrom',
                        'Optional start date and time for values created in this group. Leave empty to use the backend default or the parent group setting.'
                      )}
                      type="datetime-local"
                      onChange={(value) => updateNewGroupDraft({ validFrom: value })}
                    />
                    <InputWithInfo
                      id="newGroupValidTo"
                      value={newGroupDraft.validTo}
                      inherited={newGroupInheritedFields.includes('validTo')}
                      label={t('groupCreate.validTo', 'Valid to')}
                      info={t(
                        'groupCreateHelp.validTo',
                        'Optional end date and time for values created in this group. Leave empty to use the validity period or the parent group setting.'
                      )}
                      type="datetime-local"
                      onChange={(value) => updateNewGroupDraft({ validTo: value })}
                    />
                  </div>
                  <InputWithInfo
                    id="newGroupValidityTime"
                    value={newGroupDraft.validityTime}
                    inherited={newGroupInheritedFields.includes('validityTime')}
                    label={t('groupCreate.validityTime', 'Validity period')}
                    info={t(
                      'groupCreateHelp.validityTime',
                      'Optional backend validity period used to calculate the end date when no explicit valid-to date is entered. Examples: 3days, 1 day, 50 day, 7w, or 5 y. If a valid-to date is provided, the validity period is ignored.'
                    )}
                    onChange={(value) => updateNewGroupDraft({ validityTime: value })}
                  />
                  <InputWithInfo
                    id="newGroupSaltLength"
                    value={newGroupDraft.saltLength}
                    inherited={newGroupInheritedFields.includes('saltLength')}
                    label={t('groupCreate.saltLength', 'Salt length')}
                    info={t(
                      'groupCreateHelp.saltLength',
                      'Backend default is 32. Increase this only when you need a longer generated salt.'
                    )}
                    placeholder={BACKEND_DEFAULT_SALT_LENGTH}
                    type="number"
                    onChange={(value) => updateNewGroupDraft({ saltLength: value })}
                  />
                  <div className="md:col-span-2">
                    <InputWithInfo
                      id="newGroupSalt"
                      value={newGroupDraft.salt}
                      inherited={newGroupInheritedFields.includes('salt')}
                      label={t('groupCreate.salt', 'Salt')}
                      info={t(
                        'groupCreateHelp.salt',
                        'Optional explicit salt used for pseudonym generation. Leave empty so the backend generates a salt.'
                      )}
                      onChange={(value) => updateNewGroupDraft({ salt: value })}
                    />
                  </div>
                  <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
                    <CheckboxWithInfo
                      id="newGroupMultiplePsn"
                      inherited={newGroupInheritedFields.includes('multiplePsnAllowed')}
                      checked={newGroupDraft.multiplePsnAllowed}
                      label={t('groupCreate.multiplePsnAllowed', 'Allow multiple pseudonyms')}
                      info={t(
                        'groupCreateHelp.multiplePsnAllowed',
                        'Allows the same identifier to receive more than one pseudonym in this group.'
                      )}
                      onChange={(checked) =>
                        updateNewGroupDraft({ multiplePsnAllowed: checked })
                      }
                    />
                    <CheckboxWithInfo
                      id="newGroupCheckDigit"
                      inherited={newGroupInheritedFields.includes('addCheckDigit')}
                      checked={newGroupDraft.addCheckDigit}
                      label={t('groupCreate.addCheckDigit', 'Add check digit')}
                      info={t(
                        'groupCreateHelp.addCheckDigit',
                        'Adds a final check digit that can help detect typing or transcription errors.'
                      )}
                      onChange={(checked) =>
                        updateNewGroupDraft({ addCheckDigit: checked })
                      }
                    />
                    <CheckboxWithInfo
                      id="newGroupLengthIncludesCheckDigit"
                      inherited={newGroupInheritedFields.includes('lengthIncludesCheckDigit')}
                      checked={newGroupDraft.lengthIncludesCheckDigit}
                      label={t(
                        'groupCreate.lengthIncludesCheckDigit',
                        'Length includes check digit'
                      )}
                      info={t(
                        'groupCreateHelp.lengthIncludesCheckDigit',
                        'When enabled, the check digit counts as part of the configured pseudonym length instead of being added on top.'
                      )}
                      onChange={(checked) =>
                        updateNewGroupDraft({ lengthIncludesCheckDigit: checked })
                      }
                    />
                    <CheckboxWithInfo
                      id="newGroupEnforceStartDate"
                      inherited={newGroupInheritedFields.includes('enforceStartDateValidity')}
                      checked={newGroupDraft.enforceStartDateValidity}
                      label={t(
                        'groupCreate.enforceStartDateValidity',
                        'Enforce start-date validity'
                      )}
                      info={t(
                        'groupCreateHelp.enforceStartDateValidity',
                        'Requires created values to start no earlier than this group allows.'
                      )}
                      onChange={(checked) =>
                        updateNewGroupDraft({ enforceStartDateValidity: checked })
                      }
                    />
                    <CheckboxWithInfo
                      id="newGroupEnforceEndDate"
                      inherited={newGroupInheritedFields.includes('enforceEndDateValidity')}
                      checked={newGroupDraft.enforceEndDateValidity}
                      label={t(
                        'groupCreate.enforceEndDateValidity',
                        'Enforce end-date validity'
                      )}
                      info={t(
                        'groupCreateHelp.enforceEndDateValidity',
                        'Requires created values to end no later than this group allows.'
                      )}
                      onChange={(checked) =>
                        updateNewGroupDraft({ enforceEndDateValidity: checked })
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <div className="relative">
                      <textarea
                        className="min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-base disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-slate-700 dark:bg-slate-950 dark:text-gray-100"
                        value={newGroupDraft.description}
                        placeholder={t('groupCreate.groupDescription', 'Description')}
                        onChange={(event) =>
                          updateNewGroupDraft({ description: event.target.value })
                        }
                      />
                      <FieldInfo
                        title={t(
                          'groupCreateHelp.groupDescription',
                          'Optional description for administrators to document the purpose of this group.'
                        )}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Dialog>
      )}

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
  disabled = false,
  maxLength,
  inputMode,
  inherited = false
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
}) {
  const { t } = useTranslation(['entityBuilder'])
  const inheritedTitle = t(
    'groupCreate.inheritedEditable',
    'Inherited from parent group; edit to override.'
  )

  return (
    <div className="relative">
      <input
        id={id}
        className={`h-[44px] w-full rounded-lg border px-3 pr-10 text-base disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:text-gray-100 dark:disabled:bg-slate-800 dark:disabled:text-gray-400 ${
          inherited
            ? 'border-blue-200 bg-blue-50/70 ring-1 ring-blue-100 dark:border-blue-800 dark:bg-blue-950/30'
            : 'border-gray-300 dark:border-slate-700 dark:bg-slate-950'
        }`}
        disabled={disabled}
        type={type}
        step={step}
        maxLength={maxLength}
        inputMode={inputMode}
        value={value}
        placeholder={placeholder ?? ''}
        onChange={(event) => onChange(event.target.value)}
      />
      <label
        htmlFor={id}
        className={`absolute -top-2 left-3 inline-flex items-center gap-1 bg-white px-1 text-sm dark:bg-slate-950 ${
          inherited ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-300'
        }`}
      >
        {label}
        {inherited && (
          <span title={inheritedTitle} aria-label={inheritedTitle}>
            <ArrowPathRoundedSquareIcon className="h-3.5 w-3.5" />
          </span>
        )}
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
    'groupCreate.inheritedEditable',
    'Inherited from parent group; edit to override.'
  )

  return (
    <div
      className={`td-dropdown-with-info relative rounded-lg ${
        inherited
          ? 'bg-blue-50/70 ring-1 ring-blue-100 dark:bg-blue-950/30'
          : ''
      }`}
    >
      <CustomDropdown
        id={id}
        value={value}
        onChange={(event) => onChange(event.value)}
        options={options}
        placeholder={label}
        disabled={disabled}
        className={inherited ? 'td-custom-dropdown--inherited' : ''}
      />
      {inherited && (
        <span
          title={inheritedTitle}
          aria-label={inheritedTitle}
          className="absolute right-[4.75rem] top-1/2 z-20 -translate-y-1/2 text-blue-700 dark:text-blue-300"
        >
          <ArrowPathRoundedSquareIcon className="h-3.5 w-3.5" />
        </span>
      )}
      <span
        title={info}
        className="td-dropdown-with-info__icon pointer-events-auto absolute top-1/2 z-20 -translate-y-1/2 text-gray-500 hover:text-color-blue dark:text-gray-300 dark:hover:text-blue-200"
      >
        <InformationCircleIcon className="h-5 w-5" />
      </span>
    </div>
  )
}


function CheckboxWithInfo({
  id,
  checked,
  label,
  info,
  onChange,
  disabled = false,
  inherited = false
}: {
  id: string
  checked: boolean
  label: string
  info: string
  onChange: (checked: boolean) => void
  disabled?: boolean
  inherited?: boolean
}) {
  const { t } = useTranslation(['entityBuilder'])
  const inheritedTitle = t(
    'groupCreate.inheritedEditable',
    'Inherited from parent group; edit to override.'
  )

  return (
    <label
      htmlFor={id}
      className={`inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-700 dark:text-gray-200 ${
        inherited ? 'bg-blue-50/70 dark:bg-blue-950/30' : ''
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
      {inherited && (
        <span title={inheritedTitle} aria-label={inheritedTitle} className="text-blue-700 dark:text-blue-300">
          <ArrowPathRoundedSquareIcon className="h-3.5 w-3.5" />
        </span>
      )}
      <InfoIcon title={info} />
    </label>
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
  onCreateGroup,
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
  onCreateGroup?: () => void
  disabled?: boolean
}) {
  const { t } = useTranslation(['entityBuilder'])
  const [open, setOpen] = useState(false)
  const visibleOptions = filterGroupOptions(options, value).slice(0, 20)
  const shouldShowMenu =
    open && (loading || visibleOptions.length > 0 || Boolean(value.trim()))

  return (
    <div className="relative">
      <div className="relative flex h-[44px] w-full items-center rounded-lg border border-gray-300 bg-white text-base disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-slate-700 dark:bg-slate-950 dark:text-gray-100 dark:disabled:bg-slate-800 dark:disabled:text-gray-400">
        <input
          id={id}
          className="h-full min-w-0 flex-1 rounded-lg bg-transparent px-3 text-base outline-none disabled:cursor-not-allowed disabled:text-gray-500 dark:text-gray-100 dark:disabled:text-gray-400"
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
        {info && (
          <span
            title={info}
            role="img"
            aria-label={info}
            className="flex-none cursor-help px-2 text-gray-500 hover:text-color-blue dark:text-gray-300 dark:hover:text-blue-200"
          >
            <InformationCircleIcon className="h-5 w-5" />
          </span>
        )}
        {onCreateGroup && !disabled && (
          <button
            type="button"
            title={t('groupCreate.openButton', 'Create new group')}
            className="inline-flex h-full flex-none items-center gap-1.5 rounded-r-lg border-l border-gray-300 px-3 text-sm font-semibold text-color-blue hover:bg-blue-50 dark:border-slate-700 dark:text-blue-200 dark:hover:bg-blue-950/40"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setOpen(false)
              onCreateGroup()
            }}
          >
            <PlusIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{t('groupCreate.openButtonShort', 'New group')}</span>
          </button>
        )}
        <label
          htmlFor={id}
          className="absolute -top-2 left-3 bg-white px-1 text-sm text-gray-500 dark:bg-slate-950 dark:text-gray-300"
        >
          {label}
        </label>
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
              <p>{t('noMatchingGroups')}</p>
              {onCreateGroup && !disabled && (
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-2 rounded-md border border-color-blue px-3 py-1.5 text-color-blue hover:bg-blue-50 dark:border-blue-300 dark:text-blue-200 dark:hover:bg-blue-950/40"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setOpen(false)
                    onCreateGroup()
                  }}
                >
                  <PlusIcon className="h-4 w-4" />
                  {t('groupCreate.openButton', 'Create new group')}
                </button>
              )}
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
  const { t } = useTranslation(['entityBuilder'])
  const languageOptions = LABEL_ALPHA2_CODE_OPTIONS
  const selectableLanguageOptions = languageOptions.filter(
    (option): option is { type: 'option'; label: string; value: string } =>
      option.type === 'option'
  )
  const entries = Object.entries(
    labels.en === undefined ? { en: '', ...labels } : labels
  )
  const firstAvailableLanguage =
    selectableLanguageOptions.find((option) => !labels[option.value])?.value ??
    selectableLanguageOptions[0]?.value ??
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
                {languageOptions.map((option, index) =>
                  option.type === 'separator' ? (
                    <option
                      key={`separator-${index}`}
                      disabled
                      value={`separator-${index}`}
                    >
                      {option.label}
                    </option>
                  ) : (
                    <option
                      key={option.value}
                      value={option.value}
                      disabled={
                        option.value !== code && Boolean(labels[option.value])
                      }
                    >
                      {option.label} ({option.value.toUpperCase()})
                    </option>
                  )
                )}
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
          disabled={
            disabled || entries.length >= selectableLanguageOptions.length
          }
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
    domainExact: 'Exact group value'
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
