import { useState } from 'react'
import Divider from '@component/common/Divider'
import PrimaryOutlinedButton from '@component/form/buttons/PrimaryOutlinedButton'
import CustomDropdown from '@component/form/CustomDropdown'
import CustomFloatLabel from '@component/form/CustomFloatLabel'
import { PlusIcon } from '@heroicons/react/24/outline'
import SecondaryOutlinedButton from '@component/form/buttons/SecondaryOutlinedButton'
import PrimaryButton from '@component/form/buttons/PrimaryButton'

type Field = {
  id: number
  name: string
  type: string
  options?: string[]
}

export default function EntityConfiguration() {
  const [entityName, setEntityName] = useState<string>('')
  const [fields, setFields] = useState<Field[]>([
    { id: Date.now(), name: '', type: '', options: [] }
  ])

  function addField() {
    setFields((prev) => [
      ...prev,
      { id: Date.now(), name: '', type: '', options: [] }
    ])
  }

  function updateField(id: number, key: 'name' | 'type', value: string) {
    setFields((prev) =>
      prev.map((field) => {
        if (field.id === id) {
          const options =
            key === 'type' && value !== 'Dropdown' ? [] : field.options
          return { ...field, [key]: value, options }
        }
        return field
      })
    )
  }

  function deleteField(id: number) {
    setFields((prev) => prev.filter((f) => f.id !== id))
  }

  function addOption(fieldId: number, option: string) {
    setFields((prev) =>
      prev.map((field) =>
        field.id === fieldId
          ? { ...field, options: [...(field.options || []), option] }
          : field
      )
    )
  }

  function removeOption(fieldId: number, index: number) {
    setFields((prev) =>
      prev.map((field) =>
        field.id === fieldId
          ? { ...field, options: field.options!.filter((_, i) => i !== index) }
          : field
      )
    )
  }

  function handleCreate() {
    
  }

  return (
    <>
      <CustomFloatLabel
        id="entityName"
        value={entityName}
        placeholder="Entity Name"
        onChange={(e) => {
          setEntityName(e.target.value)
        }}
      />
      <Divider text={`Define ${entityName ? entityName : 'entity'}`} />

      {fields.map((field) => (
  <div key={field.id} className="flex flex-col gap-2 mb-4 rounded">
    <div className="flex gap-4 items-start">
      {/* Field Name */}
      <div className="flex-1">
        <CustomFloatLabel
          id={String(field.id)}
          value={field.name}
          placeholder="Field Name"
          onChange={(e) => updateField(field.id, 'name', e.target.value)}
        />
      </div>

      {/* Type selector + dropdown options underneath */}
      <div className="flex-1 flex flex-col gap-2">
        <CustomDropdown
          id={String(field.id)}
          value={field.type}
          options={[
            { label: 'Text', value: 'Text' },
            { label: 'Number', value: 'Number' },
            { label: 'Email', value: 'Email' },
            { label: 'Phone', value: 'Phone' },
            { label: 'Date', value: 'Date' },
            { label: 'Dropdown', value: 'Dropdown' }
          ]}
          onChange={(e) => updateField(field.id, 'type', e.value)}
          placeholder="Data type"
        />

        {field.type === 'Dropdown' && (
          <div className="flex flex-col gap-2 mt-1">
            {(field.options || []).map((option, index) => (
              <div key={index} className="flex gap-2 items-center">
                <div className="flex-1">
                  <CustomFloatLabel
                    id={`option-${field.id}-${index}`}
                    value={option}
                    placeholder="Option"
                    onChange={(e) => {
                      const newOptions = [...(field.options || [])]
                      newOptions[index] = e.target.value
                      setFields((prev) =>
                        prev.map((f) =>
                          f.id === field.id
                            ? { ...f, options: newOptions }
                            : f
                        )
                      )
                    }}
                  />
                </div>
                <button
                  className="text-red-500"
                  onClick={() => removeOption(field.id, index)}
                >
                  Delete
                </button>
              </div>
            ))}
            <button
              className="text-blue-500 mt-1 self-start"
              onClick={() => addOption(field.id, '')}
            >
              Add Option
            </button>
          </div>
        )}
      </div>

      {/* Delete button */}
      {fields.length > 1 && (
        <SecondaryOutlinedButton
          label="Delete"
          className="text-red-500"
          onClick={() => deleteField(field.id)}
        />
      )}
    </div>
  </div>
))}


      <PrimaryOutlinedButton
        icon={<PlusIcon className="w-6 h-6 mr-1" />}
        label="Add Field"
        className="my-3"
        onClick={addField}
      />
      <div className="flex justify-end">
        <PrimaryButton 
          label="Create Entity" 
          className="my-3" 
          disabled={fields.length == 0 || fields[0].name == '' || fields[0].type == ''}
          onClick={() => handleCreate()}
        />
      </div>
    </>
  )
}
