import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog } from 'primereact/dialog'
import { useTranslation } from 'react-i18next'
import { useAuth } from 'react-oidc-context'
import {
  ArrowPathIcon,
  CheckIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import Panel from '../../core/components/common/Panel'
import PrimaryButton from '../../core/components/form/buttons/PrimaryButton'
import PrimaryOutlinedButton from '../../core/components/form/buttons/PrimaryOutlinedButton'
import SecondaryOutlinedButton from '../../core/components/form/buttons/SecondaryOutlinedButton'
import CustomFloatLabel from '../../core/components/form/CustomFloatLabel'
import Divider from '../../core/components/common/Divider'
import useProjectStore from '../../core/stores/ProjectStore'
import useToastStore from '../../core/stores/ToastStore'
import TrustDeck, { EntityTypePayload } from '../../core/services/TrustDeck'
import DynamicEntity from '../search/components/DynamicEntity'
import { pickSchemaData } from '../search/utils/schemaData'
import type { Attribute } from '../../core/stores/ProjectStore'
import {
  CachedUserAccess,
  canUseProjectAction,
  getCurrentUserAccess
} from '../../core/services/PermissionCache'

type ModalMode = 'view' | 'create' | 'edit'

type EntityInstance = Record<string, any>

function asTypeDefinition(entry: EntityTypePayload | string): EntityTypePayload {
  if (typeof entry === 'string') {
    return {
      name: entry,
      version: '',
      typeDefinition: { attributes: [] }
    }
  }
  return entry
}

function entityId(entity: EntityInstance | null | undefined) {
  if (!entity) return ''
  return String(
    entity.trustdeckID ??
      entity.trustdeckId ??
      entity.trustDeckId ??
      entity.id ??
      entity.data?.trustdeckID ??
      entity.data?.id ??
      ''
  )
}

function statusLabel(type: EntityTypePayload, t: ReturnType<typeof useTranslation>['t']) {
  if ((type as any).isDeleted) return t('identity:status.deleted')
  if (type.isDeprecated) return t('identity:status.deprecated')
  return t('identity:status.active')
}

function statusClasses(type: EntityTypePayload) {
  if ((type as any).isDeleted) {
    return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300'
  }
  if (type.isDeprecated) {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300'
  }
  return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
}

function resolveLabel(attr: Attribute, language: string) {
  const a = attr as any
  const isGerman = language.toLowerCase().startsWith('de')
  return isGerman
    ? a.label_de || a.labelDe || a.label_en || a.labelEn || attr.name || ''
    : a.label_en || a.labelEn || a.label_de || a.labelDe || attr.name || ''
}

function flattenLeafAttributes(attributes: Attribute[] = []): Attribute[] {
  return attributes.flatMap((attr) => {
    if (Array.isArray(attr.attributes)) return flattenLeafAttributes(attr.attributes)
    return attr.name ? [attr] : []
  })
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-'
  if (Array.isArray(value)) return value.map(formatValue).join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  const raw = String(value)
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) return raw.split('T')[0]
  return raw
}

function valueAtPath(source: any, path: string): unknown {
  if (!path) return undefined
  return path.split('.').reduce((cursor, key) => cursor?.[key], source)
}

function setValueAtPath(
  source: Record<string, any>,
  path: Array<string | number>,
  value: any
): Record<string, any> {
  if (!path.length) return source
  const next = structuredClone(source ?? {})
  let cursor: any = next

  for (let i = 0; i < path.length - 1; i++) {
    const current = path[i]
    const following = path[i + 1]

    if (typeof current === 'number') {
      if (!Array.isArray(cursor)) break
      if (cursor[current] === undefined) {
        cursor[current] = typeof following === 'number' ? [] : {}
      }
      cursor = cursor[current]
    } else {
      if (cursor[current] === undefined || cursor[current] === null) {
        cursor[current] = typeof following === 'number' ? [] : {}
      }
      cursor = cursor[current]
    }
  }

  const leaf = path[path.length - 1]
  if (typeof leaf === 'number' && Array.isArray(cursor)) {
    cursor[leaf] = value
  } else if (typeof leaf === 'string') {
    cursor[leaf] = value
  }

  return next
}

