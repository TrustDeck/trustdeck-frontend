import SecondaryOutlinedButton from '@component/form/buttons/SecondaryOutlinedButton.tsx'
import { AttributeType, useEntityTypeStore } from '../stores/EntityTypeStore'
import CustomFloatLabel from '@component/form/CustomFloatLabel'
import CustomDropdown from '@component/form/CustomDropdown'

export default function Inspector() {

  const blacklist = [
    'id',
    'name',
    'key',
    'group',
    'layout',
    'attributes',
    'type',
    'values'
  ]

  const {
    getSelectedAttribute,
    updatePartialAttribute,
    selectedKey,
    resetAttribute,
    setSelectedKey
  } = useEntityTypeStore()
  const selected = getSelectedAttribute()

  function handleRemoveAttribute() {
    const tempSelectedKey = selectedKey
    setSelectedKey('')
    resetAttribute(tempSelectedKey)
  }

  return (
    <div className="p-3 sm:p-4">
      {selected && selected.name ? (
        <>
          <h3 className="text-lg font-semibold text-black break-words mb-1">
            {selected.name}
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Configure field properties.
          </p>

          {/* Field type selector */}
          <div className="mb-4">
              <CustomDropdown
                placeholder="Field type"
                id={`${selected.key}-type`}
                value={selected.type ?? 'string'}
                onChange={(e) =>
                  updatePartialAttribute(
                    selectedKey,
                    'type',
                    e.target.value as AttributeType
                  )
                }
                options={[
                  { label: 'Text', value: 'string' },
                  { label: 'Integer', value: 'integer' },
                  { label: 'Number', value: 'number' },
                  { label: 'Date', value: 'date' },
                  { label: 'Yes / No', value: 'boolean' },
                  { label: 'Dropdown', value: 'enum' }
                ]}
              />
          </div>

          {/* Dropdown options editor for enum fields */}
          {selected.type === 'enum' && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Dropdown options
              </label>
              <div className="space-y-2">
                {(selected.values && selected.values.length
                  ? selected.values
                  : ['male', 'female', 'diverse', 'unknown']
                ).map((opt, idx) => (
                  <div key={`${selected.key}-opt-${idx}`} className="flex gap-2">
                    <div className="flex-1">
                      <CustomFloatLabel
                        id={`${selected.key}-opt-${idx}`}
                        value={opt}
                        placeholder={`Option ${idx + 1}`}
                        onChange={(e) => {
                          const base =
                            selected.values && selected.values.length
                              ? selected.values
                              : ['male', 'female', 'diverse', 'unknown']
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
                            : ['male', 'female', 'diverse', 'unknown']
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
                        : ['male', 'female', 'diverse', 'unknown']
                    updatePartialAttribute(selectedKey, 'values', [
                      ...base,
                      ''
                    ])
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
              // For dropdown fields, hide string-length constraints
              if (selected.type === 'enum' && (key === 'minLength' || key === 'maxLength')) {
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
                        { label: 'Yes', value: 'true' },
                        { label: 'No', value: 'false' }
                      ]}
                      onChange={(e) =>
                        updatePartialAttribute(
                          selectedKey,
                          key,
                          e.value === 'true'
                        )
                      }
                      placeholder={key}
                    />
                  ) : typeof raw === 'number' ? (
                    <CustomFloatLabel
                      id={key}
                      value={String(raw)}
                      placeholder={key}
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
                      placeholder={key}
                      onChange={(e) =>
                        updatePartialAttribute(
                          selectedKey,
                          key,
                          e.target.value
                        )
                      }
                    />
                  )}
                </div>
              )
            })}
          </div>
          <SecondaryOutlinedButton
            label={'Reset field to defaults'}
            className="w-full"
            onClick={handleRemoveAttribute}
          />
        </>
      ) : (
        <p className="text-sm text-gray-500">
          Select a field in the builder to edit its details here.
        </p>
      )}
    </div>
  )
}
