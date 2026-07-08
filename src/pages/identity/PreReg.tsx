import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog } from 'primereact/dialog'
import { useTranslation } from 'react-i18next'
import { useAuth } from 'react-oidc-context'
import {
  CheckIcon,
  EyeIcon,
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
import TrustDeck, {
  EntityTypePayload,
  TrustDeckHttpError
} from '../../core/services/TrustDeck'
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


type IconActionButtonProps = {
  title: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
  variant?: 'primary' | 'danger'
}

function IconActionButton({
  title,
  onClick,
  disabled = false,
  children,
  variant = 'primary'
}: IconActionButtonProps) {
  const colorClasses =
    variant === 'danger'
      ? 'border-color-coral text-color-coral hover:bg-red-50 dark:hover:bg-red-950'
      : 'border-color-blue text-color-blue hover:bg-blue-50 dark:hover:bg-slate-800'

  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border-2 bg-white transition disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-950 ${colorClasses}`}
    >
      {children}
    </button>
  )
}

function parseTypeDefinition(typeDefinition: unknown): any {
  if (typeof typeDefinition !== 'string')
    return typeDefinition ?? { attributes: [] }

  try {
    return JSON.parse(typeDefinition)
  } catch {
    return { attributes: [] }
  }
}

function asTypeDefinition(
  entry: EntityTypePayload | string
): EntityTypePayload {
  if (typeof entry === 'string') {
    return {
      name: entry,
      version: '',
      typeDefinition: { attributes: [] }
    }
  }
  return {
    ...entry,
    typeDefinition: parseTypeDefinition(entry.typeDefinition)
  }
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

function permissionActionValue(permission: Record<string, any>) {
  return String(
    permission.action ??
      permission.operation ??
      permission.permission ??
      permission.name ??
      ''
  ).toLowerCase()
}

function hasInstancePermissionEvidence(
  access: CachedUserAccess | null | undefined
) {
  if (!access) return false

  const hasRelevantRole = (access.roles ?? []).some((role) => {
    const normalized = String(role).toLowerCase()
    return (
      normalized.includes('instance') ||
      normalized.includes('trustdeck-admin') ||
      normalized.includes('project-admin') ||
      normalized === 'admin' ||
      normalized === 'administrator' ||
      normalized === 'realm-admin' ||
      normalized === 'backend-admin'
    )
  })

  if (hasRelevantRole) return true

  return (access.effectivePermissions ?? []).some((permission) => {
    const action = permissionActionValue(permission as Record<string, any>)
    const resourceType = String(
      permission.resourceType ??
        permission.resource ??
        permission.scope ??
        permission.type ??
        ''
    ).toLowerCase()
    return (
      action.includes('instance') ||
      action === '*' ||
      action === 'all' ||
      action.includes('crud') ||
      resourceType === 'project' ||
      resourceType === 'global'
    )
  })
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
    if (Array.isArray(attr.attributes))
      return flattenLeafAttributes(attr.attributes)
    return attr.name ? [attr] : []
  })
}

function isNamedDataGroup(attr: Attribute): boolean {
  return (attr as any).layout === 'group' && Boolean(attr.name)
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

function buildInitialEntityData(
  attributes: Attribute[] = []
): Record<string, any> {
  const data: Record<string, any> = {}

  attributes.forEach((attr) => {
    if (attr.layout === 'row' && Array.isArray(attr.attributes)) {
      Object.assign(data, buildInitialEntityData(attr.attributes))
      return
    }

    if (Array.isArray(attr.attributes)) {
      const nested = buildInitialEntityData(attr.attributes)
      if (isNamedDataGroup(attr) && attr.name) {
        data[attr.name] = attr.repeatable ? [nested] : nested
      } else {
        Object.assign(data, nested)
      }
      return
    }

    if (attr.name) {
      data[attr.name] = isRepeatableLeaf(attr)
        ? [initialValueForAttribute(attr)]
        : initialValueForAttribute(attr)
    }
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

function asRepeatableValues(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (isEmptyValue(value)) return []
  return [value]
}

function isRepeatableLeaf(attr: Attribute) {
  return Boolean(attr.repeatable && !Array.isArray(attr.attributes))
}

function validateSingleLeafValue(
  attr: Attribute,
  value: unknown,
  label: string,
  t: ReturnType<typeof useTranslation>['t'],
  required = Boolean(attr.required)
) {
  const errors: string[] = []
  if (required && isEmptyValue(value)) {
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
  if (
    (attr.type === 'integer' || attr.type === 'number') &&
    !Number.isNaN(Number(value))
  ) {
    const numberValue = Number(value)
    if (typeof minimum === 'number' && numberValue < minimum) {
      errors.push(
        t('identity:crud.minimumFieldError', { field: label, minimum })
      )
    }
    if (typeof maximum === 'number' && numberValue > maximum) {
      errors.push(
        t('identity:crud.maximumFieldError', { field: label, maximum })
      )
    }
  }

  const minLength = (attr as any).minLength
  const maxLength = (attr as any).maxLength
  if (typeof value === 'string') {
    if (typeof minLength === 'number' && value.length < minLength) {
      errors.push(
        t('identity:crud.minLengthFieldError', { field: label, minLength })
      )
    }
    if (typeof maxLength === 'number' && value.length > maxLength) {
      errors.push(
        t('identity:crud.maxLengthFieldError', { field: label, maxLength })
      )
    }
  }

  const enumValues = (attr as any).values ?? attr.enum ?? []
  if (
    Array.isArray(enumValues) &&
    enumValues.length > 0 &&
    !enumValues.includes(value as any)
  ) {
    errors.push(t('identity:crud.enumFieldError', { field: label }))
  }

  return errors
}

function validateLeafAttribute(
  attr: Attribute,
  value: unknown,
  label: string,
  t: ReturnType<typeof useTranslation>['t']
) {
  if (!isRepeatableLeaf(attr)) {
    return validateSingleLeafValue(attr, value, label, t)
  }

  const values = asRepeatableValues(value).filter((entry) => !isEmptyValue(entry))
  if (attr.required && values.length === 0) {
    return [t('identity:crud.requiredFieldError', { field: label })]
  }

  return values.flatMap((entry, index) =>
    validateSingleLeafValue(
      { ...attr, repeatable: false },
      entry,
      `${label} ${index + 1}`,
      t,
      false
    )
  )
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
        const dataGroup = isNamedDataGroup(attr)
        const groupValue =
          dataGroup && attr.name ? context?.[attr.name] : context
        const entries = Array.isArray(groupValue)
          ? groupValue
          : [groupValue ?? {}]
        entries.forEach((entry) => walk(attr.attributes ?? [], entry ?? {}))
        return
      }

      if (!attr.name) return
      const label = resolveLabel(attr, language)
      errors.push(
        ...validateLeafAttribute(attr, context?.[attr.name], label, t)
      )
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
        const dataGroup = isNamedDataGroup(attr)
        const groupValue =
          dataGroup && attr.name ? context?.[attr.name] : context
        const entries = Array.isArray(groupValue)
          ? groupValue
          : [groupValue ?? {}]
        entries.forEach((entry) => walk(attr.attributes ?? [], entry ?? {}))
        return
      }

      if (!attr.name || !(attr.name in context)) return
      const value = context[attr.name]
      if (isRepeatableLeaf(attr)) {
        context[attr.name] = asRepeatableValues(value)
          .filter((entry) => !isEmptyValue(entry))
          .map((entry) => normalizeValueForType({ ...attr, repeatable: false }, entry))
        return
      }
      context[attr.name] = normalizeValueForType(attr, value)
    })
  }

  walk(attributes, next)
  return next
}

function shouldKeepOptionalEmpty(attr: Attribute) {
  return Boolean(attr.required)
}

function pruneEmptyOptionalEntityData(
  attributes: Attribute[] = [],
  data: Record<string, any>
): Record<string, any> {
  const pruneAttributes = (
    attrs: Attribute[],
    context: any
  ): Record<string, any> => {
    const result: Record<string, any> = {}

    attrs.forEach((attr) => {
      if (attr.layout === 'row' && Array.isArray(attr.attributes)) {
        Object.assign(result, pruneAttributes(attr.attributes, context ?? {}))
        return
      }

      if (Array.isArray(attr.attributes)) {
        const dataGroup = isNamedDataGroup(attr)
        if (!dataGroup || !attr.name) {
          Object.assign(result, pruneAttributes(attr.attributes, context ?? {}))
          return
        }

        const groupValue = context?.[attr.name]
        if (groupValue === undefined || groupValue === null) {
          if (attr.required) result[attr.name] = groupValue
          return
        }

        if (Array.isArray(groupValue)) {
          const prunedEntries = groupValue
            .map((entry) => pruneAttributes(attr.attributes ?? [], entry ?? {}))
            .filter((entry) => Object.keys(entry).length > 0 || attr.required)

          if (prunedEntries.length > 0 || attr.required) {
            result[attr.name] = prunedEntries
          }
          return
        }

        if (typeof groupValue === 'object') {
          const prunedGroup = pruneAttributes(attr.attributes ?? [], groupValue)
          if (Object.keys(prunedGroup).length > 0 || attr.required) {
            result[attr.name] = prunedGroup
          }
          return
        }

        if (!isEmptyValue(groupValue) || attr.required) {
          result[attr.name] = groupValue
        }
        return
      }

      if (
        !attr.name ||
        !Object.prototype.hasOwnProperty.call(context ?? {}, attr.name)
      )
        return
      const value = context[attr.name]
      if (isRepeatableLeaf(attr)) {
        const values = asRepeatableValues(value).filter((entry) => !isEmptyValue(entry))
        if (values.length === 0 && !shouldKeepOptionalEmpty(attr)) return
        result[attr.name] = values
        return
      }
      if (isEmptyValue(value) && !shouldKeepOptionalEmpty(attr)) return
      result[attr.name] = value
    })

    return result
  }

  return pruneAttributes(attributes, data ?? {})
}

function pseudonymsToLinks(
  pseudonyms: any[] = []
): Array<{
  group: string
  pseudonym: string
  children?: Array<{ group: string; pseudonym: string; children?: any[] }>
}> {
  return pseudonyms
    .map((pseudonym) => ({
      group: pseudonym?.domainName ?? pseudonym?.group ?? '',
      pseudonym: pseudonym?.psn ?? pseudonym?.pseudonym ?? '',
      children: Array.isArray(pseudonym?.children)
        ? pseudonymsToLinks(pseudonym.children)
        : undefined
    }))
    .filter((link) => link.group || link.pseudonym)
}

export default function PreReg() {
  const navigate = useNavigate()
  const auth = useAuth()
  const { t, i18n } = useTranslation(['identity', 'entityBuilder', 'search'])
  const showToast = useToastStore((state) => state.show)
  const { selectedProject, setEntities, setEntityAttributes } =
    useProjectStore()

  const [typeDefinitions, setTypeDefinitions] = useState<EntityTypePayload[]>(
    []
  )
  const [selectedTypeName, setSelectedTypeName] = useState<string>('')
  const [loadingTypes, setLoadingTypes] = useState(true)
  const [loadingInstances, setLoadingInstances] = useState(false)
  const [instances, setInstances] = useState<EntityInstance[]>([])
  const [hasSearchedInstances, setHasSearchedInstances] = useState(false)
  const [query, setQuery] = useState('')
  const [resultLimit, setResultLimit] = useState(10)
  const [permissionAccess, setPermissionAccess] =
    useState<CachedUserAccess | null>(null)
  const [directProjectPermissions, setDirectProjectPermissions] = useState<
    Record<string, any>[]
  >([])
  const [permissionsReady, setPermissionsReady] = useState(false)
  const [backendDeniedActions, setBackendDeniedActions] = useState<string[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>('view')
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [selectedInstance, setSelectedInstance] =
    useState<EntityInstance | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const selectedType = useMemo(
    () =>
      typeDefinitions.find((type) => type.name === selectedTypeName) ?? null,
    [selectedTypeName, typeDefinitions]
  )

  const selectedSchemaAttributes = useMemo(() => {
    const definition = parseTypeDefinition(selectedType?.typeDefinition)
    return Array.isArray(definition?.attributes) ? definition.attributes : []
  }, [selectedType])

  const displayAttributes = useMemo(
    () =>
      flattenLeafAttributes(selectedSchemaAttributes)
        .filter((attr) => Boolean(attr.required))
        .slice(0, 3),
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

  useEffect(() => {
    // Do not call the permission-management endpoint from Identity Management.
    // That endpoint is not available to all users and can return 404/403 even
    // when the user is allowed to work with entity instances. Token roles and
    // cached effective permissions are used for optimistic UI hints; the backend
    // remains the source of truth for every instance CRUD request.
    setDirectProjectPermissions([])
  }, [permissionAccess, permissionsReady, selectedProjectAbbreviation])

  useEffect(() => {
    setBackendDeniedActions([])
  }, [selectedProjectAbbreviation, auth.user?.access_token])

  const effectivePermissionAccess = useMemo<CachedUserAccess | null>(() => {
    if (!permissionAccess) return null
    return {
      ...permissionAccess,
      effectivePermissions: [
        ...(permissionAccess.effectivePermissions ?? []),
        ...directProjectPermissions
      ]
    }
  }, [directProjectPermissions, permissionAccess])

  const markBackendDenied = useCallback((action: string) => {
    setBackendDeniedActions((current) =>
      current.includes(action) ? current : [...current, action]
    )
  }, [])

  const isBackendDenied = useCallback(
    (action: string) => backendDeniedActions.includes(action),
    [backendDeniedActions]
  )

  const permissionEvidenceAvailable = hasInstancePermissionEvidence(
    effectivePermissionAccess
  )
  const canSearchByPermission = canUseProjectAction(
    effectivePermissionAccess,
    selectedProjectAbbreviation,
    'instance:search'
  )
  const canSearchInstances =
    permissionsReady &&
    !isBackendDenied('instance:search') &&
    (canSearchByPermission || !permissionEvidenceAvailable)
  const canCreateByPermission = canUseProjectAction(
    effectivePermissionAccess,
    selectedProjectAbbreviation,
    'instance:create'
  )
  const canCreateInstances =
    permissionsReady &&
    !isBackendDenied('instance:create') &&
    (canCreateByPermission || !permissionEvidenceAvailable)
  const canReadByPermission = canUseProjectAction(
    effectivePermissionAccess,
    selectedProjectAbbreviation,
    'instance:read'
  )
  const canReadInstances =
    permissionsReady &&
    !isBackendDenied('instance:read') &&
    (canReadByPermission || canSearchInstances || !permissionEvidenceAvailable)
  const canUpdateByPermission = canUseProjectAction(
    effectivePermissionAccess,
    selectedProjectAbbreviation,
    'instance:update'
  )
  const canUpdateInstances =
    permissionsReady &&
    !isBackendDenied('instance:update') &&
    (canUpdateByPermission || !permissionEvidenceAvailable)
  const canDeleteByPermission = canUseProjectAction(
    effectivePermissionAccess,
    selectedProjectAbbreviation,
    'instance:delete'
  )
  const canDeleteInstances =
    permissionsReady &&
    !isBackendDenied('instance:delete') &&
    (canDeleteByPermission || !permissionEvidenceAvailable)
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
            attributes: ((type.typeDefinition as any)?.attributes ??
              []) as Attribute[]
          }
        }))
      )
      setSelectedTypeName((current) => {
        if (current && definitions.some((type) => type.name === current))
          return current
        return definitions[0]?.name ?? ''
      })
    } catch (error) {
      console.error('Failed to load entity types', error)
      setTypeDefinitions([])
      showToast({
        severity: 'error',
        summary: t('identity:crud.loadTypes'),
        detail:
          error instanceof Error
            ? error.message
            : t('identity:crud.loadTypesFailed'),
        life: 5000
      })
    } finally {
      setLoadingTypes(false)
    }
  }, [
    selectedProject?.abbreviation,
    setEntities,
    setEntityAttributes,
    showToast,
    t
  ])

  const normalizeInstance = useCallback(
    (entry: any): EntityInstance => {
      const data =
        entry?.data && typeof entry.data === 'object'
          ? entry.data
          : (entry ?? {})
      return {
        ...entry,
        data,
        entityTypeName: entry?.entityTypeName ?? selectedTypeName,
        type: entry?.type ?? selectedTypeName
      }
    },
    [selectedTypeName]
  )

  const attachPseudonymLinks = useCallback(
    async (instance: EntityInstance) => {
      const identifier = entityId(instance)
      if (!selectedTypeName || !identifier) return instance

      try {
        const pseudonyms = await TrustDeck.instance().getEntityPseudonyms(
          selectedTypeName,
          identifier,
          selectedProject?.abbreviation
        )
        return {
          ...instance,
          links: pseudonymsToLinks(Array.isArray(pseudonyms) ? pseudonyms : [])
        }
      } catch (error) {
        if (
          error instanceof TrustDeckHttpError &&
          [403, 404, 422].includes(error.status)
        ) {
          return instance
        }
        return instance
      }
    },
    [selectedProject?.abbreviation, selectedTypeName]
  )

  const searchInstances = useCallback(
    async (typeName = selectedTypeName, searchQuery = query) => {
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
      setHasSearchedInstances(true)
      try {
        const normalizedQuery = searchQuery?.trim() || '*'
        const result = await TrustDeck.instance().searchEntities(
          typeName,
          normalizedQuery
        )
        setInstances(Array.isArray(result) ? result.map(normalizeInstance) : [])
      } catch (error) {
        if (error instanceof TrustDeckHttpError && error.status === 403) {
          markBackendDenied('instance:search')
          setInstances([])
          showToast({
            severity: 'warn',
            summary: t('identity:crud.search'),
            detail: t('identity:crud.noSearchPermission'),
            life: 5000
          })
          return
        }

        const message = error instanceof Error ? error.message : String(error)
        if (message.includes('404')) {
          setInstances([])
        } else {
          console.error('Failed to load entity instances', error)
          showToast({
            severity: 'error',
            summary: t('identity:crud.search'),
            detail:
              error instanceof Error
                ? error.message
                : t('identity:crud.searchFailed'),
            life: 5000
          })
        }
      } finally {
        setLoadingInstances(false)
      }
    },
    [
      canSearchInstances,
      markBackendDenied,
      normalizeInstance,
      permissionsReady,
      query,
      selectedTypeName,
      showToast,
      t
    ]
  )

  useEffect(() => {
    fetchTypes()
  }, [fetchTypes])

  useEffect(() => {
    setInstances([])
    setHasSearchedInstances(false)
    setSelectedInstance(null)
    setQuery('')
  }, [selectedTypeName])

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

  const openViewModal = async (instance: EntityInstance) => {
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

    const enrichedInstance = await attachPseudonymLinks(instance)
    setSelectedInstance(enrichedInstance)
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
        : (instance.data ?? {})
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
    const dataForValidation = selectedSchemaAttributes.length
      ? pruneEmptyOptionalEntityData(selectedSchemaAttributes, pickedData)
      : pickedData
    const validationErrors = validateEntityData(
      selectedSchemaAttributes,
      dataForValidation,
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
        ? coerceEntityDataTypes(selectedSchemaAttributes, dataForValidation)
        : dataForValidation

      if (modalMode === 'create') {
        const created = await TrustDeck.instance().postEntity(
          selectedTypeName,
          {
            data: dataToSave
          }
        )
        const normalized = await attachPseudonymLinks(
          normalizeInstance(created)
        )
        setInstances((current) => [normalized, ...current])
        setHasSearchedInstances(true)
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
        await TrustDeck.instance().putEntity(
          selectedTypeName,
          {
            data: dataToSave
          },
          identifier
        )
        const updated = { ...selectedInstance, data: dataToSave }
        setInstances((current) =>
          current.map((entry) =>
            entityId(entry) === identifier ? updated : entry
          )
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
      if (error instanceof TrustDeckHttpError && error.status === 403) {
        markBackendDenied(
          modalMode === 'create' ? 'instance:create' : 'instance:update'
        )
        showToast({
          severity: 'warn',
          summary: t('identity:crud.save'),
          detail:
            modalMode === 'create'
              ? t('identity:crud.noCreatePermission')
              : t('identity:crud.noUpdatePermission'),
          life: 5000
        })
        return
      }

      console.error('Failed to save entity instance', error)
      showToast({
        severity: 'error',
        summary: t('identity:crud.save'),
        detail:
          error instanceof Error
            ? error.message
            : t('identity:crud.saveFailed'),
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
      setInstances((current) =>
        current.filter((entry) => entityId(entry) !== identifier)
      )
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
      if (error instanceof TrustDeckHttpError && error.status === 403) {
        markBackendDenied('instance:delete')
        showToast({
          severity: 'warn',
          summary: t('identity:crud.delete'),
          detail: t('identity:crud.noDeletePermission'),
          life: 5000
        })
        return
      }

      console.error('Failed to delete entity instance', error)
      showToast({
        severity: 'error',
        summary: t('identity:crud.delete'),
        detail:
          error instanceof Error
            ? error.message
            : t('identity:crud.deleteFailed'),
        life: 5000
      })
    } finally {
      setDeleting(false)
    }
  }

  const modalTitle =
    modalMode === 'create'
      ? t('identity:crud.createEntity', { type: selectedTypeName })
      : modalMode === 'edit'
        ? t('identity:crud.editEntity', { type: selectedTypeName })
        : t('identity:crud.viewEntity', { type: selectedTypeName })

  const handleSearchClick = () => {
    const normalizedQuery = query.trim()
    if (!normalizedQuery) {
      showToast({
        severity: 'warn',
        summary: t('identity:crud.search'),
        detail: t('identity:crud.enterSearchTerm'),
        life: 3500
      })
      return
    }
    searchInstances(selectedTypeName, normalizedQuery)
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

        <Panel
          noMaxWidth
          className="mx-auto"
          title={t('identity:crud.availableTypes')}
        >
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
              <table className="min-w-full divide-y divide-gray-200 text-left text-base dark:divide-slate-700">
                <thead>
                  <tr className="text-gray-600 dark:text-gray-300">
                    <th className="px-4 py-3 font-semibold">
                      {t('identity:crud.typeName')}
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      {t('identity:crud.version')}
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      {t('identity:crud.associatedGroup')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {typeDefinitions.map((type) => {
                    const selected = type.name === selectedTypeName
                    return (
                      <tr
                        key={`${type.name}-${type.version}`}
                        aria-selected={selected}
                        className={`cursor-pointer border-l-4 transition hover:bg-gray-50 dark:hover:bg-slate-800 ${
                          selected
                            ? 'border-color-blue bg-blue-50 dark:bg-slate-800'
                            : 'border-transparent'
                        }`}
                        onClick={() => setSelectedTypeName(type.name)}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{type.name}</span>
                            {selected && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                                <CheckIcon className="h-3.5 w-3.5" />
                                {t('identity:crud.selectedBadge')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {type.version || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {type.associatedDomainName || '-'}
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
            className="mx-auto"
            title={t('identity:crud.instancesTitle', {
              type: selectedType.name
            })}
          >
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                <CustomFloatLabel
                  id="identity-entity-instance-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      handleSearchClick()
                    }
                  }}
                  placeholder={t('identity:crud.searchPlaceholder')}
                  inputPlaceholder={t('identity:crud.searchInputPlaceholder')}
                />
                <div className="flex flex-wrap justify-end gap-2">
                  <PrimaryButton
                    label={t('identity:crud.search')}
                    onClick={handleSearchClick}
                    loading={loadingInstances}
                    disabled={permissionLoadingOrDenied}
                    tooltip={
                      permissionLoadingOrDenied
                        ? t('identity:crud.noSearchPermission')
                        : undefined
                    }
                  />
                </div>
              </div>

              <Divider />

              {!permissionsReady ? (
                <div className="py-10 text-center text-gray-500 dark:text-gray-300">
                  {t('identity:crud.checkingPermissions')}
                </div>
              ) : !canSearchInstances ? (
                <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-8 text-center text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                  {t('identity:crud.noSearchPermission')}
                </div>
              ) : loadingInstances ? (
                <div className="py-10 text-center text-gray-500 dark:text-gray-300">
                  {t('identity:crud.loadingInstances')}
                </div>
              ) : !hasSearchedInstances && instances.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {t('identity:crud.searchFirst')}
                  </h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-300">
                    {t('identity:crud.searchFirstHint')}
                  </p>
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
                  <table className="min-w-full divide-y divide-gray-200 text-left text-base dark:divide-slate-700">
                    <thead className="bg-gray-50 dark:bg-slate-900">
                      <tr className="text-gray-600 dark:text-gray-300">
                        <th className="min-w-[18rem] px-4 py-3 font-semibold">
                          {t('identity:crud.identifier')}
                        </th>
                        {displayAttributes.map((attr) => (
                          <th
                            key={attr.name}
                            className="px-4 py-3 font-semibold"
                          >
                            {resolveLabel(attr, i18n.language)}
                          </th>
                        ))}
                        <th className="w-36 px-4 py-3 text-right font-semibold">
                          {t('identity:crud.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {visibleInstances.map((instance, index) => {
                        const id =
                          entityId(instance) || `${selectedType.name}-${index}`
                        return (
                          <tr
                            key={id}
                            className="hover:bg-gray-50 dark:hover:bg-slate-800"
                          >
                            <td className="min-w-[18rem] px-4 py-3 font-mono text-sm text-gray-700 dark:text-gray-300">
                              <span className="block break-all">
                                {id || '-'}
                              </span>
                            </td>
                            {displayAttributes.map((attr) => (
                              <td
                                key={`${id}-${attr.name}`}
                                className="px-4 py-3 text-gray-700 dark:text-gray-300"
                              >
                                {formatValue(
                                  attr.name
                                    ? valueAtPath(instance.data, attr.name)
                                    : undefined
                                )}
                              </td>
                            ))}
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-2">
                                <IconActionButton
                                  title={
                                    canReadInstances
                                      ? t('identity:crud.view')
                                      : t('identity:crud.noReadPermission')
                                  }
                                  onClick={() => openViewModal(instance)}
                                  disabled={!canReadInstances}
                                >
                                  <EyeIcon className="h-5 w-5" />
                                </IconActionButton>
                                <IconActionButton
                                  title={
                                    canUpdateInstances
                                      ? t('identity:crud.edit')
                                      : t('identity:crud.noUpdatePermission')
                                  }
                                  onClick={() => openEditModal(instance)}
                                  disabled={!canUpdateInstances}
                                >
                                  <PencilIcon className="h-5 w-5" />
                                </IconActionButton>
                                <IconActionButton
                                  title={
                                    canDeleteInstances
                                      ? t('identity:crud.delete')
                                      : t('identity:crud.noDeletePermission')
                                  }
                                  onClick={() => {
                                    setSelectedInstance(instance)
                                    setDeleteConfirmOpen(true)
                                  }}
                                  disabled={!canDeleteInstances}
                                  variant="danger"
                                >
                                  <TrashIcon className="h-5 w-5" />
                                </IconActionButton>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {instances.length > 0 && (
                <div className="flex justify-end pt-2">
                  <label className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                    <span>{t('identity:crud.resultsLimit')}</span>
                    <select
                      value={resultLimit}
                      onChange={(event) =>
                        setResultLimit(Number(event.target.value))
                      }
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-gray-100"
                    >
                      {resultLimitOptions.map((limit) => (
                        <option key={limit} value={limit}>
                          {limit}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              <div className="flex justify-center pt-2">
                <PrimaryButton
                  label={t('identity:crud.addEntityInstance')}
                  onClick={openCreateModal}
                  icon={<PlusIcon className="h-5 w-5 mr-1" />}
                  disabled={!canCreateInstances}
                  tooltip={
                    !canCreateInstances
                      ? t('identity:crud.noCreatePermission')
                      : undefined
                  }
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
        style={{
          width: modalMode === 'create' ? '760px' : '980px',
          maxWidth: '95vw'
        }}
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
            {modalMode === 'view' && selectedInstance && (
              <PrimaryButton
                label={t('identity:crud.edit')}
                onClick={() => openEditModal(selectedInstance)}
                disabled={!canUpdateInstances}
                tooltip={
                  !canUpdateInstances
                    ? t('identity:crud.noUpdatePermission')
                    : undefined
                }
                icon={<PencilIcon className="h-5 w-5 mr-1" />}
              />
            )}
            {modalMode !== 'view' && (
              <PrimaryButton
                label={
                  modalMode === 'create'
                    ? t('identity:crud.create')
                    : t('identity:crud.save')
                }
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
            <PrimaryOutlinedButton
              label={
                modalMode === 'view'
                  ? t('identity:crud.close')
                  : t('identity:crud.cancel')
              }
              onClick={closeModal}
              icon={<XMarkIcon className="h-5 w-5 mr-1" />}
              disabled={saving}
            />
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