function initialValueForAttribute(attr: Attribute): any {
  if (attr.type === 'boolean') return false
  if (attr.type === 'integer' || attr.type === 'number') return ''
  return ''
}

function buildInitialEntityData(attributes: Attribute[] = []): Record<string, any> {
  const data: Record<string, any> = {}

  attributes.forEach((attr) => {
    if (attr.layout === 'row' && Array.isArray(attr.attributes)) {
      Object.assign(data, buildInitialEntityData(attr.attributes))
      return
    }

    if (Array.isArray(attr.attributes)) {
      const nested = buildInitialEntityData(attr.attributes)
      if (attr.name) {
        data[attr.name] = attr.repeatable ? [nested] : nested
      } else {
        Object.assign(data, nested)
      }
      return
    }

    if (attr.name) data[attr.name] = initialValueForAttribute(attr)
  })

  return data
}


function isEmptyValue(value: unknown) {
  return value === undefined || value === null || String(value).trim() === ''
}

function normalizeValueForType(attr: Attribute, value: unknown) {
  if (isEmptyValue(value)) return value
  if (attr.type === 'integer') return Number.parseInt(String(value), 10)
  if (attr.type === 'number') return Number(value)
  return value
}

function validateLeafAttribute(
  attr: Attribute,
  value: unknown,
  label: string,
  t: ReturnType<typeof useTranslation>['t']
) {
  const errors: string[] = []
  if (attr.required && isEmptyValue(value)) {
    errors.push(t('identity:crud.requiredFieldError', { field: label }))
    return errors
  }

  if (isEmptyValue(value)) return errors

  if (attr.type === 'integer') {
    const numberValue = Number(value)
    if (!Number.isInteger(numberValue)) {
      errors.push(t('identity:crud.integerFieldError', { field: label }))
    }
  }

  if (attr.type === 'number') {
    const numberValue = Number(value)
    if (Number.isNaN(numberValue)) {
      errors.push(t('identity:crud.numberFieldError', { field: label }))
    }
  }

  if (attr.type === 'date' || attr.type === 'datetime') {
    const parsed = new Date(String(value))
    if (Number.isNaN(parsed.getTime())) {
      errors.push(t('identity:crud.dateFieldError', { field: label }))
    }
  }

  if (attr.type === 'boolean' && typeof value !== 'boolean') {
    errors.push(t('identity:crud.booleanFieldError', { field: label }))
  }

  const minimum = (attr as any).minimum
  const maximum = (attr as any).maximum
  if ((attr.type === 'integer' || attr.type === 'number') && !Number.isNaN(Number(value))) {
    const numberValue = Number(value)
    if (typeof minimum === 'number' && numberValue < minimum) {
      errors.push(t('identity:crud.minimumFieldError', { field: label, minimum }))
    }
    if (typeof maximum === 'number' && numberValue > maximum) {
      errors.push(t('identity:crud.maximumFieldError', { field: label, maximum }))
    }
  }

  const minLength = (attr as any).minLength
  const maxLength = (attr as any).maxLength
  if (typeof value === 'string') {
    if (typeof minLength === 'number' && value.length < minLength) {
      errors.push(t('identity:crud.minLengthFieldError', { field: label, minLength }))
    }
    if (typeof maxLength === 'number' && value.length > maxLength) {
      errors.push(t('identity:crud.maxLengthFieldError', { field: label, maxLength }))
    }
  }

  const enumValues = (attr as any).values ?? attr.enum ?? []
  if (Array.isArray(enumValues) && enumValues.length > 0 && !enumValues.includes(value as any)) {
    errors.push(t('identity:crud.enumFieldError', { field: label }))
  }

  return errors
}

