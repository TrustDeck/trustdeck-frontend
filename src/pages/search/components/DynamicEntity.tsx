import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import Panel from '../../../core/components/common/Panel'
import LinksTable from './LinksTable'
import CustomDropdown from '@component/form/CustomDropdown'
import CustomCalendar from '@component/form/CustomCalendar'
import CustomInputNumber from '@component/form/CustomInputNumber'
import type { Attribute } from '../../../core/stores/ProjectStore'
import type { Link } from '../../../core/types/Link'
import type { Entity } from '../types/Entity'
import EntityService from '../services/EntityService'
import { resolveAttributeLabel } from '../utils/entityDisplay'

export type DynamicEntityProps = {
  entity: any
  schemaAttributes: Attribute[]
  editMode: boolean
  formData: Record<string, any>
  onFieldChange: (path: Array<string | number>, value: any) => void
  showIdentifierPanel?: boolean
  plainAttributes?: boolean
  onLinkedPseudonymSelect?: (
    domainName: string,
    pseudonym: string
  ) => void | Promise<void>
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) {
    return value
      .map((entry) =>
        typeof entry === 'object' ? JSON.stringify(entry) : String(entry)
      )
      .join(', ')
  }
  if (typeof value === 'object') return JSON.stringify(value)
  const raw = String(value)
  if (raw.includes('T') && /^\d{4}-\d{2}-\d{2}T/.test(raw))
    return raw.split('T')[0]
  return raw
}

