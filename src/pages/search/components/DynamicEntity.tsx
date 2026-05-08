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

export default function DynamicEntity({
  entity,
  schemaAttributes,
  editMode,
  formData,
  onFieldChange
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
        />
      )
    }

    if (editMode && attr.name && attr.type === 'date') {
      return (
        <CustomCalendar
          key={key}
          id={key}
          value={parseDateValue(rawValue)}
          onChange={(e) => onFieldChange(path, e.value ? e.value.toISOString() : '')}
          placeholder={displayLabel}
        />
      )
    }

    if (editMode && attr.name && attr.type === 'integer') {
      return (
        <CustomInputNumber
          key={key}
          id={key}
          value={typeof rawValue === 'number' ? rawValue : rawValue ? Number(rawValue) : null}
          onChange={(e) => onFieldChange(path, e.value ?? '')}
          placeholder={displayLabel}
        />
      )
    }

    return (
      <CustomFloatLabel
        key={key}
        id={key}
        readOnly={!editMode || !attr.name}
        value={formatValue(rawValue)}
        placeholder={displayLabel}
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
        const groupContext = attr.name ? context?.[attr.name] : context
        const entries = Array.isArray(groupContext)
          ? groupContext
          : [groupContext ?? context]

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
                    ...(attr.name ? [attr.name] : []),
                    ...(Array.isArray(groupContext) ? [entryIndex] : [])
                  ]
                )}
              </div>
            ))}
          </div>
        )
      }

      return renderLeaf(attr, context, key, [...pathPrefix, attr.name])
    })

  const topLevelGroups =
    schemaAttributes.filter(
      (attr) => attr.layout === 'group' || attr.group === true || Array.isArray(attr.attributes)
    ) || []

  const sections =
    topLevelGroups.length > 0
      ? topLevelGroups
      : [
          {
            name: '__root__',
            label_en: t('search:entity'),
            label_de: t('search:entity'),
            attributes: schemaAttributes
          } as unknown as Attribute
        ]

  return (
    <div className="w-full 2xl:w-4/5 2xl:mx-auto flex flex-col xl:flex-row gap-4">
      <Panel className="w-full xl:w-3/5">
        {sections.map((section, sectionIndex) => {
          const sectionKey = section.name || section.key || `section-${sectionIndex}`
          const isRootSection = section.name === '__root__'
          const sectionContext = isRootSection
            ? formData
            : section.name
              ? formData?.[section.name]
              : formData
          const sectionEntries = Array.isArray(sectionContext)
            ? sectionContext
            : [sectionContext ?? formData ?? {}]

          return (
            <div key={sectionKey} className="space-y-3">
              <Divider text={resolveLabel(section)} />
              {sectionEntries.map((entry, entryIndex) => (
                <div key={`${sectionKey}-entry-${entryIndex}`} className="space-y-3">
                  {renderAttributes(
                    section.attributes ?? [section],
                    entry ?? formData ?? {},
                    `${sectionKey}-${entryIndex}`,
                    [
                      ...(!isRootSection && section.name ? [section.name] : []),
                      ...(Array.isArray(sectionContext) ? [entryIndex] : [])
                    ]
                  )}
                </div>
              ))}
            </div>
          )
        })}
      </Panel>

      <div className="w-full xl:w-2/5 flex flex-col gap-4">
        <Panel className="h-fit">
          <Divider text={t('search:identifier')} />
          <div className="flex flex-col gap-4">
            <CustomFloatLabel
              id="entity-identifier"
              readOnly
              value={entity.trustdeckID || entity.id || ''}
              placeholder="trustdeckID"
            />
            <CustomFloatLabel
              id="entity-type"
              readOnly
              value={entity.type || entity.entityTypeName || ''}
              placeholder={t('search:entity')}
            />
          </div>
        </Panel>

        <Panel className="h-fit">
          <Divider text={t('search:links')} />
          <LinksTable entity={{ id: entity.id || entity.trustdeckID, links: entity.links || [] } as Entity} />
        </Panel>
      </div>
    </div>
  )
}
