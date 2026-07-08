import { useTranslation } from 'react-i18next'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
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
    setValue: (value: any) => void
  ) => {
    const displayLabel = resolveLabel(attr)
    const enumValues = attr.values ?? attr.enum ?? []

    if (editMode && attr.name && attr.type === 'enum') {
      return (
        <CustomDropdown
          key={key}
          id={key}
          value={rawValue ?? ''}
          options={enumValues.map((option: string) => ({ label: option, value: option }))}
          onChange={(e) => setValue(e.value)}
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
              setValue('')
              return
            }
            setValue(attr.type === 'date' ? formatDateOnly(e.value) : e.value.toISOString())
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
          onChange={(e) => setValue(e.value ?? '')}
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
            onChange={(e) => setValue(e.target.checked)}
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
        onChange={attr.name ? (e) => setValue(e.target.value) : undefined}
      />
    )
  }

  const renderLeaf = (
    attr: any,
    context: Record<string, any>,
    key: string,
    path: Array<string | number>
  ) => {
    const rawValue = context?.[attr.name] ?? entity.data?.[attr.name] ?? entity?.[attr.name]

    if (editMode && attr.name && attr.repeatable) {
      const values = toRepeatableValues(rawValue)
      const setRepeatableValue = (index: number, value: any) => {
        const nextValues = [...values]
        nextValues[index] = value
        onFieldChange(path, nextValues)
      }
      const removeRepeatableValue = (index: number) => {
        const nextValues = values.filter((_, currentIndex) => currentIndex !== index)
        onFieldChange(path, nextValues.length > 0 ? nextValues : [''])
      }

      return (
        <div key={key} className="space-y-2 rounded-lg border border-gray-200 p-3 dark:border-slate-700">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {resolveLabel(attr)}
          </div>
          {values.map((value, index) => (
            <div key={`${key}-value-${index}`} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                {renderScalarLeaf(
                  { ...attr, repeatable: false, required: attr.required && index === 0 },
                  value,
                  `${key}-input-${index}`,
                  (nextValue) => setRepeatableValue(index, nextValue)
                )}
              </div>
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
          <button
            type="button"
            onClick={() => onFieldChange(path, [...values, ''])}
            className="inline-flex items-center gap-2 rounded-lg border border-color-blue px-3 py-2 text-sm font-medium text-color-blue transition hover:bg-blue-50 dark:hover:bg-slate-800"
          >
            <PlusIcon className="h-4 w-4" />
            {t('identity:crud.addValue')}
          </button>
        </div>
      )
    }

    return renderScalarLeaf(attr, rawValue, key, (value) => onFieldChange(path, value))
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

  const modalPanelClass =
    'w-full rounded-lg border border-gray-100 bg-white px-6 py-4 shadow-lg dark:border-slate-700 dark:bg-slate-800'

  return (
    <div
      className={
        showIdentifierPanel
          ? 'mx-auto grid w-full max-w-[824px] grid-cols-1 items-start justify-center gap-8 xl:grid-cols-[minmax(0,370px)_minmax(0,370px)]'
          : 'mx-auto flex w-full max-w-3xl justify-center'
      }
    >
      <Panel noBasePanel noMaxWidth className={modalPanelClass}>
        <div className="space-y-3">
          <Divider text={t('search:entityLabel')} />
          {renderAttributes(schemaAttributes, formData ?? {}, 'entity-root', [])}
        </div>
      </Panel>

      {showIdentifierPanel && (
        <div className="flex w-full flex-col gap-4">
          <Panel noBasePanel noMaxWidth className={`${modalPanelClass} h-fit`}>
            <Divider text={t('search:identifier')} />
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-color-light-gray bg-white px-3 py-3 dark:bg-slate-950">
                <div className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">trustdeckID</div>
                <div className="break-all font-mono text-sm text-gray-900 dark:text-gray-100">
                  {resolveTrustDeckId(entity) || '-'}
                </div>
              </div>
            </div>
          </Panel>

          <Panel noBasePanel noMaxWidth className={`${modalPanelClass} h-fit`}>
            <Divider text={t('search:links')} />
            <LinksTable entity={{ id: resolveTrustDeckId(entity), links: entity.links || [] } as Entity} />
          </Panel>
        </div>
      )}
    </div>
  )
}