function parseDateValue(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  const parsed = new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatDateOnly(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isNamedDataGroup(attr: any): boolean {
  return attr?.layout === 'group' && Boolean(attr?.name)
}

function resolveTrustDeckId(entity: any): string {
  return String(
    entity?.trustdeckID ??
      entity?.trustdeckId ??
      entity?.trustDeckId ??
      entity?.data?.trustdeckID ??
      entity?.data?.trustdeckId ??
      ''
  )
}

function FieldLabel({
  label,
  required = false
}: {
  label: string
  required?: boolean
}) {
  return (
    <span className="td-field-label mb-1 block">
      {label}
      {required && <span className="ml-1 text-red-600">*</span>}
    </span>
  )
}

export default function DynamicEntity({
  entity,
  schemaAttributes,
  editMode,
  formData,
  onFieldChange,
  showIdentifierPanel = true,
  plainAttributes = false,
  onLinkedPseudonymSelect
}: DynamicEntityProps) {
  const { t, i18n } = useTranslation()
  const [links, setLinks] = useState<Link[]>([])

  const entityId = entity.trustdeckID || entity.id
  const entityType = entity.entityTypeName || entity.type

  useEffect(() => {
    if (!entityId || !entityType) {
      setLinks([])
      return
    }

    let active = true
    EntityService.getEntityPseudonyms(entityType, entityId)
      .then((fetchedLinks) => {
        if (!active) return
        setLinks(fetchedLinks)
      })
      .catch((error) => {
        console.error('Failed to load entity pseudonyms', error)
        if (!active) return
        setLinks([])
      })

    return () => {
      active = false
    }
  }, [entityId, entityType])

  const resolveLabel = (attr: any) => resolveAttributeLabel(attr, i18n.language)

  const isEmptyValue = (value: unknown) =>
    value === undefined || value === null || String(value).trim() === ''

  const toRepeatableValues = (value: unknown): any[] => {
    if (Array.isArray(value)) return value.length > 0 ? value : ['']
    if (isEmptyValue(value)) return ['']
    return [value]
  }

  const renderScalarLeaf = (
    attr: any,
    rawValue: any,
    key: string,
    setValue: (value: any) => void,
    showLabel = true
  ) => {
    const displayLabel = resolveLabel(attr)
    const enumValues = attr.values ?? attr.enum ?? []

    if (!editMode || !attr.name) {
      return (
        <div key={key} className="min-w-0">
          {showLabel && (
            <FieldLabel label={displayLabel} required={attr.required} />
          )}
          <div className="min-h-[44px] break-words rounded-lg border border-color-light-gray bg-white px-3 py-2 text-xl text-gray-900 dark:bg-slate-950 dark:text-gray-100">
            {formatValue(rawValue) || '—'}
          </div>
        </div>
      )
    }

    if (attr.type === 'enum') {
      return (
        <label key={key} className="block min-w-0">
          {showLabel && (
            <FieldLabel label={displayLabel} required={attr.required} />
          )}
          <CustomDropdown
            id={key}
            value={rawValue ?? ''}
            options={enumValues.map((option: string) => ({
              label: option,
              value: option
            }))}
            onChange={(event) => setValue(event.value)}
            className="w-full"
            required={attr.required}
          />
        </label>
      )
    }

    if (attr.type === 'date' || attr.type === 'datetime') {
      return (
        <label key={key} className="block min-w-0">
          {showLabel && (
            <FieldLabel label={displayLabel} required={attr.required} />
          )}
          <CustomCalendar
            id={key}
            value={parseDateValue(rawValue)}
            onChange={(event) => {
              if (!event.value) {
                setValue('')
                return
              }
              setValue(
                attr.type === 'date'
                  ? formatDateOnly(event.value)
                  : event.value.toISOString()
              )
            }}
            required={attr.required}
            showTime={attr.type === 'datetime'}
            showSeconds={attr.type === 'datetime'}
            dateFormat="dd.mm.yy"
            hourFormat="24"
          />
        </label>
      )
    }

    if (attr.type === 'integer' || attr.type === 'number') {
      return (
        <label key={key} className="block min-w-0">
          {showLabel && (
            <FieldLabel label={displayLabel} required={attr.required} />
          )}
          <CustomInputNumber
            id={key}
            value={
              typeof rawValue === 'number'
                ? rawValue
                : rawValue !== '' && rawValue !== undefined && rawValue !== null
                  ? Number(rawValue)
                  : null
            }
            onChange={(event) => setValue(event.value ?? '')}
            placeholder=""
            min={attr.minimum}
            max={attr.maximum}
            step={attr.type === 'integer' ? 1 : 0.01}
            validate={(value) => {
              if (attr.required && (value === null || value === undefined))
                return false
              if (value === null || value === undefined) return true
              if (attr.type === 'integer' && !Number.isInteger(value))
                return false
              if (typeof attr.minimum === 'number' && value < attr.minimum)
                return false
              if (typeof attr.maximum === 'number' && value > attr.maximum)
                return false
              return true
            }}
            errorMessage={t('identity:crud.invalidField')}
          />
        </label>
      )
    }

    if (attr.type === 'boolean') {
      return (
        <div key={key} className="min-w-0">
          {showLabel && (
            <FieldLabel label={displayLabel} required={attr.required} />
          )}
          <label className="flex min-h-[44px] items-center gap-3 rounded-lg border border-color-light-gray bg-white px-3 text-xl font-font-text text-gray-700 dark:bg-slate-950 dark:text-gray-200">
            <input
              type="checkbox"
              checked={Boolean(rawValue)}
              onChange={(event) => setValue(event.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-color-blue focus:ring-color-blue"
            />
            <span>{rawValue ? t('common:yes') : t('common:no')}</span>
          </label>
        </div>
      )
    }

    return (
      <label key={key} className="block min-w-0">
        {showLabel && (
          <FieldLabel label={displayLabel} required={attr.required} />
        )}
        <input
          id={key}
          type="text"
          value={formatValue(rawValue)}
          onChange={(event) => setValue(event.target.value)}
          className="h-[44px] w-full rounded-lg border border-color-light-gray bg-white px-3 font-font-text text-xl font-normal text-gray-900 outline-none transition focus:border-color-blue focus:ring-1 focus:ring-color-blue dark:bg-slate-950 dark:text-gray-100"
        />
      </label>
    )
  }

  const renderLeaf = (
    attr: any,
    context: Record<string, any>,
    key: string,
    path: Array<string | number>
  ) => {
    const rawValue =
      context?.[attr.name] ?? entity.data?.[attr.name] ?? entity?.[attr.name]

    if (editMode && attr.name && attr.repeatable) {
      const values = toRepeatableValues(rawValue)
      const setRepeatableValue = (index: number, value: any) => {
        const nextValues = [...values]
        nextValues[index] = value
        onFieldChange(path, nextValues)
      }
      const removeRepeatableValue = (index: number) => {
        const nextValues = values.filter(
          (_, currentIndex) => currentIndex !== index
        )
        onFieldChange(path, nextValues.length > 0 ? nextValues : [''])
      }
      const addRepeatableValue = () => onFieldChange(path, [...values, ''])

      return (
        <div
          key={key}
          className="space-y-2 rounded-lg border border-gray-200 p-3 dark:border-slate-700"
        >
          <FieldLabel label={resolveLabel(attr)} required={attr.required} />
          {values.map((value, index) => (
            <div
              key={`${key}-value-${index}`}
              className="flex items-center gap-2"
            >
              <div className="min-w-0 flex-1">
                {renderScalarLeaf(
                  {
                    ...attr,
                    repeatable: false,
                    required: attr.required && index === 0
                  },
                  value,
                  `${key}-input-${index}`,
                  (nextValue) => setRepeatableValue(index, nextValue),
                  false
                )}
              </div>
              {index === values.length - 1 && (
                <button
                  type="button"
                  title={t('identity:crud.addValue')}
                  aria-label={t('identity:crud.addValue')}
                  onClick={addRepeatableValue}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-color-blue text-color-blue transition hover:bg-blue-50 dark:hover:bg-slate-800"
                >
                  <PlusIcon className="h-5 w-5" />
                </button>
              )}
              <button
                type="button"
                title={t('identity:crud.removeValue')}
                aria-label={t('identity:crud.removeValue')}
                onClick={() => removeRepeatableValue(index)}
                disabled={values.length === 1 && attr.required}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-color-coral text-color-coral transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-950"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )
    }

    return renderScalarLeaf(attr, rawValue, key, (value) =>
      onFieldChange(path, value)
    )
  }

  const renderAttributes = (
    attributes: any[] = [],
    context: Record<string, any>,
    keyPrefix: string,
    pathPrefix: Array<string | number>
  ): React.ReactNode[] =>
    attributes.map((attr, index) => {
      const key = `${keyPrefix}-${attr.name || attr.key || index}`

      if (attr.layout === 'row' && Array.isArray(attr.attributes)) {
        const rowClass =
          attr.attributes.length >= 3
            ? 'grid grid-cols-1 gap-3 md:grid-cols-3'
            : attr.attributes.length === 2
              ? 'grid grid-cols-1 gap-3 md:grid-cols-2'
              : 'grid grid-cols-1 gap-3'

        return (
          <div key={key} className={rowClass}>
            {renderAttributes(attr.attributes, context, key, pathPrefix)}
          </div>
        )
      }

      if (Array.isArray(attr.attributes)) {
        const namedDataGroup = isNamedDataGroup(attr)
        const groupContext =
          namedDataGroup && attr.name ? context?.[attr.name] : context
        const entries = Array.isArray(groupContext)
          ? groupContext
          : [groupContext ?? context ?? {}]

        return (
          <div key={key} className="space-y-3">
            <h3 className="td-section-title">{resolveLabel(attr)}</h3>
            {entries.map((entry, entryIndex) => (
              <div key={`${key}-entry-${entryIndex}`} className="space-y-3">
                {entries.length > 1 && (
                  <div className="text-sm text-gray-600 dark:text-gray-300">{`${resolveLabel(attr)} ${entryIndex + 1}`}</div>
                )}
                {renderAttributes(
                  attr.attributes,
                  entry ?? {},
                  `${key}-nested-${entryIndex}`,
                  [
                    ...pathPrefix,
                    ...(namedDataGroup && attr.name ? [attr.name] : []),
                    ...(namedDataGroup && Array.isArray(groupContext)
                      ? [entryIndex]
                      : [])
                  ]
                )}
              </div>
            ))}
          </div>
        )
      }

      return renderLeaf(attr, context, key, [...pathPrefix, attr.name])
    })

  if (plainAttributes) {
    return (
      <div className="w-full space-y-4">
        {renderAttributes(schemaAttributes, formData ?? {}, 'entity-root', [])}
      </div>
    )
  }

  const detailPanelClass =
    'w-full rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm dark:border-slate-700 dark:bg-slate-900'

  return (
    <div
      className={
        showIdentifierPanel
          ? 'mx-auto grid w-full grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.85fr)]'
          : 'mx-auto flex w-full justify-center'
      }
    >
      <Panel
        title={t('search:entityLabel')}
        noBasePanel
        noMaxWidth
        className={detailPanelClass}
      >
        <div className="space-y-4">
          {showIdentifierPanel && (
            <div className="rounded-xl border border-color-light-gray bg-gray-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950">
              <div className="td-field-label mb-1">
                {t('search:trustDeckId')}
              </div>
              <div className="break-all font-mono text-lg font-semibold text-gray-900 dark:text-gray-100">
                {resolveTrustDeckId(entity) || '—'}
              </div>
            </div>
          )}
          {renderAttributes(
            schemaAttributes,
            formData ?? {},
            'entity-root',
            []
          )}
        </div>
      </Panel>

      {showIdentifierPanel && (
        <Panel
          title={t('search:links')}
          noBasePanel
          noMaxWidth
          className={`${detailPanelClass} h-fit`}
        >
          <LinksTable
            entity={
              {
                id: resolveTrustDeckId(entity),
                links
              } as Entity
            }
            onPseudonymSelect={onLinkedPseudonymSelect}
          />
        </Panel>
      )}
    </div>
  )
}
