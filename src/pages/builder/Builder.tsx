import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import Panel from '../../core/components/common/Panel'
import CustomFloatLabel from '@component/form/CustomFloatLabel'
import CustomDropdown from '../../core/components/form/CustomDropdown'
import PrimaryButton from '@component/form/buttons/PrimaryButton'
import PrimaryOutlinedButton from '@component/form/buttons/PrimaryOutlinedButton'
import TrustDeck from '../../core/services/TrustDeck'
import useToastStore from '../../core/stores/ToastStore'
import useProjectStore from '../../core/stores/ProjectStore'
import { defaultAttributes } from './configs/attributes'

type BuilderAttribute = {
  key: string
  name: string
  label_en?: string
  label_de?: string
  type?: string
  required?: boolean
  linkage?: boolean
  repeatable?: boolean
  minLength?: number
  maxLength?: number
  values?: string[]
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
    layout?: string
    label_en?: string
    label_de?: string
    attributes?: any[]
  }
}

const typeOptions = [
  { label: 'Text', value: 'string' },
  { label: 'Integer', value: 'integer' },
  { label: 'Number', value: 'number' },
  { label: 'Boolean', value: 'boolean' },
  { label: 'Date', value: 'date' },
  { label: 'Date and time', value: 'datetime' },
  { label: 'Dropdown', value: 'enum' }
]

function prettyJson(value: unknown) {
  return JSON.stringify(value, null, 2)
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
  return {
    key: crypto.randomUUID(),
    name: attribute?.name ?? '',
    label_en: attribute?.label_en ?? attribute?.labelEn ?? attribute?.name ?? '',
    label_de: attribute?.label_de ?? attribute?.labelDe ?? '',
    type: attribute?.type ?? 'string',
    required: Boolean(attribute?.required),
    linkage: Boolean(attribute?.linkage),
    repeatable: Boolean(attribute?.repeatable),
    minLength: attribute?.minLength,
    maxLength: attribute?.maxLength,
    values: attribute?.values ?? attribute?.enum
  }
}

function attributesFromPayload(payload: EntityTypePayload): BuilderAttribute[] {
  const attrs = payload.typeDefinition?.attributes
  if (!Array.isArray(attrs)) return []
  return attrs.map(mapBackendAttribute)
}

function serializeAttribute(attribute: BuilderAttribute) {
  const field: any = {
    name: attribute.name,
    label_en: attribute.label_en || attribute.name,
    label_de: attribute.label_de || attribute.label_en || attribute.name,
    type: attribute.type || 'string'
  }
  if (attribute.required) field.required = true
  if (attribute.linkage) field.linkage = true
  if (attribute.repeatable) field.repeatable = true
  if (attribute.type === 'string') {
    if (attribute.minLength !== undefined) field.minLength = attribute.minLength
    if (attribute.maxLength !== undefined) field.maxLength = attribute.maxLength
  }
  if (attribute.type === 'enum') {
    const values = (attribute.values ?? []).filter(Boolean)
    field.values = values
    field.enum = values
  }
  return field
}

function createPersonExampleAttributes(): BuilderAttribute[] {
  const personAttributes: Omit<BuilderAttribute, 'key'>[] = [
    {
      name: 'firstName',
      label_en: 'First name',
      label_de: 'Vorname',
      type: 'string',
      required: true,
      linkage: true,
      minLength: 1,
      maxLength: 100
    },
    {
      name: 'lastName',
      label_en: 'Last name',
      label_de: 'Nachname',
      type: 'string',
      required: true,
      linkage: true,
      minLength: 1,
      maxLength: 100
    },
    {
      name: 'dateOfBirth',
      label_en: 'Date of birth',
      label_de: 'Geburtsdatum',
      type: 'date',
      required: true,
      linkage: true
    },
    {
      name: 'administrativeGender',
      label_en: 'Administrative gender',
      label_de: 'Administratives Geschlecht',
      type: 'enum',
      required: true,
      linkage: true,
      values: ['male', 'female', 'other', 'unknown']
    },
    {
      name: 'email',
      label_en: 'Email',
      label_de: 'E-Mail',
      type: 'string',
      required: false,
      linkage: true,
      maxLength: 254
    },
    {
      name: 'phoneNumber',
      label_en: 'Phone number',
      label_de: 'Telefonnummer',
      type: 'string',
      required: false,
      linkage: true,
      maxLength: 50
    },
    {
      name: 'street',
      label_en: 'Street',
      label_de: 'Straße',
      type: 'string',
      required: false,
      linkage: false,
      maxLength: 200
    },
    {
      name: 'houseNumber',
      label_en: 'House number',
      label_de: 'Hausnummer',
      type: 'string',
      required: false,
      linkage: false,
      maxLength: 20
    },
    {
      name: 'postalCode',
      label_en: 'Postal code',
      label_de: 'Postleitzahl',
      type: 'string',
      required: false,
      linkage: false,
      maxLength: 20
    },
    {
      name: 'city',
      label_en: 'City',
      label_de: 'Stadt',
      type: 'string',
      required: false,
      linkage: false,
      maxLength: 120
    },
    {
      name: 'country',
      label_en: 'Country',
      label_de: 'Land',
      type: 'string',
      required: false,
      linkage: false,
      minLength: 1,
      maxLength: 50
    }
  ]

  return personAttributes.map((attribute) => ({
    ...attribute,
    key: crypto.randomUUID()
  }))
}

