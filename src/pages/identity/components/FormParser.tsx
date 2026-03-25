import CustomFloatLabel from '@component/form/CustomFloatLabel'
import CustomCalendar from '@component/form/CustomCalendar'
import CustomDropdown from '@component/form/CustomDropdown'
import { Attribute } from '../../../core/stores/ProjectStore'
import { getValue } from '../util/value'

interface ParserProps {
  attributes: Attribute[]
  values: Record<string, any>
  onChange: (key: string, value: any) => void
  showRequired?: boolean
  path?: string
}

export const parseAttributes = ({
  attributes,
  values,
  onChange,
  showRequired = true,
  path = ''
}: ParserProps) => {
  const handleChange = (fullPath: string, newValue: any) => {
    onChange(fullPath, newValue)
  }

  return attributes.map((attr) => {
    const fullPath = path ? `${path}.${attr.name}` : attr.name
    const value = getValue(values, fullPath)

    /* =========================
      REPEATABLE GROUP
    ========================== */
    if (attr.repeatable && attr.attributes) {
      const items = value ?? []

      return (
        <div key={fullPath} className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">{attr.name}</h3>
            <button
              type="button"
              className="text-sm text-primary"
              onClick={() => handleChange(fullPath, [...items, {}])}
            >
              + Add
            </button>
          </div>

          {items.map((_: any, index: number) => {
            const itemPath = `${fullPath}.${index}`

            return (
              <div key={itemPath} className="border p-3 rounded mb-3">
                {parseAttributes({
                  attributes: attr.attributes!,
                  values,
                  onChange,
                  showRequired,
                  path: itemPath
                })}

                <button
                  type="button"
                  className="text-red-500 text-sm mt-2"
                  onClick={() => {
                    const updated = [...items]
                    updated.splice(index, 1)
                    handleChange(fullPath, updated)
                  }}
                >
                  Remove
                </button>
              </div>
            )
          })}
        </div>
      )
    }

    /* =========================
      GROUP (non-repeatable)
    ========================== */
    if (attr.attributes) {
      const containerClass =
        attr.layout === 'row' ? 'grid grid-cols-2 gap-4' : 'space-y-4'

      return (
        <div key={fullPath} className="mb-4">
          {attr.group && <h3 className="font-semibold mb-2">{attr.name}</h3>}

          <div className={containerClass}>
            {parseAttributes({
              attributes: attr.attributes,
              values,
              onChange,
              showRequired,
              path: fullPath
            })}
          </div>
        </div>
      )
    }

    /* =========================
      ENUM
    ========================== */
    if (attr.type === 'enum' && attr.enum) {
      return (
        <div key={fullPath} className="mb-3">
          <label className="block mb-1">{attr.name}</label>
          <CustomDropdown
            value={value}
            options={attr.enum}
            onChange={(e) => handleChange(fullPath, e.value)}
            placeholder={`Select ${attr.name}`}
            className="w-full"
          />
        </div>
      )
    }

    /* =========================
      STRING / INTEGER
    ========================== */
    if (attr.type === 'string' || attr.type === 'integer') {
      return (
        <CustomFloatLabel
          key={fullPath}
          id={fullPath}
          value={value ?? ''}
          onChange={(e) => handleChange(fullPath, e.target.value)}
          placeholder={attr.name}
          required={showRequired ? attr.required : false}
        />
      )
    }

    /* =========================
      DATE
    ========================== */
    if (attr.type === 'date') {
      return (
        <CustomCalendar
          key={fullPath}
          id={fullPath}
          value={value}
          onChange={(e) => handleChange(fullPath, e.value)}
          placeholder={attr.name}
          className="w-full"
          required={showRequired ? attr.required : false}
        />
      )
    }

    return null
  })
}
