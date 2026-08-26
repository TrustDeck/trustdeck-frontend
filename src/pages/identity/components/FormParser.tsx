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
  language?: string
}

export const parseAttributes = ({
  attributes,
  values,
  onChange,
  showRequired = true,
  path = '',
  language = 'en'
}: ParserProps) => {
  const resolveLocalizedLabel = (attr: Attribute) => {
    const a = attr as any
    const en = a.label_en
    const de = a.label_de
    const isGerman = language.startsWith('de')
    return isGerman ? (de ?? en) : (en ?? de)
  }

  const getDisplayLabel = (attr: Attribute) => {
    const localized = resolveLocalizedLabel(attr)
    return localized || attr.name || attr.key || 'Field'
  }

  const getPathForAttribute = (attr: Attribute) => {
    const id = attr.name || attr.key || ''
    if (!id) return path
    return path ? `${path}.${id}` : id
  }

  const handleChange = (fullPath: string, newValue: any) => {
    onChange(fullPath, newValue)
  }

  return attributes.map((attr, index) => {
    const fullPath = getPathForAttribute(attr)
    const displayLabel = getDisplayLabel(attr)
    const value = getValue(values, fullPath)

    /* =========================
      REPEATABLE GROUP
    ========================== */
    if (attr.repeatable && attr.attributes) {
      const items = value ?? []

      if (showRequired) {
        // Registration is stepper-driven; avoid add/remove UI here.
        return (
          <div key={fullPath} className="mb-4">
            {parseAttributes({
              attributes: attr.attributes,
              values,
              onChange,
              showRequired,
              path: fullPath,
              language
            })}
          </div>
        )
      }

      return (
        <div key={fullPath} className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="td-section-title">{displayLabel}</h3>
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
      const childPath = attr.name ? fullPath : path

      // Ignore group containers in rendering; only keep their child layout.
      if (attr.group) {
        const showSearchGroupDivider = !showRequired && index > 0
        return (
          <div
            key={fullPath}
            className={`${showSearchGroupDivider ? 'mt-4 border-t border-gray-200 pt-4' : ''} space-y-4`}
          >
            {parseAttributes({
              attributes: attr.attributes,
              values,
              onChange,
              showRequired,
              path: childPath,
              language
            })}
          </div>
        )
      }

      const containerClass =
        attr.layout === 'row'
          ? `grid gap-4 ${
              attr.attributes.length === 3
                ? 'grid-cols-1 md:grid-cols-3'
                : attr.attributes.length === 2
                  ? 'grid-cols-1 md:grid-cols-2'
                  : 'grid-cols-1'
            }`
          : 'space-y-4'

      return (
        <div key={fullPath} className="mb-4">
          <div className={containerClass}>
            {parseAttributes({
              attributes: attr.attributes,
              values,
              onChange,
              showRequired,
              path: childPath,
              language
            })}
          </div>
        </div>
      )
    }

    /* =========================
      ENUM
    ========================== */
    if (attr.type === 'enum') {
      // Search form should skip enum fields completely.
      if (!showRequired) return null

      const enumValues = attr.values ?? attr.enum ?? []
      return (
        <div key={fullPath} className="mb-3">
          <CustomDropdown
            value={value}
            options={enumValues.map((option) => ({
              label: option,
              value: option
            }))}
            onChange={(e) => handleChange(fullPath, e.value)}
            placeholder={displayLabel}
            className="w-full"
            id={fullPath}
            required={showRequired ? attr.required : false}
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
          placeholder={displayLabel}
          required={showRequired ? attr.required : false}
        />
      )
    }

    /* =========================
      DATE
    ========================== */
    if (attr.type === 'date') {
      return (
        <div key={fullPath} className="max-w-xs">
          <CustomCalendar
            id={fullPath}
            value={value}
            onChange={(e) => handleChange(fullPath, e.value)}
            placeholder={displayLabel}
            required={showRequired ? attr.required : false}
          />
        </div>
      )
    }

    return null
  })
}
