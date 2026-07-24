import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Fragment, type ReactNode } from 'react'
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
import useProjectStore from '../../core/stores/ProjectStore'
import useToastStore from '../../core/stores/ToastStore'
import TrustDeck, {
  EntityTypePayload,
  RecordLinkageCandidate,
  TrustDeckHttpError
} from '../../core/services/TrustDeck'
import DynamicEntity from '../search/components/DynamicEntity'
import InlinePseudonymDetail from '../search/components/InlinePseudonymDetail'
import PseudonymService from '../search/services/PseudonymService'
import RecordLinkageCandidateReview from './components/RecordLinkageCandidateReview'
import { pickSchemaData } from '../search/utils/schemaData'
import type { Attribute } from '../../core/stores/ProjectStore'
import type { Link } from '../../core/types/Link'
import type { Pseudonym } from '../../core/types/Pseudonym'
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

function parseRecordLinkageCandidates(body: string): RecordLinkageCandidate[] {
  try {
    const parsed = JSON.parse(body)
    return Array.isArray(parsed)
      ? parsed.filter((candidate): candidate is RecordLinkageCandidate =>
          Boolean(candidate?.entityInstance)
        )
      : []
  } catch {
    return []
  }
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

  const values = asRepeatableValues(value).filter(
    (entry) => !isEmptyValue(entry)
  )
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
          .map((entry) =>
            normalizeValueForType({ ...attr, repeatable: false }, entry)
          )
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
        const values = asRepeatableValues(value).filter(
          (entry) => !isEmptyValue(entry)
        )
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

function pseudonymsToLinks(pseudonyms: any[] = []): Array<{
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

function updateLinkedPseudonym(
  links: unknown,
  previousDomain: string,
  previousPseudonym: string,
  nextDomain: string,
  nextPseudonym: string
): Link[] {
  const normalizedLinks = Array.isArray(links)
    ? (links as Link[])
    : links
      ? [links as Link]
      : []

  return normalizedLinks.map((link) => {
    const matches =
      link.group === previousDomain && link.pseudonym === previousPseudonym

    return {
      ...link,
      group: matches ? nextDomain : link.group,
      pseudonym: matches ? nextPseudonym : link.pseudonym,
      children: link.children?.length
        ? updateLinkedPseudonym(
            link.children,
            previousDomain,
            previousPseudonym,
            nextDomain,
            nextPseudonym
          )
        : link.children
    }
  })
}

function removeLinkedPseudonym(
  links: unknown,
  domainName: string,
  pseudonym: string
): Link[] {
  const normalizedLinks = Array.isArray(links)
    ? (links as Link[])
    : links
      ? [links as Link]
      : []

  return normalizedLinks.flatMap((link) => {
    if (link.group === domainName && link.pseudonym === pseudonym) return []

    return [
      {
        ...link,
        children: link.children?.length
          ? removeLinkedPseudonym(link.children, domainName, pseudonym)
          : link.children
      }
    ]
  })
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
  const [typeSearchQuery, setTypeSearchQuery] = useState('')
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
  const [linkedPseudonym, setLinkedPseudonym] = useState<Pseudonym | null>(
    null
  )
  const [linkedPseudonymDomain, setLinkedPseudonymDomain] = useState('')
  const [loadingLinkedPseudonym, setLoadingLinkedPseudonym] = useState(false)
  const [linkageCandidates, setLinkageCandidates] = useState<
    RecordLinkageCandidate[]
  >([])
  const [linkageOriginalData, setLinkageOriginalData] = useState<
    Record<string, any>
  >({})
  const [saving, setSaving] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const createPanelRef = useRef<HTMLDivElement | null>(null)

  const selectedType = useMemo(
    () =>
      typeDefinitions.find((type) => type.name === selectedTypeName) ?? null,
    [selectedTypeName, typeDefinitions]
  )

  const filteredTypeDefinitions = useMemo(() => {
    const normalizedQuery = typeSearchQuery.trim().toLowerCase()
    if (!normalizedQuery) return typeDefinitions
    return typeDefinitions.filter((type) =>
      [type.name, type.associatedDomainName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery))
    )
  }, [typeDefinitions, typeSearchQuery])

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
    // Do not call the permission-management endpoint from Entities.
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
    setLinkedPseudonym(null)
    setLinkedPseudonymDomain('')
    setLinkageCandidates([])
    setLinkageOriginalData({})
    setModalOpen(false)
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
    setLinkageCandidates([])
    setLinkageOriginalData({})
    setFormData(buildInitialEntityData(selectedSchemaAttributes))
    setModalOpen(true)
    window.requestAnimationFrame(() => {
      createPanelRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    })
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
    setLinkedPseudonym(null)
    setLinkedPseudonymDomain('')
    setModalOpen(true)

    const enrichedInstance = await attachPseudonymLinks(instance)
    setSelectedInstance(enrichedInstance)
  }

  const openEditModal = async (instance: EntityInstance) => {
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
    setLinkedPseudonym(null)
    setLinkedPseudonymDomain('')

    const enrichedInstance = await attachPseudonymLinks(instance)
    setSelectedInstance(enrichedInstance)
  }

  const closeModal = () => {
    if (saving) return
    setModalOpen(false)
    setSelectedInstance(null)
    setLinkedPseudonym(null)
    setLinkedPseudonymDomain('')
    setLinkageCandidates([])
    setLinkageOriginalData({})
  }

  const handleFieldChange = (path: Array<string | number>, value: any) => {
    setFormData((prev) => setValueAtPath(prev, path, value))
    if (modalMode === 'create' && linkageCandidates.length > 0) {
      setLinkageCandidates([])
      setLinkageOriginalData({})
    }
  }

  const openLinkedPseudonym = async (
    domainName: string,
    pseudonymValue: string
  ) => {
    if (!pseudonymValue || loadingLinkedPseudonym) return

    setLoadingLinkedPseudonym(true)
    try {
      const result = await PseudonymService.searchPseudonym(
        pseudonymValue,
        domainName || undefined
      )
      if (!result) throw new Error(t('search:pseudonym.notFound'))

      const normalized = {
        ...result,
        domainName: result.domainName || domainName
      }
      setLinkedPseudonym(normalized)
      setLinkedPseudonymDomain(normalized.domainName)
    } catch (error) {
      console.error('Failed to load linked pseudonym', error)
      showToast({
        severity: 'error',
        summary: t('search:pseudonymView'),
        detail:
          error instanceof Error
            ? error.message
            : t('search:pseudonym.loadFailed'),
        life: 4500
      })
    } finally {
      setLoadingLinkedPseudonym(false)
    }
  }

  const prepareEntityData = (
    inputData: Record<string, any>
  ): Record<string, any> | null => {
    const pickedData = selectedSchemaAttributes.length
      ? pickSchemaData(selectedSchemaAttributes, inputData)
      : inputData
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
      return null
    }

    return selectedSchemaAttributes.length
      ? coerceEntityDataTypes(selectedSchemaAttributes, dataForValidation)
      : dataForValidation
  }

  const showResolvedEntity = async (
    rawEntity: EntityInstance,
    fallbackData: Record<string, any>,
    successMessage: string
  ) => {
    const normalized = await attachPseudonymLinks(
      normalizeInstance({
        ...rawEntity,
        data: rawEntity?.data ?? fallbackData
      })
    )
    const identifier = entityId(normalized)
    setInstances((current) => [
      normalized,
      ...current.filter((entry) => entityId(entry) !== identifier)
    ])
    setHasSearchedInstances(true)
    setSelectedInstance(normalized)
    setLinkageCandidates([])
    setLinkageOriginalData({})
    setModalMode('view')
    setFormData(normalized.data ?? fallbackData)
    showToast({
      severity: 'success',
      summary: t('identity:crud.create'),
      detail: successMessage,
      life: 4000
    })
  }

  const handleUseLinkageCandidate = async (
    candidate: RecordLinkageCandidate
  ) => {
    if (!candidate?.entityInstance) return
    setSaving(true)
    try {
      await showResolvedEntity(
        candidate.entityInstance,
        candidate.entityInstance.data ?? {},
        t('identity:crud.candidateSelectedSuccess')
      )
    } finally {
      setSaving(false)
    }
  }

  const handleCreateOriginalAfterReview = async () => {
    if (!selectedTypeName || !canCreateInstances) return
    const dataToSave = prepareEntityData(linkageOriginalData)
    if (!dataToSave) return

    setSaving(true)
    try {
      const creationResult = await TrustDeck.instance().postEntityWithResult(
        selectedTypeName,
        { data: dataToSave },
        'CREATE_ORIGINAL'
      )
      await showResolvedEntity(
        creationResult.entity,
        dataToSave,
        creationResult.created
          ? t('identity:crud.createSuccess')
          : t('identity:crud.existingEntityReturned')
      )
    } catch (error) {
      if (error instanceof TrustDeckHttpError && error.status === 409) {
        showToast({
          severity: 'error',
          summary: t('identity:crud.resolveLinkageFailed'),
          detail: t('identity:crud.createOriginalBackendRequired'),
          life: 7000
        })
        return
      }
      if (error instanceof TrustDeckHttpError && error.status === 403) {
        markBackendDenied('instance:create')
      }
      console.error('Failed to create the original entity after linkage review', error)
      showToast({
        severity: 'error',
        summary: t('identity:crud.resolveLinkageFailed'),
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

  const handleMergeLinkageCandidate = async (
    candidate: RecordLinkageCandidate,
    mergedData: Record<string, any>
  ) => {
    if (!selectedTypeName || !canUpdateInstances) return
    const identifier = entityId(candidate.entityInstance)
    if (!identifier) return
    const dataToSave = prepareEntityData(mergedData)
    if (!dataToSave) return

    setSaving(true)
    try {
      const response = await TrustDeck.instance().putEntity(
        selectedTypeName,
        { data: dataToSave },
        identifier
      )
      const updated = {
        ...candidate.entityInstance,
        ...(response && typeof response === 'object' ? response : {}),
        data: (response as any)?.data ?? dataToSave
      }
      await showResolvedEntity(
        updated,
        dataToSave,
        t('identity:crud.mergeCandidateSuccess')
      )
    } catch (error) {
      if (error instanceof TrustDeckHttpError && error.status === 403) {
        markBackendDenied('instance:update')
        showToast({
          severity: 'warn',
          summary: t('identity:crud.update'),
          detail: t('identity:crud.noUpdatePermission'),
          life: 5000
        })
        return
      }
      console.error('Failed to merge the entered entity into a linkage candidate', error)
      showToast({
        severity: 'error',
        summary: t('identity:crud.resolveLinkageFailed'),
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

    const dataToSave = prepareEntityData(formData)
    if (!dataToSave) return

    setSaving(true)
    try {
      if (modalMode === 'create') {
        const creationResult = await TrustDeck.instance().postEntityWithResult(
          selectedTypeName,
          { data: dataToSave }
        )
        await showResolvedEntity(
          creationResult.entity,
          dataToSave,
          creationResult.created
            ? t('identity:crud.createSuccess')
            : t('identity:crud.existingEntityReturned')
        )
      } else if (modalMode === 'edit' && selectedInstance) {
        const identifier = entityId(selectedInstance)
        await TrustDeck.instance().putEntity(
          selectedTypeName,
          { data: dataToSave },
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
      if (
        modalMode === 'create' &&
        error instanceof TrustDeckHttpError &&
        error.status === 409
      ) {
        const candidates = parseRecordLinkageCandidates(error.body)
        if (candidates.length > 0) {
          setLinkageCandidates(candidates)
          setLinkageOriginalData(structuredClone(dataToSave))
          showToast({
            severity: 'warn',
            summary: t('identity:crud.linkageConflictTitle'),
            detail: t('identity:crud.linkageConflictText', {
              count: candidates.length
            }),
            life: 6000
          })
          return
        }
      }

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
    <div className="td-page-shell">
      <div className="td-page-content flex w-full flex-col gap-6">
        <div className="td-page-header !mb-0">
          <h1 className="td-page-title">{t('identity:crud.title')}</h1>
          <p className="td-page-subtitle">{t('identity:crud.subtitle')}</p>
        </div>

        <Panel
          noMaxWidth
          className="mx-auto w-full"
          title={t('identity:crud.entityTypeSearchContext')}
        >
          <p className="td-section-subtitle mb-5">
            {t('identity:crud.entityTypeSearchContextHint')}
          </p>
          {loadingTypes ? (
            <div className="py-10 text-center text-gray-500 dark:text-gray-300">
              {t('entityBuilder:loadingEntityTypes')}
            </div>
          ) : typeDefinitions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900">
              <h2 className="td-section-title">
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
            <div className="space-y-4">
              <label className="block">
                <span className="td-field-label mb-1 block">
                  {t('identity:crud.entityTypeSearchLabel')}
                </span>
                <input
                  type="search"
                  value={typeSearchQuery}
                  onChange={(event) => setTypeSearchQuery(event.target.value)}
                  placeholder={t('identity:crud.entityTypeSearchPlaceholder')}
                  className="h-11 w-full rounded-lg border border-color-light-gray bg-white px-3 text-base text-gray-900 outline-none transition focus:border-color-blue focus:ring-1 focus:ring-color-blue dark:bg-slate-900 dark:text-gray-100"
                />
              </label>

              <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-200 dark:border-slate-700">
                {filteredTypeDefinitions.length === 0 ? (
                  <p className="px-4 py-8 text-center text-gray-600 dark:text-gray-300">
                    {t('identity:crud.noEntityTypesMatch')}
                  </p>
                ) : (
                  filteredTypeDefinitions.map((type) => {
                    const selected = type.name === selectedTypeName
                    return (
                      <button
                        key={`${type.name}-${type.version}`}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setSelectedTypeName(type.name)}
                        className={`grid w-full gap-1 border-b border-gray-100 px-4 py-3 text-left last:border-b-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center dark:border-slate-800 ${
                          selected
                            ? 'bg-blue-50 dark:bg-slate-800'
                            : 'bg-white hover:bg-gray-50 dark:bg-slate-900 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {type.name}
                        </span>
                        <span className="text-sm text-gray-600 md:text-right dark:text-gray-300">
                          {t('identity:crud.associatedGroup')}:{' '}
                          {type.associatedDomainName || '—'}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </Panel>

        {selectedType && (
          <Panel noMaxWidth className="mx-auto w-full">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="td-panel-title !mb-0">
                  {t('identity:crud.searchTitle')}
                </h2>
                <p className="td-section-subtitle mt-1">
                  {t('identity:crud.searchDescription', {
                    type: selectedType.name
                  })}
                </p>
              </div>
              <PrimaryButton
                label={t('identity:crud.addEntity')}
                onClick={openCreateModal}
                icon={<PlusIcon className="mr-1 h-5 w-5" />}
                disabled={!canCreateInstances}
                tooltip={
                  !canCreateInstances
                    ? t('identity:crud.noCreatePermission')
                    : undefined
                }
              />
            </div>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                <input
                  id="identity-entity-instance-search"
                  type="search"
                  aria-label={t('identity:crud.searchPlaceholder')}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      handleSearchClick()
                    }
                  }}
                  placeholder={t('identity:crud.searchInputPlaceholder')}
                  className="h-11 w-full rounded-lg border border-color-light-gray bg-white px-3 text-base text-gray-900 outline-none transition focus:border-color-blue focus:ring-1 focus:ring-color-blue dark:bg-slate-900 dark:text-gray-100"
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
              ) : !hasSearchedInstances &&
                instances.length === 0 ? null : instances.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900">
                  <h3 className="td-section-title">
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
                        const expanded =
                          modalOpen &&
                          modalMode !== 'create' &&
                          entityId(selectedInstance) === id
                        const detailColumnCount = displayAttributes.length + 2

                        return (
                          <Fragment key={id}>
                            <tr
                              className={`transition hover:bg-gray-50 dark:hover:bg-slate-800 ${
                                expanded
                                  ? 'bg-blue-50/70 dark:bg-blue-950/20'
                                  : ''
                              }`}
                            >
                              <td className="min-w-[18rem] px-4 py-3 font-mono text-base text-gray-700 dark:text-gray-300">
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

                            {expanded && (
                              <tr className="border-t border-blue-100 bg-blue-50/30 dark:border-blue-950 dark:bg-slate-900/80">
                                <td colSpan={detailColumnCount} className="p-0">
                                  <div className="space-y-5 px-5 py-6">
                                     <div className="flex flex-wrap items-start justify-between gap-3">
                                       <div>
                                         <h3 className="td-panel-title !mb-0">
                                           {linkedPseudonym
                                             ? t('search:pseudonymView')
                                             : modalTitle}
                                         </h3>
                                         <p className="td-section-subtitle mt-1">
                                           {linkedPseudonym
                                             ? linkedPseudonym.psn
                                             : modalMode === 'edit'
                                               ? t('identity:crud.editInlineDescription')
                                               : t('identity:crud.viewInlineDescription')}
                                         </p>
                                       </div>
                                       <div className="flex gap-2">
                                         {linkedPseudonym && (
                                           <PrimaryOutlinedButton
                                             label={t('search:backToEntityDetails')}
                                             onClick={() => {
                                               setLinkedPseudonym(null)
                                               setLinkedPseudonymDomain('')
                                             }}
                                           />
                                         )}
                                         <button
                                           type="button"
                                           title={t('identity:crud.close')}
                                           aria-label={t('identity:crud.close')}
                                           onClick={closeModal}
                                           className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-100 dark:border-slate-700 dark:text-gray-200 dark:hover:bg-slate-800"
                                         >
                                           <XMarkIcon className="h-5 w-5" />
                                         </button>
                                       </div>
                                     </div>

                                     {linkedPseudonym ? (
                                       <InlinePseudonymDetail
                                         embedded
                                         pseudonym={linkedPseudonym}
                                         fallbackDomain={linkedPseudonymDomain}
                                         initialEditMode={false}
                                         onClose={() => {
                                           setLinkedPseudonym(null)
                                           setLinkedPseudonymDomain('')
                                         }}
                                         onUpdated={(
                                           previousDomain,
                                           previousPseudonym,
                                           updatedPseudonym
                                         ) => {
                                           const normalized = {
                                             ...updatedPseudonym,
                                             domainName:
                                               updatedPseudonym.domainName ||
                                               previousDomain
                                           }
                                           setSelectedInstance((current) =>
                                             current
                                               ? {
                                                   ...current,
                                                   links: updateLinkedPseudonym(
                                                     current.links,
                                                     previousDomain,
                                                     previousPseudonym,
                                                     normalized.domainName,
                                                     normalized.psn
                                                   )
                                                 }
                                               : current
                                           )
                                           setLinkedPseudonym(normalized)
                                           setLinkedPseudonymDomain(
                                             normalized.domainName
                                           )
                                         }}
                                         onDeleted={(
                                           domainName,
                                           pseudonymValue
                                         ) => {
                                           setSelectedInstance((current) =>
                                             current
                                               ? {
                                                   ...current,
                                                   links: removeLinkedPseudonym(
                                                     current.links,
                                                     domainName,
                                                     pseudonymValue
                                                   )
                                                 }
                                               : current
                                           )
                                           setLinkedPseudonym(null)
                                           setLinkedPseudonymDomain('')
                                         }}
                                       />
                                     ) : selectedSchemaAttributes.length > 0 ? (
                                       <DynamicEntity
                                        entity={{
                                          ...(selectedInstance ?? {}),
                                          data: formData,
                                          entityTypeName: selectedTypeName,
                                          type: selectedTypeName,
                                          trustdeckID:
                                            entityId(selectedInstance) || ''
                                        }}
                                        schemaAttributes={selectedSchemaAttributes}
                                        editMode={modalMode === 'edit'}
                                        formData={formData}
                                         onFieldChange={handleFieldChange}
                                         showIdentifierPanel
                                         onLinkedPseudonymSelect={
                                           openLinkedPseudonym
                                         }
                                       />
                                    ) : (
                                      <p className="rounded-lg border border-dashed border-gray-300 p-4 text-gray-600 dark:border-slate-700 dark:text-gray-300">
                                        {t('search:noEntitySchema')}
                                      </p>
                                    )}

                                     {!linkedPseudonym && (
                                       <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-5 dark:border-slate-700">
                                      {modalMode === 'view' &&
                                        selectedInstance && (
                                          <PrimaryButton
                                            label={t('identity:crud.edit')}
                                            onClick={() =>
                                              openEditModal(selectedInstance)
                                            }
                                            disabled={!canUpdateInstances}
                                            tooltip={
                                              !canUpdateInstances
                                                ? t(
                                                    'identity:crud.noUpdatePermission'
                                                  )
                                                : undefined
                                            }
                                            icon={
                                              <PencilIcon className="mr-1 h-5 w-5" />
                                            }
                                          />
                                        )}
                                      {modalMode === 'edit' && (
                                        <PrimaryButton
                                          label={t('identity:crud.save')}
                                          onClick={handleSave}
                                          loading={saving}
                                          disabled={
                                            !selectedTypeName ||
                                            selectedSchemaAttributes.length ===
                                              0 ||
                                            !canUpdateInstances
                                          }
                                          icon={
                                            <CheckIcon className="mr-1 h-5 w-5" />
                                          }
                                        />
                                      )}
                                      <PrimaryOutlinedButton
                                        label={
                                          modalMode === 'view'
                                            ? t('identity:crud.close')
                                            : t('identity:crud.cancel')
                                        }
                                        onClick={
                                          modalMode === 'edit' &&
                                          selectedInstance
                                            ? () =>
                                                openViewModal(selectedInstance)
                                            : closeModal
                                        }
                                        icon={
                                          <XMarkIcon className="mr-1 h-5 w-5" />
                                        }
                                        disabled={saving}
                                      />
                                       </div>
                                     )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
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
            </div>
          </Panel>
        )}

        {modalOpen && modalMode === 'create' && (
          <div ref={createPanelRef}>
            <Panel noMaxWidth className="mx-auto w-full" title={modalTitle}>
              <div className="flex flex-col gap-4">
                {linkageCandidates.length > 0 ? (
                  <RecordLinkageCandidateReview
                    candidates={linkageCandidates}
                    originalData={linkageOriginalData}
                    schemaAttributes={selectedSchemaAttributes}
                    canUpdateCandidates={canUpdateInstances}
                    resolving={saving}
                    onUseCandidate={handleUseLinkageCandidate}
                    onCreateOriginal={handleCreateOriginalAfterReview}
                    onMergeCandidate={handleMergeLinkageCandidate}
                    onBackToOriginal={() => {
                      setLinkageCandidates([])
                      setLinkageOriginalData({})
                    }}
                  />
                ) : selectedSchemaAttributes.length > 0 ? (
                  <DynamicEntity
                    entity={{
                      data: formData,
                      entityTypeName: selectedTypeName,
                      type: selectedTypeName,
                      trustdeckID: ''
                    }}
                    schemaAttributes={selectedSchemaAttributes}
                    editMode
                    formData={formData}
                    onFieldChange={handleFieldChange}
                    showIdentifierPanel={false}
                    plainAttributes
                  />
                ) : (
                  <p className="rounded-lg border border-dashed border-gray-300 p-4 text-gray-600 dark:border-slate-700 dark:text-gray-300">
                    {t('search:noEntitySchema')}
                  </p>
                )}

                {linkageCandidates.length === 0 && (
                  <div className="flex w-full flex-wrap justify-center gap-3 border-t border-gray-200 pt-5 dark:border-slate-700">
                    <PrimaryButton
                      label={t('identity:crud.create')}
                      onClick={handleSave}
                      loading={saving}
                      disabled={
                        !selectedTypeName ||
                        selectedSchemaAttributes.length === 0 ||
                        !canCreateInstances
                      }
                      icon={<CheckIcon className="mr-1 h-5 w-5" />}
                    />
                    <PrimaryOutlinedButton
                      label={t('identity:crud.cancel')}
                      onClick={closeModal}
                      icon={<XMarkIcon className="mr-1 h-5 w-5" />}
                      disabled={saving}
                    />
                  </div>
                )}
              </div>
            </Panel>
          </div>
        )}
      </div>


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