function validateEntityData(
  attributes: Attribute[] = [],
  data: Record<string, any>,
  language: string,
  t: ReturnType<typeof useTranslation>['t']
) {
  const errors: string[] = []

  const walk = (attrs: Attribute[], context: any) => {
    attrs.forEach((attr) => {
      if (attr.layout === 'row' && Array.isArray(attr.attributes)) {
        walk(attr.attributes, context)
        return
      }

      if (Array.isArray(attr.attributes)) {
        const groupValue = attr.name ? context?.[attr.name] : context
        const entries = Array.isArray(groupValue) ? groupValue : [groupValue ?? {}]
        entries.forEach((entry) => walk(attr.attributes ?? [], entry ?? {}))
        return
      }

      if (!attr.name) return
      const label = resolveLabel(attr, language)
      errors.push(...validateLeafAttribute(attr, context?.[attr.name], label, t))
    })
  }

  walk(attributes, data)
  return errors
}

function coerceEntityDataTypes(
  attributes: Attribute[] = [],
  data: Record<string, any>
): Record<string, any> {
  const next = structuredClone(data ?? {})

  const walk = (attrs: Attribute[], context: any) => {
    attrs.forEach((attr) => {
      if (attr.layout === 'row' && Array.isArray(attr.attributes)) {
        walk(attr.attributes, context)
        return
      }

      if (Array.isArray(attr.attributes)) {
        const groupValue = attr.name ? context?.[attr.name] : context
        const entries = Array.isArray(groupValue) ? groupValue : [groupValue ?? {}]
        entries.forEach((entry) => walk(attr.attributes ?? [], entry ?? {}))
        return
      }

      if (!attr.name || !(attr.name in context)) return
      context[attr.name] = normalizeValueForType(attr, context[attr.name])
    })
  }

  walk(attributes, next)
  return next
}