export default function Builder() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const showToast = useToastStore((state) => state.show)
  const setProjectEntities = useProjectStore((state) => state.setEntities)

  const [entityName, setEntityName] = useState('person')
  const [saveTarget, setSaveTarget] = useState<'project' | 'base'>('base')
  const [baseTypeOptions, setBaseTypeOptions] = useState<{ label: string; value: string }[]>([])
  const [selectedBaseType, setSelectedBaseType] = useState('')
  const [associatedGroupName, setAssociatedGroupName] = useState('')
  const [attributes, setAttributes] = useState<BuilderAttribute[]>(() => createPersonExampleAttributes())
  const [jsonDraft, setJsonDraft] = useState('')
  const [jsonDirty, setJsonDirty] = useState(false)
  const [jsonError, setJsonError] = useState('')
  const [saving, setSaving] = useState(false)

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
    const built: EntityTypePayload = {
      name: entityName.trim(),
      version: 'v1.0',
      isBaseType: saveTarget === 'base',
      typeDefinition: {
        typeName: entityName.trim() || 'person',
        version: 'v1.0',
        layout: 'group',
        label_en: entityName.trim() || 'Person',
        label_de: entityName.trim() || 'Person',
        attributes: attributes.map(serializeAttribute)
      }
    }
    if (saveTarget === 'project') {
      built.baseTypeName = selectedBaseType || undefined
      built.associatedDomainName = associatedGroupName || undefined
    }
    return built
  }, [associatedGroupName, attributes, entityName, saveTarget, selectedBaseType])

  useEffect(() => {
    if (!jsonDirty) {
      setJsonDraft(prettyJson(payload))
      setJsonError('')
    }
  }, [jsonDirty, payload])

  const addAttribute = (source?: Partial<BuilderAttribute>) => {
    setAttributes((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        name: source?.name ?? 'customField',
        label_en: source?.label_en ?? 'Custom field',
        label_de: source?.label_de ?? '',
        type: source?.type ?? 'string',
        required: source?.required ?? false,
        linkage: source?.linkage ?? false,
        repeatable: source?.repeatable ?? false,
        minLength: source?.minLength,
        maxLength: source?.maxLength,
        values: source?.values
      } as BuilderAttribute
    ])
  }

  const updateAttribute = (key: string, patch: Partial<BuilderAttribute>) => {
    setAttributes((current) => current.map((attr) => (attr.key === key ? { ...attr, ...patch } : attr)))
  }

  const removeAttribute = (key: string) => {
    setAttributes((current) => current.filter((attr) => attr.key !== key))
  }

  const applyJsonToBuilder = () => {
    try {
      const parsed = normalizeJson(JSON.parse(jsonDraft), entityName, selectedBaseType)
      setEntityName(parsed.name ?? entityName)
      setSaveTarget(parsed.isBaseType || !parsed.baseTypeName ? 'base' : 'project')
      setSelectedBaseType(parsed.baseTypeName ?? selectedBaseType)
      setAssociatedGroupName(parsed.associatedDomainName ?? associatedGroupName)
      setAttributes(attributesFromPayload(parsed))
      setJsonDraft(prettyJson(parsed))
      setJsonDirty(false)
      setJsonError('')
      showToast({ severity: 'success', summary: 'JSON applied', detail: 'The builder preview was updated.', life: 2500 })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setJsonError(message)
      showToast({ severity: 'error', summary: 'Invalid JSON', detail: message, life: 4500 })
    }
  }

  const refreshProjectEntities = async () => {
    try {
      const response = await TrustDeck.instance().getProjectEntities('*')
      const names = Array.from(new Set((response ?? []).map((entry: any) => entry?.name).filter(Boolean)))
      setProjectEntities(names as string[])
    } catch {
      setProjectEntities([])
    }
  }

  const save = async () => {
    let finalPayload = payload
    if (jsonDirty) {
      try {
        finalPayload = normalizeJson(JSON.parse(jsonDraft), entityName, selectedBaseType)
        setJsonError('')
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        setJsonError(message)
        showToast({ severity: 'error', summary: 'Invalid JSON', detail: message, life: 4500 })
        return
      }
    }

    if (!finalPayload.name) {
      showToast({ severity: 'error', summary: 'Missing name', detail: 'Please enter an entity type name.', life: 3500 })
      return
    }
    if (saveTarget === 'project' && !finalPayload.baseTypeName) {
      showToast({ severity: 'error', summary: 'Missing base type', detail: 'Project-specific entity types must extend a base type.', life: 3500 })
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
        summary: 'Entity type created',
        detail: saveTarget === 'base' ? 'Base type created successfully.' : 'Project-specific entity type created successfully.',
        life: 3500
      })
      navigate('/entity/manager')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      showToast({ severity: 'error', summary: 'Creation failed', detail: message, life: 6000 })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-7xl space-y-6">
        <PrimaryOutlinedButton
          label={t('common:back', 'Back')}
          icon={<ArrowLeftIcon className="h-5 w-5" />}
          iconPos="left"
          onClick={() => navigate('/entity/manager')}
        />

        <Panel title="Create entity type" className="w-full">
          <div className="grid gap-4 md:grid-cols-2">
            <CustomFloatLabel
              id="entityTypeName"
              value={entityName}
              placeholder={t('entityBuilder:entityName', 'Entity name')}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEntityName(e.target.value)}
              required
            />
            {saveTarget === 'project' && (
              <CustomFloatLabel
                id="associatedDomainName"
                value={associatedGroupName}
                placeholder="Associated group name"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAssociatedGroupName(e.target.value)}
              />
            )}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              disabled={baseTypeOptions.length === 0}
              title={baseTypeOptions.length === 0 ? 'Create a base type first before creating project-specific entity types.' : undefined}
              onClick={() => {
                if (baseTypeOptions.length > 0) setSaveTarget('project')
              }}
              className={`rounded-xl border p-4 text-left transition ${baseTypeOptions.length === 0 ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400' : saveTarget === 'project' ? 'border-color-blue bg-blue-50 text-color-blue' : 'border-gray-200 bg-white hover:border-color-blue'}`}
            >
              <div className="font-semibold">Project-specific type</div>
              <p className="mt-1 text-sm text-gray-500">Extends a base type and belongs to the selected project.</p>
              {baseTypeOptions.length === 0 && (
                <p className="mt-2 text-xs font-semibold text-amber-700">Unavailable until a base type exists.</p>
              )}
            </button>
            <button
              type="button"
              onClick={() => setSaveTarget('base')}
              className={`rounded-xl border p-4 text-left transition ${saveTarget === 'base' ? 'border-color-blue bg-blue-50 text-color-blue' : 'border-gray-200 bg-white hover:border-color-blue'}`}
            >
              <div className="font-semibold">Base type</div>
              <p className="mt-1 text-sm text-gray-500">Creates a reusable blueprint for later project-specific types.</p>
            </button>
          </div>

          {saveTarget === 'project' && (
            <div className="mt-4">
              <CustomDropdown
                id="baseType"
                value={selectedBaseType}
                onChange={(e) => setSelectedBaseType(e.value)}
                options={baseTypeOptions}
                placeholder={t('entityBuilder:baseType', 'Base type')}
              />
              {baseTypeOptions.length === 0 && (
                <p className="mt-2 text-sm text-amber-700">No base types were found. Create a base type first; project-specific entity types become available afterwards.</p>
              )}
            </div>
          )}
        </Panel>

        <div className="grid w-full items-start gap-6 xl:grid-cols-[1fr_1fr]">
          <Panel title="Visual preview" className="w-full">
            <div className="mb-4 flex flex-wrap gap-2">
              <PrimaryOutlinedButton
                label={
                  <span className="inline-flex items-center gap-2">
                    <PlusIcon className="h-4 w-4" />
                    Add custom field
                  </span>
                }
                onClick={() => addAttribute()}
              />
              <PrimaryOutlinedButton
                label="Add common person fields"
                onClick={() => {
                  defaultAttributes.slice(0, 4).forEach((attr: any) => addAttribute({
                    name: attr.name,
                    label_en: attr.labelEn ?? attr.label_en ?? attr.name,
                    label_de: attr.labelDe ?? attr.label_de ?? '',
                    type: attr.type ?? 'string',
                    required: attr.required,
                    linkage: attr.linkage
                  }))
                }}
              />
            </div>

            {attributes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-500">
                No fields configured yet. Add fields visually or paste a JSON definition and apply it to the preview.
              </div>
            ) : (
              <div className="space-y-4">
                {attributes.map((attribute) => (
                  <div key={attribute.key} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-gray-900">{attribute.label_en || attribute.name || 'Field'}</h3>
                      <button type="button" onClick={() => removeAttribute(attribute.key)} className="text-red-600 hover:text-red-800">
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        className="rounded-lg border border-gray-300 px-3 py-2"
                        value={attribute.name}
                        placeholder="Backend name"
                        onChange={(e) => updateAttribute(attribute.key, { name: e.target.value })}
                      />
                      <input
                        className="rounded-lg border border-gray-300 px-3 py-2"
                        value={attribute.label_en ?? ''}
                        placeholder="English label"
                        onChange={(e) => updateAttribute(attribute.key, { label_en: e.target.value })}
                      />
                      <input
                        className="rounded-lg border border-gray-300 px-3 py-2"
                        value={attribute.label_de ?? ''}
                        placeholder="German label"
                        onChange={(e) => updateAttribute(attribute.key, { label_de: e.target.value })}
                      />
                      <CustomDropdown
                        id={`type-${attribute.key}`}
                        value={attribute.type ?? ''}
                        onChange={(e) => updateAttribute(attribute.key, { type: e.value })}
                        options={typeOptions}
                        placeholder="Field type"
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-700">
                      {(['required', 'linkage', 'repeatable'] as const).map((flag) => (
                        <label key={flag} className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={Boolean(attribute[flag])}
                            onChange={(e) => updateAttribute(attribute.key, { [flag]: e.target.checked })}
                          />
                          {flag}
                        </label>
                      ))}
                    </div>
                    {attribute.type === 'enum' && (
                      <input
                        className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2"
                        value={(attribute.values ?? []).join(', ')}
                        placeholder="Dropdown values, comma separated"
                        onChange={(e) => updateAttribute(attribute.key, { values: e.target.value.split(',').map((v) => v.trim()) })}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="JSON import/export" className="w-full">
            <p className="mb-3 text-sm text-gray-500">Paste an entity type JSON, apply it to update the preview, or copy the generated JSON for reuse.</p>
            <textarea
              className="h-[420px] w-full rounded-lg border border-gray-300 p-3 font-mono text-sm"
              spellCheck={false}
              value={jsonDraft}
              onChange={(event) => {
                setJsonDraft(event.target.value)
                setJsonDirty(true)
              }}
            />
            {jsonError && <p className="mt-2 text-sm text-red-600">Invalid JSON: {jsonError}</p>}
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <PrimaryOutlinedButton label="Apply JSON to preview" onClick={applyJsonToBuilder} />
              <PrimaryOutlinedButton
                label="Reset JSON from preview"
                onClick={() => {
                  setJsonDirty(false)
                  setJsonDraft(prettyJson(payload))
                  setJsonError('')
                }}
              />
            </div>
            <div className="mt-4 text-left">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Rendered preview</h3>
              <pre className="max-h-80 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
                {jsonDirty ? jsonDraft : prettyJson(payload)}
              </pre>
            </div>
          </Panel>
        </div>

        <div className="flex w-full justify-center">
          <PrimaryButton label={saving ? 'Saving...' : 'Create entity type'} loading={saving} onClick={save} />
        </div>
      </div>
    </div>
  )
}
