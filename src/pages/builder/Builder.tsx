import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  ArrowsUpDownIcon,
  CodeBracketIcon,
  InformationCircleIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon
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
}

type EntityTypePayload = {
  name: string
  version?: string
  isBaseType?: boolean
  baseTypeName?: string
  associatedDomainName?: string
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
  { labelKey: 'entityBuilder:type.integer', fallback: 'Integer', value: 'integer' },
  { labelKey: 'entityBuilder:type.number', fallback: 'Number', value: 'number' },
  { labelKey: 'entityBuilder:type.boolean', fallback: 'Boolean', value: 'boolean' },
  { labelKey: 'entityBuilder:type.date', fallback: 'Date', value: 'date' },
  { labelKey: 'entityBuilder:type.datetime', fallback: 'Date and time', value: 'datetime' },
  { labelKey: 'entityBuilder:type.enum', fallback: 'Dropdown', value: 'enum' }
]

const layoutOptionValues: LayoutValue[] = ['group', 'row', 'col']
const normalizerOptions = ['trim', 'lower', 'collapseWhitespace', 'asciiFold', 'umlautFold', 'removePunctuation', 'digitsOnly']
const encoderOptions = ['cologne', 'doubleMetaphone']
const blockingOptions = ['exact', 'prefix3', 'prefix4', 'prefix6', 'phonetic', 'year', 'yearMonth', 'domainExact']

function prettyJson(value: unknown) {
  return JSON.stringify(value, null, 2)
}

function compactArray(values?: string[]) {
  return (values ?? []).map((value) => value.trim()).filter(Boolean)
}