export default function PreReg() {
  const navigate = useNavigate()
  const auth = useAuth()
  const { t, i18n } = useTranslation(['identity', 'entityBuilder', 'search'])
  const showToast = useToastStore((state) => state.show)
  const {
    selectedProject,
    setEntities,
    setEntityAttributes
  } = useProjectStore()

  const [typeDefinitions, setTypeDefinitions] = useState<EntityTypePayload[]>([])
  const [selectedTypeName, setSelectedTypeName] = useState<string>('')
  const [loadingTypes, setLoadingTypes] = useState(true)
  const [loadingInstances, setLoadingInstances] = useState(false)
  const [instances, setInstances] = useState<EntityInstance[]>([])
  const [query, setQuery] = useState('')
  const [resultLimit, setResultLimit] = useState(10)
  const [permissionAccess, setPermissionAccess] = useState<CachedUserAccess | null>(null)
  const [permissionsReady, setPermissionsReady] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>('view')
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [selectedInstance, setSelectedInstance] = useState<EntityInstance | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const selectedType = useMemo(
    () => typeDefinitions.find((type) => type.name === selectedTypeName) ?? null,
    [selectedTypeName, typeDefinitions]
  )

  const selectedSchemaAttributes = useMemo(
    () => (selectedType?.typeDefinition as any)?.attributes ?? [],
    [selectedType]
  )

  const displayAttributes = useMemo(
    () => flattenLeafAttributes(selectedSchemaAttributes).slice(0, 4),
    [selectedSchemaAttributes]
  )

  useEffect(() => {
    let active = true
    if (!auth.user?.access_token) {
      setPermissionAccess(null)
      setPermissionsReady(false)
      return () => {
        active = false
      }
    }

    setPermissionsReady(false)
    TrustDeck.instance().setToken(auth.user.access_token)
    getCurrentUserAccess(false)
      .then((access) => {
        if (active) setPermissionAccess(access)
      })
      .catch((error) => {
        console.warn('Could not load entity instance permissions', error)
        if (active) setPermissionAccess(null)
      })
      .finally(() => {
        if (active) setPermissionsReady(true)
      })

    return () => {
      active = false
    }
  }, [auth.user?.access_token])

  const selectedProjectAbbreviation = selectedProject?.abbreviation
  const canSearchInstances = canUseProjectAction(
    permissionAccess,
    selectedProjectAbbreviation,
    'instance:search'
  )
  const canCreateInstances = canUseProjectAction(
    permissionAccess,
    selectedProjectAbbreviation,
    'instance:create'
  )
  const canReadInstances = canUseProjectAction(
    permissionAccess,
    selectedProjectAbbreviation,
    'instance:read'
  ) || canSearchInstances
  const canUpdateInstances = canUseProjectAction(
    permissionAccess,
    selectedProjectAbbreviation,
    'instance:update'
  )
  const canDeleteInstances = canUseProjectAction(
    permissionAccess,
    selectedProjectAbbreviation,
    'instance:delete'
  )
  const permissionLoadingOrDenied = !permissionsReady || !canSearchInstances

  const visibleInstances = useMemo(
    () => instances.slice(0, resultLimit),
    [instances, resultLimit]
  )

  const resultLimitOptions = [10, 20, 50, 100]

  const fetchTypes = useCallback(async () => {
    if (!selectedProject?.abbreviation) {
      setLoadingTypes(false)
      setTypeDefinitions([])
      return
    }

    setLoadingTypes(true)
    try {
      const fetched = await TrustDeck.instance().getProjectEntities('*')
      const definitions = fetched
        .map(asTypeDefinition)
        .filter((type) => typeof type.name === 'string' && type.name.trim())

      setTypeDefinitions(definitions)
      setEntities(definitions.map((type) => type.name))
      setEntityAttributes(
        definitions.map((type) => ({
          name: type.name,
          typeDefinition: {
            attributes: ((type.typeDefinition as any)?.attributes ?? []) as Attribute[]
          }
        }))
      )
      setSelectedTypeName((current) => {
        if (current && definitions.some((type) => type.name === current)) return current
        return definitions[0]?.name ?? ''
      })
    } catch (error) {
      console.error('Failed to load entity types', error)
      setTypeDefinitions([])
      showToast({
        severity: 'error',
        summary: t('identity:crud.loadTypes'),
        detail: error instanceof Error ? error.message : t('identity:crud.loadTypesFailed'),
        life: 5000
      })
    } finally {
      setLoadingTypes(false)
    }
  }, [selectedProject?.abbreviation, setEntities, setEntityAttributes, showToast, t])

  const normalizeInstance = useCallback((entry: any): EntityInstance => {
    const data = entry?.data && typeof entry.data === 'object' ? entry.data : entry ?? {}
    return {
      ...entry,
      data,
      entityTypeName: entry?.entityTypeName ?? selectedTypeName,
      type: entry?.type ?? selectedTypeName
    }
  }, [selectedTypeName])

  const searchInstances = useCallback(async (typeName = selectedTypeName, searchQuery = query) => {
    if (!typeName) return
    if (!canSearchInstances) {
      if (permissionsReady) {
        showToast({
          severity: 'warn',
          summary: t('identity:crud.search'),
          detail: t('identity:crud.noSearchPermission'),
          life: 4000
        })
      }
      return
    }

    setLoadingInstances(true)
    try {
      const normalizedQuery = searchQuery?.trim()
      const result = await TrustDeck.instance().searchEntities(
        typeName,
        normalizedQuery || '*'
      )
      setInstances(Array.isArray(result) ? result.map(normalizeInstance) : [])
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('404')) {
        setInstances([])
      } else {
        console.error('Failed to load entity instances', error)
        showToast({
          severity: 'error',
          summary: t('identity:crud.search'),
          detail: error instanceof Error ? error.message : t('identity:crud.searchFailed'),
          life: 5000
        })
      }
    } finally {
      setLoadingInstances(false)
    }
  }, [canSearchInstances, normalizeInstance, permissionsReady, query, selectedTypeName, showToast, t])

  useEffect(() => {
    fetchTypes()
  }, [fetchTypes])

  useEffect(() => {
    setInstances([])
    setSelectedInstance(null)
    setQuery('')
    if (selectedTypeName && permissionsReady && canSearchInstances) {
      searchInstances(selectedTypeName, '*')
    }
  }, [canSearchInstances, permissionsReady, selectedTypeName]) // eslint-disable-line react-hooks/exhaustive-deps

  const openCreateModal = () => {
    if (!selectedType) return
    if (!canCreateInstances) {
      showToast({
        severity: 'warn',
        summary: t('identity:crud.create'),
        detail: t('identity:crud.noCreatePermission'),
        life: 4000
      })
      return
    }
    setModalMode('create')
    setSelectedInstance(null)
    setFormData(buildInitialEntityData(selectedSchemaAttributes))
    setModalOpen(true)
  }

  const openViewModal = (instance: EntityInstance) => {
    if (!canReadInstances) {
      showToast({
        severity: 'warn',
        summary: t('identity:crud.view'),
        detail: t('identity:crud.noReadPermission'),
        life: 4000
      })
      return
    }
    setModalMode('view')
    setSelectedInstance(instance)
    setFormData(instance.data ?? {})
    setModalOpen(true)
  }

  const openEditModal = (instance: EntityInstance) => {
    if (!canUpdateInstances) {
      showToast({
        severity: 'warn',
        summary: t('identity:crud.edit'),
        detail: t('identity:crud.noUpdatePermission'),
        life: 4000
      })
      return
    }
    setModalMode('edit')
    setSelectedInstance(instance)
    setFormData(
      selectedSchemaAttributes.length
        ? pickSchemaData(selectedSchemaAttributes, instance.data ?? {})
        : instance.data ?? {}
    )
    setModalOpen(true)
  }

  const closeModal = () => {
    if (saving) return
    setModalOpen(false)
  }

  const handleFieldChange = (path: Array<string | number>, value: any) => {
    setFormData((prev) => setValueAtPath(prev, path, value))
  }

  const handleSave = async () => {
    if (!selectedTypeName) return

    if (modalMode === 'create' && !canCreateInstances) {
      showToast({
        severity: 'warn',
        summary: t('identity:crud.create'),
        detail: t('identity:crud.noCreatePermission'),
        life: 4000
      })
      return
    }

    if (modalMode === 'edit' && !canUpdateInstances) {
      showToast({
        severity: 'warn',
        summary: t('identity:crud.update'),
        detail: t('identity:crud.noUpdatePermission'),
        life: 4000
      })
      return
    }

    const pickedData = selectedSchemaAttributes.length
      ? pickSchemaData(selectedSchemaAttributes, formData)
      : formData
    const validationErrors = validateEntityData(
      selectedSchemaAttributes,
      pickedData,
      i18n.language,
      t
    )

    if (validationErrors.length > 0) {
      showToast({
        severity: 'warn',
        summary: t('identity:crud.validationFailed'),
        detail: validationErrors.slice(0, 3).join(' '),
        life: 6000
      })
      return
    }

    setSaving(true)
    try {
      const dataToSave = selectedSchemaAttributes.length
        ? coerceEntityDataTypes(selectedSchemaAttributes, pickedData)
        : pickedData

      if (modalMode === 'create') {
        const created = await TrustDeck.instance().postEntity(selectedTypeName, {
          data: dataToSave
        })
        const normalized = normalizeInstance(created)
        setInstances((current) => [normalized, ...current])
        setSelectedInstance(normalized)
        setModalMode('view')
        setFormData(normalized.data ?? dataToSave)
        showToast({
          severity: 'success',
          summary: t('identity:crud.create'),
          detail: t('identity:crud.createSuccess'),
          life: 3000
        })
      } else if (modalMode === 'edit' && selectedInstance) {
        const identifier = entityId(selectedInstance)
        await TrustDeck.instance().putEntity(selectedTypeName, { data: dataToSave }, identifier)
        const updated = { ...selectedInstance, data: dataToSave }
        setInstances((current) =>
          current.map((entry) => (entityId(entry) === identifier ? updated : entry))
        )
        setSelectedInstance(updated)
        setModalMode('view')
        setFormData(dataToSave)
        showToast({
          severity: 'success',
          summary: t('identity:crud.update'),
          detail: t('identity:crud.updateSuccess'),
          life: 3000
        })
      }
    } catch (error) {
      console.error('Failed to save entity instance', error)
      showToast({
        severity: 'error',
        summary: t('identity:crud.save'),
        detail: error instanceof Error ? error.message : t('identity:crud.saveFailed'),
        life: 5000
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedTypeName || !selectedInstance) return
    if (!canDeleteInstances) {
      showToast({
        severity: 'warn',
        summary: t('identity:crud.delete'),
        detail: t('identity:crud.noDeletePermission'),
        life: 4000
      })
      setDeleteConfirmOpen(false)
      return
    }

    setDeleting(true)
    try {
      const identifier = entityId(selectedInstance)
      await TrustDeck.instance().deleteEntity(selectedTypeName, identifier)
      setInstances((current) => current.filter((entry) => entityId(entry) !== identifier))
      setDeleteConfirmOpen(false)
      setModalOpen(false)
      setSelectedInstance(null)
      showToast({
        severity: 'success',
        summary: t('identity:crud.delete'),
        detail: t('identity:crud.deleteSuccess'),
        life: 3000
      })
    } catch (error) {
      console.error('Failed to delete entity instance', error)
      showToast({
        severity: 'error',
        summary: t('identity:crud.delete'),
        detail: error instanceof Error ? error.message : t('identity:crud.deleteFailed'),
        life: 5000
      })
    } finally {
      setDeleting(false)
    }
  }

  const instanceSummary = (instance: EntityInstance) => {
    const data = instance.data ?? {}
    const firstDisplayAttribute = displayAttributes.find((attr) => attr.name && valueAtPath(data, attr.name) !== undefined)
    const value = firstDisplayAttribute?.name ? valueAtPath(data, firstDisplayAttribute.name) : undefined
    return formatValue(value === undefined ? entityId(instance) : value)
  }

  const modalTitle =
    modalMode === 'create'
      ? t('identity:crud.createEntity', { type: selectedTypeName })
      : modalMode === 'edit'
        ? t('identity:crud.editEntity', { type: selectedTypeName })
        : t('identity:crud.viewEntity', { type: selectedTypeName })

  const handleSearchClick = () => {
    if (!query.trim()) {
      showToast({
        severity: 'warn',
        summary: t('identity:crud.search'),
        detail: t('identity:crud.enterSearchTerm'),
        life: 3500
      })
      return
    }
    searchInstances(selectedTypeName, query)
  }

  const handleListAllClick = () => {
    searchInstances(selectedTypeName, '*')
  }

  return (
    <div className="w-full">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-2 sm:px-4">
        <div className="text-center">
          <h1 className="mb-2">{t('identity:crud.title')}</h1>
          <p className="mx-auto max-w-3xl text-gray-600 dark:text-gray-300">
            {t('identity:crud.subtitle')}
          </p>
        </div>

        <Panel noMaxWidth title={t('identity:crud.availableTypes')}>
          {loadingTypes ? (
            <div className="py-10 text-center text-gray-500 dark:text-gray-300">
              {t('entityBuilder:loadingEntityTypes')}
            </div>
          ) : typeDefinitions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {t('entityBuilder:noEntityTypesTitle')}
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-gray-600 dark:text-gray-300">
                {t('entityBuilder:noEntityTypesIdentityDetail')}
              </p>
              <div className="mt-6 flex justify-center">
                <PrimaryButton
                  label={t('entityBuilder:openEntityBuilder')}
                  onClick={() => navigate('/entity/manager/new')}
                />
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-slate-700">
                <thead>
                  <tr className="text-gray-600 dark:text-gray-300">
                    <th className="px-4 py-3 font-semibold">{t('identity:crud.typeName')}</th>
                    <th className="px-4 py-3 font-semibold">{t('identity:crud.version')}</th>
                    <th className="px-4 py-3 font-semibold">{t('identity:crud.associatedGroup')}</th>
                    <th className="px-4 py-3 font-semibold">{t('identity:crud.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {typeDefinitions.map((type) => {
                    const selected = type.name === selectedTypeName
                    return (
                      <tr
                        key={`${type.name}-${type.version}`}
                        className={`cursor-pointer transition hover:bg-gray-50 dark:hover:bg-slate-800 ${
                          selected ? 'bg-blue-50 dark:bg-slate-800' : ''
                        }`}
                        onClick={() => setSelectedTypeName(type.name)}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                          {type.name}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {type.version || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {type.associatedDomainName || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${statusClasses(type)}`}>
                            {statusLabel(type, t)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {selectedType && (
          <Panel
            noMaxWidth
            title={t('identity:crud.instancesTitle', { type: selectedType.name })}
          >
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                <CustomFloatLabel
                  id="identity-entity-instance-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('identity:crud.searchPlaceholder')}
                />
                <div className="flex flex-wrap justify-end gap-2">
                  <PrimaryButton
                    label={t('identity:crud.search')}
                    onClick={handleSearchClick}
                    icon={<MagnifyingGlassIcon className="h-5 w-5 mr-1" />}
                    loading={loadingInstances}
                    disabled={permissionLoadingOrDenied}
                    tooltip={permissionLoadingOrDenied ? t('identity:crud.noSearchPermission') : undefined}
                  />
                  <PrimaryOutlinedButton
                    label={t('identity:crud.listAll')}
                    onClick={handleListAllClick}
                    icon={<ArrowPathIcon className="h-5 w-5 mr-1" />}
                    disabled={loadingInstances || permissionLoadingOrDenied}
                    tooltip={permissionLoadingOrDenied ? t('identity:crud.noSearchPermission') : undefined}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                <span className="text-gray-600 dark:text-gray-300">
                  {t('identity:crud.resultSummary', {
                    shown: Math.min(instances.length, resultLimit),
                    total: instances.length
                  })}
                </span>
                <label className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                  <span>{t('identity:crud.resultsLimit')}</span>
                  <select
                    value={resultLimit}
                    onChange={(event) => setResultLimit(Number(event.target.value))}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-gray-100"
                  >
                    {resultLimitOptions.map((limit) => (
                      <option key={limit} value={limit}>{limit}</option>
                    ))}
                  </select>
                </label>
              </div>

              <Divider />

              {loadingInstances ? (
                <div className="py-10 text-center text-gray-500 dark:text-gray-300">
                  {t('identity:crud.loadingInstances')}
                </div>
              ) : instances.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {t('identity:crud.noInstances')}
                  </h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-300">
                    {t('identity:crud.noInstancesHint')}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-slate-700">
                  <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-slate-700">
                    <thead className="bg-gray-50 dark:bg-slate-900">
                      <tr className="text-gray-600 dark:text-gray-300">
                        <th className="px-4 py-3 font-semibold">{t('identity:crud.identifier')}</th>
                        <th className="px-4 py-3 font-semibold">{t('identity:crud.summary')}</th>
                        {displayAttributes.map((attr) => (
                          <th key={attr.name} className="px-4 py-3 font-semibold">
                            {resolveLabel(attr, i18n.language)}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-right font-semibold">{t('identity:crud.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {visibleInstances.map((instance, index) => {
                        const id = entityId(instance) || `${selectedType.name}-${index}`
                        return (
                          <tr key={id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                            <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                              {id || '-'}
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                              {instanceSummary(instance)}
                            </td>
                            {displayAttributes.map((attr) => (
                              <td key={`${id}-${attr.name}`} className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                {formatValue(attr.name ? valueAtPath(instance.data, attr.name) : undefined)}
                              </td>
                            ))}
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-2">
                                <PrimaryOutlinedButton
                                  label={t('identity:crud.view')}
                                  onClick={() => openViewModal(instance)}
                                  icon={<EyeIcon className="h-5 w-5 mr-1" />}
                                  disabled={!canReadInstances}
                                  tooltip={!canReadInstances ? t('identity:crud.noReadPermission') : undefined}
                                />
                                <PrimaryOutlinedButton
                                  label={t('identity:crud.edit')}
                                  onClick={() => openEditModal(instance)}
                                  icon={<PencilIcon className="h-5 w-5 mr-1" />}
                                  disabled={!canUpdateInstances}
                                  tooltip={!canUpdateInstances ? t('identity:crud.noUpdatePermission') : undefined}
                                />
                                <SecondaryOutlinedButton
                                  label={t('identity:crud.delete')}
                                  onClick={() => {
                                    setSelectedInstance(instance)
                                    setDeleteConfirmOpen(true)
                                  }}
                                  icon={<TrashIcon className="h-5 w-5 mr-1" />}
                                  disabled={!canDeleteInstances}
                                  tooltip={!canDeleteInstances ? t('identity:crud.noDeletePermission') : undefined}
                                />
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-center pt-2">
                <PrimaryButton
                  label={t('identity:crud.addEntityInstance')}
                  onClick={openCreateModal}
                  icon={<PlusIcon className="h-5 w-5 mr-1" />}
                  disabled={!canCreateInstances}
                  tooltip={!canCreateInstances ? t('identity:crud.noCreatePermission') : undefined}
                />
              </div>
            </div>
          </Panel>
        )}
      </div>

      <Dialog
        visible={modalOpen}
        onHide={closeModal}
        header={modalTitle}
        closable
        dismissableMask={!saving}
        style={{ width: '1180px', maxWidth: '95vw' }}
        className="mx-auto"
      >
        <div className="flex flex-col gap-4">
          {selectedSchemaAttributes.length > 0 ? (
            <DynamicEntity
              entity={{
                ...(selectedInstance ?? {}),
                data: formData,
                entityTypeName: selectedTypeName,
                type: selectedTypeName,
                trustdeckID: entityId(selectedInstance) || ''
              }}
              schemaAttributes={selectedSchemaAttributes}
              editMode={modalMode !== 'view'}
              formData={formData}
              onFieldChange={handleFieldChange}
              showIdentifierPanel={modalMode !== 'create'}
            />
          ) : (
            <p className="rounded-lg border border-dashed border-gray-300 p-4 text-gray-600 dark:border-slate-700 dark:text-gray-300">
              {t('search:noEntitySchema')}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <PrimaryOutlinedButton
              label={modalMode === 'view' ? t('identity:crud.close') : t('identity:crud.cancel')}
              onClick={closeModal}
              icon={<XMarkIcon className="h-5 w-5 mr-1" />}
              disabled={saving}
            />
            {modalMode === 'view' && selectedInstance && (
              <PrimaryButton
                label={t('identity:crud.edit')}
                onClick={() => openEditModal(selectedInstance)}
                disabled={!canUpdateInstances}
                tooltip={!canUpdateInstances ? t('identity:crud.noUpdatePermission') : undefined}
                icon={<PencilIcon className="h-5 w-5 mr-1" />}
              />
            )}
            {modalMode !== 'view' && (
              <PrimaryButton
                label={modalMode === 'create' ? t('identity:crud.create') : t('identity:crud.save')}
                onClick={handleSave}
                loading={saving}
                disabled={
                  !selectedTypeName ||
                  selectedSchemaAttributes.length === 0 ||
                  (modalMode === 'create' && !canCreateInstances) ||
                  (modalMode === 'edit' && !canUpdateInstances)
                }
                icon={<CheckIcon className="h-5 w-5 mr-1" />}
              />
            )}
          </div>
        </div>
      </Dialog>

      <Dialog
        visible={deleteConfirmOpen}
        onHide={() => setDeleteConfirmOpen(false)}
        header={t('identity:crud.confirmDeleteTitle')}
        closable
        dismissableMask={!deleting}
        style={{ width: '520px', maxWidth: '95vw' }}
      >
        <div className="flex flex-col gap-4">
          <p>{t('identity:crud.confirmDeleteText')}</p>
          <div className="flex justify-end gap-2">
            <PrimaryOutlinedButton
              label={t('identity:crud.cancel')}
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleting}
            />
            <SecondaryOutlinedButton
              label={t('identity:crud.delete')}
              onClick={handleDelete}
              loading={deleting}
            />
          </div>
        </div>
      </Dialog>
    </div>
  )
}
