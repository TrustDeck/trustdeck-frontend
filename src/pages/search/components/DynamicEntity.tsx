import { useTranslation } from 'react-i18next'
import Panel from '../../../core/components/common/Panel'
import Divider from '../../../core/components/common/Divider'
import LinksTable from './LinksTable'
import CustomFloatLabel from '@component/form/CustomFloatLabel'
import CustomDropdown from '@component/form/CustomDropdown'
import CustomCalendar from '@component/form/CustomCalendar'
import CustomInputNumber from '@component/form/CustomInputNumber'
import type { Attribute } from '../../../core/stores/ProjectStore'
import type { Entity } from '../types/Entity'

type Props = {
  entity: any
  schemaAttributes: Attribute[]
  editMode: boolean
  formData: Record<string, any>
  onFieldChange: (path: Array<string | number>, value: any) => void
  showIdentifierPanel?: boolean
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
  if (raw.includes('T') && /^\d{4}-\d{2}-\d{2}T/.test(raw)) return raw.split('T')[0]
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

export default function DynamicEntity({
  entity,
  schemaAttributes,
  editMode,
  formData,
  onFieldChange,
  showIdentifierPanel = true
}: Props) {
  const { t, i18n } = useTranslation()

  const resolveLabel = (attr: any) => {
    const isGerman = i18n.language.startsWith('de')
    return isGerman
      ? attr.label_de || attr.labelDe || attr.label_en || attr.labelEn || attr.name
      : attr.label_en || attr.labelEn || attr.label_de || attr.labelDe || attr.name
  }

  const renderLeaf = (
    attr: any,
    context: Record<string, any>,
    key: string,
    path: Array<string | number>
  ) => {
    const rawValue = context?.[attr.name] ?? entity.data?.[attr.name] ?? entity?.[attr.name]
    const displayLabel = resolveLabel(attr)
    const enumValues = attr.values ?? attr.enum ?? []

    if (editMode && attr.name && attr.type === 'enum') {
      return (
        <CustomDropdown
          key={key}
          id={key}
          value={rawValue ?? ''}
          options={enumValues.map((option: string) => ({ label: option, value: option }))}
          onChange={(e) => onFieldChange(path, e.value)}
          placeholder={displayLabel}
          required={attr.required}
        />
      )
    }

    if (editMode && attr.name && (attr.type === 'date' || attr.type === 'datetime')) {
      return (
        <CustomCalendar
          key={key}
          id={key}
          value={parseDateValue(rawValue)}
          onChange={(e) => {
            if (!e.value) {
              onFieldChange(path, '')
              return
            }
            onFieldChange(path, attr.type === 'date' ? formatDateOnly(e.value) : e.value.toISOString())
          }}
          placeholder={displayLabel}
          required={attr.required}
          showTime={attr.type === 'datetime'}
        />
      )
    }

    if (editMode && attr.name && (attr.type === 'integer' || attr.type === 'number')) {
      return (
        <CustomInputNumber
          key={key}
          id={key}
          value={typeof rawValue === 'number' ? rawValue : rawValue !== '' && rawValue !== undefined && rawValue !== null ? Number(rawValue) : null}
          onChange={(e) => onFieldChange(path, e.value ?? '')}
          placeholder={attr.required ? `${displayLabel} *` : displayLabel}
          min={attr.minimum}
          max={attr.maximum}
          step={attr.type === 'integer' ? 1 : 0.01}
          validate={(value) => {
            if (attr.required && (value === null || value === undefined)) return false
            if (value === null || value === undefined) return true
            if (attr.type === 'integer' && !Number.isInteger(value)) return false
            if (typeof attr.minimum === 'number' && value < attr.minimum) return false
            if (typeof attr.maximum === 'number' && value > attr.maximum) return false
            return true
          }}
          errorMessage={t('identity:crud.invalidField')}
        />
      )
    }

    if (editMode && attr.name && attr.type === 'boolean') {
      return (
        <label
          key={key}
          className="flex min-h-[44px] items-center gap-3 rounded-lg border border-color-light-gray px-3 text-xl font-font-text text-gray-700 dark:text-gray-200"
        >
          <input
            type="checkbox"
            checked={Boolean(rawValue)}
            onChange={(e) => onFieldChange(path, e.target.checked)}
            className="h-5 w-5 rounded border-gray-300 text-color-blue focus:ring-color-blue"
          />
          <span>{attr.required ? `${displayLabel} *` : displayLabel}</span>
        </label>
      )
    }

    return (
      <CustomFloatLabel
        key={key}
        id={key}
        readOnly={!editMode || !attr.name}
        value={formatValue(rawValue)}
        placeholder={displayLabel}
        required={attr.required}
        onChange={attr.name ? (e) => onFieldChange(path, e.target.value) : undefined}
      />
    )
  }

  const renderAttributes = (
    attributes: any[] = [],
    context: Record<string, any>,
    keyPrefix: string,
    pathPrefix: Array<string | number>
  ) =>
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
        const groupContext = namedDataGroup && attr.name ? context?.[attr.name] : context
        const entries = Array.isArray(groupContext)
          ? groupContext
          : [groupContext ?? context ?? {}]

        return (
          <div key={key} className="space-y-3">
            <h3 className="text-md font-medium">{resolveLabel(attr)}</h3>
            {entries.map((entry, entryIndex) => (
              <div key={`${key}-entry-${entryIndex}`} className="space-y-3">
                {entries.length > 1 && (
                  <div className="text-sm text-gray-600">{`${resolveLabel(attr)} ${entryIndex + 1}`}</div>
                )}
                {renderAttributes(
                  attr.attributes,
                  entry ?? {},
                  `${key}-nested-${entryIndex}`,
                  [
                    ...pathPrefix,
                    ...(namedDataGroup && attr.name ? [attr.name] : []),
                    ...(namedDataGroup && Array.isArray(groupContext) ? [entryIndex] : [])
                  ]
                )}
              </div>
            ))}
          </div>
        )
      }

      return renderLeaf(attr, context, key, [...pathPrefix, attr.name])
    })

  return (
    <div
      className={
        showIdentifierPanel
          ? 'w-full 2xl:w-11/12 2xl:mx-auto flex flex-col xl:flex-row gap-4'
          : 'flex w-full justify-center'
      }
    >
      <Panel className={showIdentifierPanel ? 'w-full xl:w-1/2' : 'w-full max-w-3xl'}>
        <div className="space-y-3">
          <Divider text={t('search:entityLabel')} />
          {renderAttributes(schemaAttributes, formData ?? {}, 'entity-root', [])}
        </div>
      </Panel>

      {showIdentifierPanel && (
        <div className="w-full xl:w-1/2 flex flex-col gap-4">
        <Panel className="h-fit">
          <Divider text={t('search:identifier')} />
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-color-light-gray bg-white px-3 py-3 dark:bg-slate-950">
              <div className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">trustdeckID</div>
              <div className="break-all font-mono text-sm text-gray-900 dark:text-gray-100">
                {resolveTrustDeckId(entity) || '-'}
              </div>
            </div>
            <CustomFloatLabel
              id="entity-type"
              readOnly
              value={entity.type || entity.entityTypeName || ''}
              placeholder={t('search:entityLabel')}
            />
          </div>
        </Panel>

        <Panel className="h-fit">
          <Divider text={t('search:links')} />
          <LinksTable entity={{ id: resolveTrustDeckId(entity), links: entity.links || [] } as Entity} />
        </Panel>
      </div>
      )}
    </div>
  )
}