function downloadJsonFile(filename: string, value: unknown) {
  const blob = new Blob([prettyJson(value)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function buildDefaultTag(entityTypeName: string, attributeName: string) {
  const entity = entityTypeName.trim() || 'entity'
  const attribute = attributeName.trim() || 'attribute'
  return `${entity}.${attribute}`
}

function defaultLinkageConfig(type?: string): LinkageConfig {
  const exact = type === 'date' || type === 'datetime' || type === 'boolean' || type === 'integer' || type === 'number'
  return {
    privacyMode: 'pprl',
    normalizers: exact ? ['trim'] : ['trim', 'lower', 'collapseWhitespace', 'umlautFold', 'asciiFold', 'removePunctuation'],
    weight: 1,
    pprl: exact
      ? { method: 'hmacExact' }
      : { method: 'ngramBloomFilter', n: 2, length: 1024, hashPositions: 10, bandSize: 32 }
  }
}

function normalizeJson(value: any, fallbackName: string, fallbackBaseType?: string): EntityTypePayload {
  if (value && typeof value === 'object' && value.typeDefinition) {
    return value as EntityTypePayload
  }
  return {
    name: fallbackName,
    version: 'v1.0',
    baseTypeName: fallbackBaseType || undefined,
    typeDefinition: value
  }
}

function mapBackendAttribute(attribute: any): BuilderAttribute {
  if (Array.isArray(attribute?.attributes)) {
    return {
      key: crypto.randomUUID(),
      name: attribute?.name ?? '',
      label_en: attribute?.label_en ?? attribute?.labelEn ?? attribute?.name ?? '',
      label_de: attribute?.label_de ?? attribute?.labelDe ?? '',
      layout: attribute?.layout ?? 'group',
      repeatable: Boolean(attribute?.repeatable),
      attributes: attribute.attributes.map(mapBackendAttribute)
    }
  }

  const importedLinkageConfig = attribute?.linkageConfig ? { ...attribute.linkageConfig } : undefined
  if (importedLinkageConfig) delete importedLinkageConfig.comparator
  if (importedLinkageConfig?.pprl) delete importedLinkageConfig.pprl.exact

  return {
    key: crypto.randomUUID(),
    name: attribute?.name ?? '',
    label_en: attribute?.label_en ?? attribute?.labelEn ?? attribute?.name ?? '',
    label_de: attribute?.label_de ?? attribute?.labelDe ?? '',
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

function cleanLinkageConfig(config: LinkageConfig): LinkageConfig {
  const cleaned: LinkageConfig = {}
  if (config.privacyMode) cleaned.privacyMode = config.privacyMode
  if (compactArray(config.normalizers).length) cleaned.normalizers = compactArray(config.normalizers)
  if (compactArray(config.encoders).length) cleaned.encoders = compactArray(config.encoders)
  if (config.privacyMode !== 'pprl' && compactArray(config.blocking).length) cleaned.blocking = compactArray(config.blocking)
  if (config.weight !== undefined && config.weight !== null) cleaned.weight = Number(config.weight)
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

function serializeAttribute(attribute: BuilderAttribute): any {
  if (Array.isArray(attribute.attributes)) {
    const group: any = {
      layout: attribute.layout ?? 'group',
      attributes: attribute.attributes.map(serializeAttribute)
    }
    if (attribute.name.trim()) group.name = attribute.name.trim()
    if (attribute.label_en?.trim()) group.label_en = attribute.label_en.trim()
    if (attribute.label_de?.trim()) group.label_de = attribute.label_de.trim()
    if (attribute.repeatable) group.repeatable = true
    return group
  }

  const field: any = {
    name: attribute.name.trim(),
    label_en: (attribute.label_en || attribute.name).trim(),
    label_de: (attribute.label_de || attribute.label_en || attribute.name).trim(),
    type: attribute.type || 'string',
    required: Boolean(attribute.required),
    linkage: Boolean(attribute.linkage)
  }
  if (attribute.repeatable) field.repeatable = true
  if (attribute.minimum !== undefined && attribute.minimum !== null) field.minimum = Number(attribute.minimum)
  if (attribute.maximum !== undefined && attribute.maximum !== null) field.maximum = Number(attribute.maximum)
  // minLength/maxLength are intentionally not serialized because the backend schema currently rejects them.
  if (attribute.type === 'enum') {
    const values = compactArray(attribute.values)
    if (values.length) {
      field.values = values
      field.enum = values
    }
  }
  if (attribute.linkage) {
    const tags = compactArray(attribute.tags)
    if (tags.length) field.tags = tags
    if (attribute.linkageConfig) field.linkageConfig = cleanLinkageConfig(attribute.linkageConfig)
  }
  return field
}

function createCommonPersonAttributes(prefix = 'person'): BuilderAttribute[] {
  const make = (attribute: Omit<BuilderAttribute, 'key'>): BuilderAttribute => ({ ...attribute, key: crypto.randomUUID() })
  return [
    make({
      name: 'givenName',
      label_en: 'First name',
      label_de: 'Vorname',
      type: 'string',
      required: true,
      linkage: true,
      tags: [`${prefix}.givenName`],
      linkageConfig: { ...defaultLinkageConfig('string'), weight: 2 }
    }),
    make({
      name: 'familyName',
      label_en: 'Last name',
      label_de: 'Nachname',
      type: 'string',
      required: true,
      linkage: true,
      tags: [`${prefix}.familyName`],
      linkageConfig: { ...defaultLinkageConfig('string'), weight: 4 }
    }),
    make({
      name: 'birthDate',
      label_en: 'Date of birth',
      label_de: 'Geburtstag',
      type: 'date',
      required: true,
      linkage: true,
      tags: [`${prefix}.birthDate`],
      linkageConfig: { privacyMode: 'pprl', normalizers: ['trim'], weight: 5, pprl: { method: 'hmacExact' } }
    }),
    make({
      name: 'email',
      label_en: 'Email',
      label_de: 'E-Mail',
      type: 'string',
      required: false,
      linkage: true,
      tags: [`${prefix}.email`],
      linkageConfig: { privacyMode: 'pprl', normalizers: ['trim', 'lower', 'collapseWhitespace'], weight: 2, pprl: { method: 'hmacExact' } }
    }),
    make({
      name: 'addresses',
      label_en: 'Addresses',
      label_de: 'Adressen',
      layout: 'group',
      repeatable: true,
      attributes: [
        make({
          name: 'city',
          label_en: 'City',
          label_de: 'Stadt',
          type: 'string',
          required: false,
          linkage: true,
          tags: [`${prefix}.city`],
          linkageConfig: { ...defaultLinkageConfig('string'), weight: 1 }
        }),
        make({
          name: 'postalCode',
          label_en: 'ZIP code',
          label_de: 'Postleitzahl',
          type: 'string',
          required: false,
          linkage: true,
          tags: [`${prefix}.postalCode`],
          linkageConfig: { privacyMode: 'pprl', normalizers: ['trim', 'digitsOnly'], weight: 1.5, pprl: { method: 'hmacExact' } }
        })
      ]
    })
  ]
}

function updateAttributeByKey(attributes: BuilderAttribute[], key: string, patch: Partial<BuilderAttribute>): BuilderAttribute[] {
  return attributes.map((attribute) => {
    if (attribute.key === key) return { ...attribute, ...patch }
    if (attribute.attributes) return { ...attribute, attributes: updateAttributeByKey(attribute.attributes, key, patch) }
    return attribute
  })
}

function removeAttributeByKey(attributes: BuilderAttribute[], key: string): BuilderAttribute[] {
  return attributes
    .filter((attribute) => attribute.key !== key)
    .map((attribute) => (attribute.attributes ? { ...attribute, attributes: removeAttributeByKey(attribute.attributes, key) } : attribute))
}

function addChildAttributeByKey(attributes: BuilderAttribute[], key: string, child: BuilderAttribute): BuilderAttribute[] {
  return attributes.map((attribute) => {
    if (attribute.key === key) return { ...attribute, attributes: [...(attribute.attributes ?? []), child] }
    if (attribute.attributes) return { ...attribute, attributes: addChildAttributeByKey(attribute.attributes, key, child) }
    return attribute
  })
}

function hasInvalidAttribute(attributes: BuilderAttribute[]): boolean {
  return attributes.some((attribute) => {
    if (attribute.attributes) return attribute.attributes.length === 0 || hasInvalidAttribute(attribute.attributes)
    return !attribute.name.trim() || !(attribute.type ?? '').trim()
  })
}

function extractAttribute(attributes: BuilderAttribute[], key: string): { next: BuilderAttribute[]; found?: BuilderAttribute } {
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

function insertBefore(attributes: BuilderAttribute[], targetKey: string, item: BuilderAttribute): BuilderAttribute[] {
  const next: BuilderAttribute[] = []
  for (const attribute of attributes) {
    if (attribute.key === targetKey) next.push(item)
    if (attribute.attributes) {
      next.push({ ...attribute, attributes: insertBefore(attribute.attributes, targetKey, item) })
    } else {
      next.push(attribute)
    }
  }
  return next
}

function appendToGroup(attributes: BuilderAttribute[], groupKey: string, item: BuilderAttribute): BuilderAttribute[] {
  return attributes.map((attribute) => {
    if (attribute.key === groupKey && Array.isArray(attribute.attributes)) {
      return { ...attribute, attributes: [...attribute.attributes, item] }
    }
    if (attribute.attributes) return { ...attribute, attributes: appendToGroup(attribute.attributes, groupKey, item) }
    return attribute
  })
}

function containsKey(attribute: BuilderAttribute, key: string): boolean {
  return attribute.key === key || Boolean(attribute.attributes?.some((child) => containsKey(child, key)))
}

export default function Builder() {
  const { t } = useTranslation(['entityBuilder', 'common'])
  const navigate = useNavigate()
  const showToast = useToastStore((state) => state.show)
  const setProjectEntities = useProjectStore((state) => state.setEntities)
  const typeOptions = useMemo(
    () => typeOptionDefinitions.map((option) => ({ label: t(option.labelKey, option.fallback), value: option.value })),
    [t]
  )
  const layoutOptions = useMemo(
    () => layoutOptionValues.map((value) => ({ label: t(`layout.${value}`), value })),
    [t]
  )
  const pprlMethodOptions = useMemo(
    () => [
      { label: t('linkageConfig.pprlMethodOptions.ngramBloomFilter'), value: 'ngramBloomFilter' },
      { label: t('linkageConfig.pprlMethodOptions.hmacExact'), value: 'hmacExact' }
    ],
    [t]
  )

  const [entityName, setEntityName] = useState('')
  const [rootLayout, setRootLayout] = useState<LayoutValue>('group')
  const [saveTarget, setSaveTarget] = useState<'project' | 'base'>('base')
  const [baseTypeOptions, setBaseTypeOptions] = useState<{ label: string; value: string }[]>([])
  const [selectedBaseType, setSelectedBaseType] = useState('')
  const [associatedGroupName, setAssociatedGroupName] = useState('')
  const [attributes, setAttributes] = useState<BuilderAttribute[]>([])
  const [jsonDraft, setJsonDraft] = useState('')
  const [jsonDirty, setJsonDirty] = useState(false)
  const [jsonError, setJsonError] = useState('')
  const [jsonModalOpen, setJsonModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draggedAttributeKey, setDraggedAttributeKey] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function loadBaseTypes() {
      try {
        const result = await TrustDeck.instance().getBaseTypes('*')
        if (!active) return
        const options = (result ?? [])
          .map((entry: any) => entry?.name)
          .filter((name: unknown): name is string => typeof name === 'string' && name.length > 0)
          .map((name) => ({ label: name, value: name }))
        setBaseTypeOptions(options)
        if (options.length) {
          setSelectedBaseType((current) => current || options[0].value)
        } else {
          setSelectedBaseType('')
          setSaveTarget('base')
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (!message.includes('404')) console.error('Failed to load base types', error)
        if (active) setBaseTypeOptions([])
      }
    }
    loadBaseTypes()
    return () => {
      active = false
    }
  }, [])

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
        attributes: attributes.map(serializeAttribute)
      }
    }
    if (saveTarget === 'project') {
      built.baseTypeName = selectedBaseType || undefined
      built.associatedDomainName = associatedGroupName || undefined
    }
    return built
  }, [associatedGroupName, attributes, entityName, rootLayout, saveTarget, selectedBaseType])

  useEffect(() => {
    if (!jsonDirty) {
      setJsonDraft(prettyJson(payload))
      setJsonError('')
    }
  }, [jsonDirty, payload])

  const newLeafAttribute = (source?: Partial<BuilderAttribute>): BuilderAttribute => ({
    key: crypto.randomUUID(),
    name: source?.name ?? '',
    label_en: source?.label_en ?? '',
    label_de: source?.label_de ?? '',
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
    linkageConfig: source?.linkageConfig
  })

  const newGroupAttribute = (): BuilderAttribute => ({
    key: crypto.randomUUID(),
    name: '',
    label_en: '',
    label_de: '',
    layout: 'group',
    repeatable: false,
    attributes: []
  })

  const addAttribute = (source?: Partial<BuilderAttribute>) => {
    setAttributes((current) => [...current, newLeafAttribute(source)])
  }

  const addGroup = () => {
    setAttributes((current) => [...current, newGroupAttribute()])
  }

  const updateAttribute = (key: string, patch: Partial<BuilderAttribute>) => {
    setAttributes((current) => updateAttributeByKey(current, key, patch))
  }

  const handleAttributeNameChange = (attribute: BuilderAttribute, name: string) => {
    const currentDefault = buildDefaultTag(entityName, attribute.name)
    const shouldRefreshTag = Boolean(attribute.linkage) && (!attribute.tags?.length || (attribute.tags.length === 1 && attribute.tags[0] === currentDefault))
    updateAttribute(attribute.key, {
      name,
      ...(shouldRefreshTag ? { tags: [buildDefaultTag(entityName, name)] } : {})
    })
  }

  const removeAttribute = (key: string) => {
    setAttributes((current) => removeAttributeByKey(current, key))
  }

  const addChildAttribute = (groupKey: string) => {
    setAttributes((current) => addChildAttributeByKey(current, groupKey, newLeafAttribute()))
  }

  const addPersonAttributes = () => {
    setAttributes((current) => [...current, ...createCommonPersonAttributes(entityName.trim() || 'person')])
  }

  const moveBefore = (sourceKey: string, targetKey: string) => {
    if (!sourceKey || sourceKey === targetKey) return
    setAttributes((current) => {
      const extracted = extractAttribute(current, sourceKey)
      if (!extracted.found) return current
      if (containsKey(extracted.found, targetKey)) return current
      return insertBefore(extracted.next, targetKey, extracted.found)
    })
  }

  const moveIntoGroup = (sourceKey: string, groupKey: string) => {
    if (!sourceKey || sourceKey === groupKey) return
    setAttributes((current) => {
      const extracted = extractAttribute(current, sourceKey)
      if (!extracted.found) return current
      if (containsKey(extracted.found, groupKey)) return current
      return appendToGroup(extracted.next, groupKey, extracted.found)
    })
  }

  const openJsonModal = () => {
    setJsonDraft(prettyJson(payload))
    setJsonDirty(false)
    setJsonError('')
    setJsonModalOpen(true)
  }

  const applyJsonToBuilder = () => {
    try {
      const parsed = normalizeJson(JSON.parse(jsonDraft), entityName, selectedBaseType)
      setEntityName(parsed.name ?? entityName)
      setRootLayout((parsed.typeDefinition?.layout as LayoutValue) ?? 'group')
      setSaveTarget(parsed.isBaseType || !parsed.baseTypeName ? 'base' : 'project')
      setSelectedBaseType(parsed.baseTypeName ?? selectedBaseType)
      setAssociatedGroupName(parsed.associatedDomainName ?? associatedGroupName)
      setAttributes(attributesFromPayload(parsed))
      setJsonDraft(prettyJson(parsed))
      setJsonDirty(false)
      setJsonError('')
      setJsonModalOpen(false)
      showToast({ severity: 'success', summary: t('toast.jsonAppliedSummary'), detail: t('toast.jsonAppliedDetail'), life: 2500 })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setJsonError(message)
      showToast({ severity: 'error', summary: t('toast.invalidJson'), detail: message, life: 4500 })
    }
  }

  const handleJsonUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      setJsonDraft(text)
      setJsonDirty(true)
      setJsonError('')
    }
    reader.onerror = () => {
      showToast({ severity: 'error', summary: t('toast.invalidJson'), detail: t('toast.jsonFileReadFailed'), life: 4500 })
    }
    reader.readAsText(file)
  }

  const downloadCurrentJson = () => {
    try {
      const value = jsonDirty ? JSON.parse(jsonDraft) : payload
      downloadJsonFile(`${entityName.trim() || 'entity-type'}.json`, value)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setJsonError(message)
      showToast({ severity: 'error', summary: t('toast.invalidJson'), detail: message, life: 4500 })
    }
  }

  const refreshProjectEntities = async () => {
    try {
      const response = await TrustDeck.instance().getProjectEntities('*')
      const responseArray = Array.isArray(response) ? response : []
      const names = Array.from(new Set(responseArray.map((entry: any) => entry?.name).filter(Boolean)))
      setProjectEntities(names as string[])
    } catch {
      setProjectEntities([])
    }
  }

  const save = async () => {
    const finalPayload = payload

    if (!finalPayload.name) {
      showToast({ severity: 'error', summary: t('toast.missingNameSummary'), detail: t('toast.missingNameDetail'), life: 3500 })
      return
    }
    if (!finalPayload.typeDefinition.attributes?.length) {
      showToast({ severity: 'error', summary: t('toast.missingAttributesSummary'), detail: t('toast.missingAttributesDetail'), life: 3500 })
      return
    }
    if (hasInvalidAttribute(attributes)) {
      showToast({ severity: 'error', summary: t('toast.invalidAttributesSummary'), detail: t('toast.invalidAttributesDetail'), life: 4500 })
      return
    }
    if (saveTarget === 'project' && !finalPayload.baseTypeName) {
      showToast({ severity: 'error', summary: t('toast.missingBaseSummary'), detail: t('toast.missingBaseDetail'), life: 3500 })
      return
    }

    setSaving(true)
    try {
      if (saveTarget === 'base') {
        await TrustDeck.instance().createBaseType({ ...finalPayload, version: finalPayload.version ?? 'v1.0', isBaseType: true, baseTypeName: undefined, associatedDomainName: undefined })
      } else {
        await TrustDeck.instance().createEntityConfig({ ...finalPayload, version: finalPayload.version ?? 'v1.0', isBaseType: false })
        await refreshProjectEntities()
      }
      showToast({
        severity: 'success',
        summary: t('toast.createdSummary'),
        detail: saveTarget === 'base' ? t('toast.baseCreatedDetail') : t('toast.projectCreatedDetail'),
        life: 3500
      })
      navigate('/entity/manager')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const detail = message.includes('400') ? t('toast.invalidDefinitionDetail') : message
      showToast({ severity: 'error', summary: t('toast.creationFailed'), detail, life: 7000 })
    } finally {
      setSaving(false)
    }
  }

  const setListValue = (attribute: BuilderAttribute, key: 'normalizers' | 'encoders' | 'blocking', value: string, checked: boolean) => {
    const current = attribute.linkageConfig?.[key] ?? []
    const next = checked ? Array.from(new Set([...current, value])) : current.filter((item) => item !== value)
    updateAttribute(attribute.key, { linkageConfig: { ...(attribute.linkageConfig ?? defaultLinkageConfig(attribute.type)), [key]: next } })
  }

  const updateLinkageConfig = (attribute: BuilderAttribute, patch: Partial<LinkageConfig>) => {
    updateAttribute(attribute.key, { linkageConfig: { ...(attribute.linkageConfig ?? defaultLinkageConfig(attribute.type)), ...patch } })
  }

  const updatePprlConfig = (attribute: BuilderAttribute, patch: NonNullable<LinkageConfig['pprl']>) => {
    const config = attribute.linkageConfig ?? defaultLinkageConfig(attribute.type)
    updateAttribute(attribute.key, { linkageConfig: { ...config, pprl: { ...(config.pprl ?? {}), ...patch } } })
  }

  const renderLinkageConfig = (attribute: BuilderAttribute) => {
    if (!attribute.linkage) return null
    const config = attribute.linkageConfig ?? defaultLinkageConfig(attribute.type)
    const pprl = config.pprl ?? defaultLinkageConfig(attribute.type).pprl ?? {}
    const privacyMode = config.privacyMode ?? 'pprl'
    return (
      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-left dark:border-blue-900/60 dark:bg-blue-950/30">
        <h4 className="font-semibold text-color-blue dark:text-blue-100">{t('linkageConfig.title')}</h4>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{t('linkageConfig.description')}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <InputWithInfo
            id={`tags-${attribute.key}`}
            label={t('linkageConfig.tags')}
            value={(attribute.tags?.length ? attribute.tags : [buildDefaultTag(entityName, attribute.name)]).join(', ')}
            placeholder={t('linkageConfig.tagsPlaceholder')}
            info={t('linkageConfigHelp.tags')}
            onChange={(value) => updateAttribute(attribute.key, { tags: value.split(',').map((item) => item.trim()).filter(Boolean) })}
          />
          <DropdownWithInfo
            id={`privacy-${attribute.key}`}
            label={t('linkageConfig.privacyMode')}
            value={privacyMode}
            info={t('linkageConfigHelp.privacyMode')}
            options={[{ label: 'PPRL', value: 'pprl' }, { label: t('linkageConfig.plain'), value: 'plain' }]}
            onChange={(value) => updateLinkageConfig(attribute, { privacyMode: value as PrivacyMode })}
          />
          <InputWithInfo
            id={`weight-${attribute.key}`}
            label={t('linkageConfig.weight')}
            type="number"
            step="0.1"
            value={String(config.weight ?? 1)}
            info={t('linkageConfigHelp.weight')}
            onChange={(value) => updateLinkageConfig(attribute, { weight: Number(value) })}
          />
        </div>
        <div className={`mt-4 grid gap-4 ${privacyMode === 'pprl' ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
          <MultiCheck title={t('linkageConfig.normalizers')} values={normalizerOptions} selected={config.normalizers ?? []} helpPrefix="normalizerHelp" onChange={(value, checked) => setListValue(attribute, 'normalizers', value, checked)} />
          <MultiCheck title={t('linkageConfig.encoders')} values={encoderOptions} selected={config.encoders ?? []} helpPrefix="encoderHelp" onChange={(value, checked) => setListValue(attribute, 'encoders', value, checked)} />
          {privacyMode !== 'pprl' && (
            <MultiCheck title={t('linkageConfig.blocking')} values={blockingOptions} selected={config.blocking ?? []} helpPrefix="blockingHelp" onChange={(value, checked) => setListValue(attribute, 'blocking', value, checked)} />
          )}
        </div>
        {privacyMode === 'pprl' && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-white p-3 dark:border-blue-900 dark:bg-slate-950">
            <h5 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">{t('linkageConfig.pprlSettings')}</h5>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <DropdownWithInfo
                id={`pprl-method-${attribute.key}`}
                label={t('linkageConfig.pprlMethod')}
                value={pprl.method ?? 'ngramBloomFilter'}
                info={t('linkageConfigHelp.pprlMethod')}
                options={pprlMethodOptions}
                onChange={(value) => updatePprlConfig(attribute, { method: value as PprlMethod })}
              />
              {(pprl.method ?? 'ngramBloomFilter') === 'ngramBloomFilter' && (
                <>
                  <NumberInput id={`n-${attribute.key}`} value={pprl.n ?? 2} label={t('linkageConfig.ngramSize')} info={t('linkageConfigHelp.ngramSize')} onChange={(value) => updatePprlConfig(attribute, { n: value })} />
                  <NumberInput id={`length-${attribute.key}`} value={pprl.length ?? 1024} label={t('linkageConfig.bloomLength')} info={t('linkageConfigHelp.bloomLength')} onChange={(value) => updatePprlConfig(attribute, { length: value })} />
                  <NumberInput id={`hash-${attribute.key}`} value={pprl.hashPositions ?? 10} label={t('linkageConfig.hashPositions')} info={t('linkageConfigHelp.hashPositions')} onChange={(value) => updatePprlConfig(attribute, { hashPositions: value })} />
                  <NumberInput id={`band-${attribute.key}`} value={pprl.bandSize ?? 32} label={t('linkageConfig.bandSize')} info={t('linkageConfigHelp.bandSize')} onChange={(value) => updatePprlConfig(attribute, { bandSize: value })} />
                </>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderAttributeEditor = (attribute: BuilderAttribute, depth = 0): React.ReactNode => {
    const isGroup = Array.isArray(attribute.attributes)
    return (
      <div
        key={attribute.key}
        draggable
        onDragStart={(event) => {
          setDraggedAttributeKey(attribute.key)
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setData('text/plain', attribute.key)
        }}
        onDragEnd={() => setDraggedAttributeKey(null)}
        onDragOver={(event) => {
          if (draggedAttributeKey && draggedAttributeKey !== attribute.key) event.preventDefault()
        }}
        onDrop={(event) => {
          event.preventDefault()
          event.stopPropagation()
          const source = event.dataTransfer.getData('text/plain') || draggedAttributeKey
          if (source) moveBefore(source, attribute.key)
          setDraggedAttributeKey(null)
        }}
        className={`rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900 ${depth ? 'ml-4' : ''} ${draggedAttributeKey === attribute.key ? 'opacity-60' : ''}`}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="inline-flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
            <ArrowsUpDownIcon className="h-4 w-4 cursor-move text-gray-400" />
            {attribute.label_en || attribute.name || (isGroup ? t('newGroup') : t('newAttribute'))}
          </h3>
          <button type="button" onClick={() => removeAttribute(attribute.key)} className="text-red-600 hover:text-red-800">
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="rounded-lg border border-gray-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-gray-100"
            value={attribute.name}
            placeholder={t('attributeName')}
            onChange={(e) => handleAttributeNameChange(attribute, e.target.value)}
          />
          <input
            className="rounded-lg border border-gray-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-gray-100"
            value={attribute.label_en ?? ''}
            placeholder={t('englishLabel')}
            onChange={(e) => updateAttribute(attribute.key, { label_en: e.target.value })}
          />
          <input
            className="rounded-lg border border-gray-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-gray-100"
            value={attribute.label_de ?? ''}
            placeholder={t('germanLabel')}
            onChange={(e) => updateAttribute(attribute.key, { label_de: e.target.value })}
          />
          {isGroup ? (
            <CustomDropdown
              id={`layout-${attribute.key}`}
              value={attribute.layout ?? 'group'}
              onChange={(e) => updateAttribute(attribute.key, { layout: e.value })}
              options={layoutOptions}
              placeholder={t('layout.label')}
            />
          ) : (
            <CustomDropdown
              id={`type-${attribute.key}`}
              value={attribute.type ?? ''}
              onChange={(e) => updateAttribute(attribute.key, { type: e.value, linkageConfig: attribute.linkage ? defaultLinkageConfig(e.value) : attribute.linkageConfig })}
              options={typeOptions}
              placeholder={t('attributeType')}
            />
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-700 dark:text-gray-200">
          {isGroup ? (
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(attribute.repeatable)}
                onChange={(e) => updateAttribute(attribute.key, { repeatable: e.target.checked })}
              />
              {t('attribute.repeatable')}
            </label>
          ) : (
            (['required', 'linkage', 'repeatable'] as const).map((flag) => (
              <label key={flag} className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(attribute[flag])}
                  onChange={(e) => {
                    const checked = e.target.checked
                    updateAttribute(attribute.key, {
                      [flag]: checked,
                      ...(flag === 'linkage' && checked
                        ? {
                            linkageConfig: attribute.linkageConfig ?? defaultLinkageConfig(attribute.type),
                            tags: attribute.tags?.length ? attribute.tags : [buildDefaultTag(entityName, attribute.name)]
                          }
                        : {})
                    })
                  }}
                />
                <span className="inline-flex items-center gap-1.5">
                  {t(`attribute.${flag}`)}
                  <InfoIcon title={t(`attributeHelp.${flag}`)} />
                </span>
              </label>
            ))
          )}
        </div>

        {!isGroup && attribute.type === 'enum' && (
          <input
            className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-gray-100"
            value={(attribute.values ?? []).join(', ')}
            placeholder={t('dropdownValuesCommaSeparated')}
            onChange={(e) => updateAttribute(attribute.key, { values: e.target.value.split(',').map((v) => v.trim()) })}
          />
        )}
        {!isGroup && renderLinkageConfig(attribute)}

        {isGroup && (
          <div
            className="mt-4 space-y-4 border-l border-gray-200 pl-4 dark:border-slate-700"
            onDragOver={(event) => {
              if (draggedAttributeKey && draggedAttributeKey !== attribute.key) event.preventDefault()
            }}
            onDrop={(event) => {
              event.preventDefault()
              event.stopPropagation()
              const source = event.dataTransfer.getData('text/plain') || draggedAttributeKey
              if (source) moveIntoGroup(source, attribute.key)
              setDraggedAttributeKey(null)
            }}
          >
            <div className="flex justify-start">
              <PrimaryOutlinedButton label={t('addNestedAttribute')} onClick={() => addChildAttribute(attribute.key)} />
            </div>
            {(attribute.attributes ?? []).length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-slate-700 dark:text-gray-300">{t('emptyGroupHint')}</div>
            ) : (
              attribute.attributes?.map((child) => renderAttributeEditor(child, depth + 1))
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full flex justify-center">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="w-full">
          <PrimaryOutlinedButton label={t('common:back', 'Back')} icon={<ArrowLeftIcon className="h-5 w-5" />} iconPos="left" onClick={() => navigate('/entity/manager')} />
        </div>

        <Panel title={t('entityBuilder:createEntityType')} className="w-full" noMaxWidth>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <CustomFloatLabel id="entityTypeName" value={entityName} placeholder={t('entityName', 'Entity name')} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEntityName(e.target.value)} required />
            <CustomDropdown id="rootLayout" value={rootLayout} onChange={(e) => setRootLayout(e.value)} options={layoutOptions} placeholder={t('layout.root')} />
            {saveTarget === 'project' && (
              <CustomFloatLabel id="associatedGroupName" value={associatedGroupName} placeholder={t('associatedGroupName')} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAssociatedGroupName(e.target.value)} />
            )}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <button type="button" disabled={baseTypeOptions.length === 0} title={baseTypeOptions.length === 0 ? t('baseTypeRequiredHint') : undefined} onClick={() => { if (baseTypeOptions.length > 0) setSaveTarget('project') }} className={`rounded-xl border p-4 text-left transition ${baseTypeOptions.length === 0 ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-500' : saveTarget === 'project' ? 'border-color-blue bg-blue-50 text-color-blue dark:bg-blue-950/40 dark:text-blue-100' : 'border-gray-200 bg-white hover:border-color-blue dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100'}`}>
              <div className="font-semibold">{t('projectSpecificType')}</div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">{t('projectSpecificTypeHelp')}</p>
              {baseTypeOptions.length === 0 && <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">{t('baseTypeRequiredHint')}</p>}
            </button>
            <button type="button" onClick={() => setSaveTarget('base')} className={`rounded-xl border p-4 text-left transition ${saveTarget === 'base' ? 'border-color-blue bg-blue-50 text-color-blue dark:bg-blue-950/40 dark:text-blue-100' : 'border-gray-200 bg-white hover:border-color-blue dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100'}`}>
              <div className="font-semibold">{t('baseType')}</div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">{t('baseTypeHelp')}</p>
            </button>
          </div>

          {saveTarget === 'project' && (
            <div className="mt-4">
              <CustomDropdown id="baseType" value={selectedBaseType} onChange={(e) => setSelectedBaseType(e.value)} options={baseTypeOptions} placeholder={t('baseType', 'Base type')} />
              {baseTypeOptions.length === 0 && <p className="mt-2 text-sm text-amber-700">{t('noBaseTypesHint')}</p>}
            </div>
          )}
        </Panel>

        <div className="flex w-full justify-center">
          <PrimaryOutlinedButton label={t('openJsonImportExport')} icon={<CodeBracketIcon className="h-5 w-5" />} iconPos="left" onClick={openJsonModal} />
        </div>

        <Panel title={t('entityBuilder:visualPreview')} className="w-full" noMaxWidth>
          <div className="mt-7 mb-4 flex flex-wrap gap-2">
            <PrimaryOutlinedButton label={<span className="inline-flex items-center gap-2"><PlusIcon className="h-4 w-4" />{t('addCustomAttribute')}</span>} onClick={() => addAttribute()} />
            <PrimaryOutlinedButton label={<span className="inline-flex items-center gap-2"><PlusIcon className="h-4 w-4" />{t('addGroup')}</span>} onClick={addGroup} />
            <PrimaryOutlinedButton label={t('addCommonPersonFields')} onClick={addPersonAttributes} />
          </div>

          {attributes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-300">{t('noAttributesHint')}</div>
          ) : (
            <div className="space-y-4">{attributes.map((attribute) => renderAttributeEditor(attribute))}</div>
          )}
        </Panel>

        {jsonModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{t('jsonImportExport')}</h2>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-300">{t('jsonHelp')}</p>
                </div>
                <button type="button" aria-label={t('closeJsonImportExport')} onClick={() => setJsonModalOpen(false)} className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-slate-800 dark:hover:text-white">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-4">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-color-blue px-4 py-2 font-semibold text-color-blue hover:bg-blue-50 dark:border-blue-400 dark:text-blue-100 dark:hover:bg-blue-950/40">
                  <CodeBracketIcon className="h-5 w-5" />
                  {t('uploadJsonFile')}
                  <input className="hidden" type="file" accept=".json,.txt,application/json,text/plain" onChange={handleJsonUpload} />
                </label>
                <PrimaryOutlinedButton label={<span className="inline-flex items-center gap-2"><ArrowDownTrayIcon className="h-5 w-5" />{t('downloadJsonFile')}</span>} onClick={downloadCurrentJson} />
              </div>

              <textarea className="h-[560px] w-full rounded-lg border border-gray-300 p-3 font-mono text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-gray-100" spellCheck={false} value={jsonDraft} onChange={(event) => { setJsonDraft(event.target.value); setJsonDirty(true) }} />
              {jsonError && <p className="mt-2 text-sm text-red-600 dark:text-red-300">{t('invalidJsonWithMessage', { message: jsonError })}</p>}

              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <PrimaryOutlinedButton label={t('resetJsonFromPreview')} onClick={() => { setJsonDirty(false); setJsonDraft(prettyJson(payload)); setJsonError('') }} />
                <PrimaryButton label={t('applyJsonToPreview')} onClick={applyJsonToBuilder} />
              </div>
            </div>
          </div>
        )}

        <div className="flex w-full justify-center">
          <PrimaryButton label={saving ? t('common:loading') : t('entityBuilder:createEntityType')} loading={saving} onClick={save} />
        </div>
      </div>
    </div>
  )
}

function InfoIcon({ title }: { title: string }) {
  return (
    <span title={title} className="inline-flex h-4 w-4 items-center justify-center rounded-full text-gray-500 hover:text-color-blue dark:text-gray-300 dark:hover:text-blue-200">
      <InformationCircleIcon className="h-4 w-4" />
    </span>
  )
}

function FieldInfo({ title }: { title: string }) {
  return (
    <span title={title} className="absolute right-2 top-1/2 z-10 -translate-y-1/2 text-gray-500 hover:text-color-blue dark:text-gray-300 dark:hover:text-blue-200">
      <InformationCircleIcon className="h-5 w-5" />
    </span>
  )
}

function InputWithInfo({ id, label, value, onChange, info, placeholder, type = 'text', step }: { id: string; label: string; value: string; onChange: (value: string) => void; info: string; placeholder?: string; type?: string; step?: string }) {
  return (
    <div className="relative">
      <input
        id={id}
        className="h-[44px] w-full rounded-lg border border-gray-300 px-3 pr-10 text-base dark:border-slate-700 dark:bg-slate-950 dark:text-gray-100"
        type={type}
        step={step}
        value={value}
        placeholder={placeholder ?? ''}
        onChange={(event) => onChange(event.target.value)}
      />
      <label htmlFor={id} className="absolute -top-2 left-3 bg-white px-1 text-sm text-gray-500 dark:bg-slate-950 dark:text-gray-300">{label}</label>
      <FieldInfo title={info} />
    </div>
  )
}

function DropdownWithInfo({ id, label, value, options, onChange, info }: { id: string; label: string; value: string; options: { label: string; value: string }[]; onChange: (value: string) => void; info: string }) {
  return (
    <div className="relative">
      <CustomDropdown id={id} value={value} onChange={(event) => onChange(event.value)} options={options} placeholder={label} />
      <FieldInfo title={info} />
    </div>
  )
}

function NumberInput({ id, value, label, info, onChange }: { id: string; value: number; label: string; info: string; onChange: (value: number) => void }) {
  return <InputWithInfo id={id} label={label} info={info} type="number" value={String(value)} onChange={(value) => onChange(Number(value))} />
}

function MultiCheck({ title, values, selected, helpPrefix, onChange }: { title: string; values: string[]; selected: string[]; helpPrefix: string; onChange: (value: string, checked: boolean) => void }) {
  const { t } = useTranslation(['entityBuilder'])
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
      <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-100">{title}</h5>
      <div className="mt-2 space-y-1">
        {values.map((value) => (
          <label key={value} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <input type="checkbox" checked={selected.includes(value)} onChange={(event) => onChange(value, event.target.checked)} />
            <span className="min-w-0 flex-1 truncate">{value}</span>
            <InfoIcon title={t(`${helpPrefix}.${value}`)} />
          </label>
        ))}
      </div>
    </div>
  )
}
