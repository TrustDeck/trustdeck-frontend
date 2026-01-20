import SecondaryOutlinedButton from '@component/form/buttons/SecondaryOutlinedButton.tsx'
import { useTranslation } from 'react-i18next'
import { Attribute, useEntityTypeStore } from '../stores/EntityTypeStore'
import CustomFloatLabel from '@component/form/CustomFloatLabel'

export default function Inspector() {
  const { t } = useTranslation()

  const blacklist = [
    'id',
    'name',
    'key',
    'group',
    'layout',
    'attributes',
    'type'
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
    console.log('Attribute reset:', tempSelectedKey)
  }
  return (
    <>
      {selected && selected.name ? (
        <>
          <h3 className="text-black break-words mb-3">{selected.name}</h3>

          <div className="space-y-2 mb-4">
            {Object.keys(selected).map((key) => {
              if (blacklist.includes(key)) return null

              // get value and render safely
              const raw = (selected as any)[key]
              const value =
                raw === null || raw === undefined
                  ? String(raw)
                  : typeof raw === 'object'
                    ? JSON.stringify(raw)
                    : String(raw)

              return (
                <div key={key} className="mb-2">
                  <div className="mt-1">
                    {typeof raw === 'boolean' ? (
                      <>
                      
                       <input
                        id={key}
                        type="checkbox"
                        checked={Boolean(raw)}
                        onChange={(e) =>
                          updatePartialAttribute(
                            selectedKey,
                            key,
                            e.target.checked
                          )
                        }
                        className="h-4 w-4"
                      />
                      <span> {key}</span>
                      </>
                     
                    ) : typeof raw === 'number' ? (
                      <CustomFloatLabel //TODO remove this component for a number input with validation
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
                </div>
              )
            })}
          </div>
          <SecondaryOutlinedButton
            label={'Remove Attribute'}
            className="w-full"
            onClick={() => handleRemoveAttribute()}
          />
        </>
      ) : null}
    </>
  )
}
