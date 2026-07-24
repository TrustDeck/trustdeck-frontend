import SecondaryOutlinedButton from '@component/form/buttons/SecondaryOutlinedButton'
import { AttributeType, useEntityTypeStore } from '../stores/EntityTypeStore'
import CustomFloatLabel from '@component/form/CustomFloatLabel'
import CustomDropdown from '@component/form/CustomDropdown'
import { defaultAttributes } from '../configs/attributes'
import { useTranslation } from 'react-i18next'

export default function Inspector() {
  const presetDropdownValues = ['option1', 'option2', 'option3']

  const blacklist = [
    'id',
    'name',
    'key',
    'group',
    'layout',
    'attributes',
    'type',
    'values',
    'labelEn',
    'labelDe'
  ]

  const {
    getSelectedAttribute,
    updatePartialAttribute,
    selectedKey,
    resetAttribute,
    setSelectedKey
  } = useEntityTypeStore()
  const selected = getSelectedAttribute()
  const isPredefined =
    !!selected?.name &&
    defaultAttributes.some((attr) => attr.name === selected.name)
  const { t, i18n } = useTranslation()
  const lang = i18n.language || 'en'

  function handleRemoveAttribute() {
    const tempSelectedKey = selectedKey
    setSelectedKey('')
    resetAttribute(tempSelectedKey)
  }

  return (
    <div className="p-3 sm:p-4">
      {selected ? (
        <>
          <h3 className="td-section-title mb-1 break-words">
            {(() => {
              const hasCustomLabel = !!(selected.labelEn || selected.labelDe)
              if (selected.group && !hasCustomLabel) {
                return t('entityBuilder:enterGroupName', 'Enter section name')
              }
              const label = lang.startsWith('de')
                ? (selected.labelDe ?? selected.labelEn)
                : (selected.labelEn ?? selected.labelDe)
              return label || selected.name || 'Custom field'
            })()}
          </h3>
          <p className="td-section-subtitle mb-4">
            {t('entityBuilder:configureField', 'Configure field properties.')}
          </p>

          {/* English / German labels */}
          <div className="mb-4 grid grid-cols-1 gap-2">
            <CustomFloatLabel
              id={`${selected.key}-label-en`}
              value={selected.labelEn ?? ''}
              placeholder={t('entityBuilder:englishLabel', 'English label')}
              disabled={isPredefined}
              onChange={(e) =>
                updatePartialAttribute(selectedKey, 'labelEn', e.target.value)
              }
              required
            />
            <CustomFloatLabel
              id={`${selected.key}-label-de`}
              value={selected.labelDe ?? ''}
              placeholder={t('entityBuilder:germanLabel', 'German label')}
              disabled={isPredefined}
              onChange={(e) =>
                updatePartialAttribute(selectedKey, 'labelDe', e.target.value)
              }
              required
            />
          </div>

          {/* Field type selector (hidden for groups) */}
          {!selected.group && (
            <div className="mb-4">
              <CustomDropdown
                placeholder={t('entityBuilder:fieldType', 'Field type')}
                id={`${selected.key}-type`}
                value={selected.type ?? 'string'}
                onChange={(e) => {
                  const nextType = e.value as AttributeType
                  updatePartialAttribute(selectedKey, 'type', nextType)

                  if (nextType === 'enum') {
                    if (!selected.values || selected.values.length === 0) {
                      updatePartialAttribute(
                        selectedKey,
                        'values',
                        presetDropdownValues
                      )
                    }
                  } else {
                    updatePartialAttribute(selectedKey, 'values', undefined)
                  }
                }}
                options={[
                  { label: 'Text', value: 'string' },
                  { label: 'Integer', value: 'integer' },
                  { label: 'Number', value: 'number' },
                  { label: 'Date', value: 'date' },
                  { label: 'Yes / No', value: 'boolean' },
                  { label: 'Dropdown', value: 'enum' }
                ]}
                disabled={isPredefined}
              />
            </div>
          )}

          {/* Dropdown options editor for enum fields (not for groups) */}
          {!selected.group && selected.type === 'enum' && (
            <div className="mb-4">
              <label className="td-field-label mb-1 block">
                {t('entityBuilder:dropdownOptions', 'Dropdown options')}
              </label>
              <div className="space-y-2">
                {(selected.values && selected.values.length
                  ? selected.values
                  : presetDropdownValues
                ).map((opt, idx) => (
                  <div
                    key={`${selected.key}-opt-${idx}`}
                    className="flex gap-2"
                  >
                    <div className="flex-1">
                      <CustomFloatLabel
                        id={`${selected.key}-opt-${idx}`}
                        value={opt}
                        placeholder={t(
                          'entityBuilder:optionLabel',
                          `Option ${idx + 1}`
                        )}
                        onChange={(e) => {
                          const base =
                            selected.values && selected.values.length
                              ? selected.values
                              : presetDropdownValues
                          const next = [...base]
                          next[idx] = e.target.value
                          updatePartialAttribute(selectedKey, 'values', next)
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className="text-xs text-red-500 px-2"
                      onClick={() => {
                        const base =
                          selected.values && selected.values.length
                            ? selected.values
                            : presetDropdownValues
                        const next = base.filter((_, i) => i !== idx)
                        updatePartialAttribute(selectedKey, 'values', next)
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="mt-1 text-xs text-primary"
                  onClick={() => {
                    const base =
                      selected.values && selected.values.length
                        ? selected.values
                        : presetDropdownValues
                    updatePartialAttribute(selectedKey, 'values', [...base, ''])
                  }}
                >
                  + Add option
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3 mb-4">
            {Object.keys(selected).map((key) => {
              if (blacklist.includes(key)) return null
              // Show length constraints only for string fields
              if (
                (key === 'minLength' || key === 'maxLength') &&
                selected.type !== 'string'
              ) {
                return null
              }

              const raw = (selected as any)[key]

              return (
                <div key={key} className="mb-1">
                  {typeof raw === 'boolean' ? (
                    <CustomDropdown
                      id={`${selected.key}-${key}`}
                      value={raw ? 'true' : 'false'}
                      options={[
                        { label: t('entityBuilder:yes', 'Yes'), value: 'true' },
                        { label: t('entityBuilder:no', 'No'), value: 'false' }
                      ]}
                      onChange={(e) =>
                        updatePartialAttribute(
                          selectedKey,
                          key,
                          e.value === 'true'
                        )
                      }
                      placeholder={t(`entityBuilder:field.${key}`, key)}
                    />
                  ) : typeof raw === 'number' ? (
                    <CustomFloatLabel
                      id={key}
                      value={String(raw)}
                      placeholder={t(`entityBuilder:field.${key}`, key)}
                      disabled={
                        isPredefined &&
                        (key === 'minLength' || key === 'maxLength')
                      }
                      onChange={(e) => {
                        const v = e.target.value
                        const num = v === '' ? undefined : Number(v)
                        updatePartialAttribute(selectedKey, key, num)
                      }}
                    />
                  ) : (
                    <CustomFloatLabel
                      id={key}
                      value={
                        raw === null || raw === undefined ? '' : String(raw)
                      }
                      placeholder={t(`entityBuilder:field.${key}`, key)}
                      onChange={(e) =>
                        updatePartialAttribute(selectedKey, key, e.target.value)
                      }
                    />
                  )}
                </div>
              )
            })}
          </div>
          <SecondaryOutlinedButton
            label={t('entityBuilder:resetField', 'Reset field to defaults')}
            className="w-full"
            onClick={handleRemoveAttribute}
          />
        </>
      ) : (
        <p className="text-sm text-gray-500">
          {t(
            'entityBuilder:selectFieldHint',
            'Select a field in the builder to edit its details here.'
          )}
        </p>
      )}
    </div>
  )
}
