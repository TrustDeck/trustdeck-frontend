import { InputText } from 'primereact/inputtext'

interface DataFieldProps {
  id: string
  value: string | number | undefined
  label: string
  className?: string
}

/** Displays a non-editable field with a permanent label above it. */
export default function DataField({ id, value, label, className = '' }: DataFieldProps) {
  const stringValue = typeof value === 'number' ? value.toString() : value ?? ''

  return (
    <div className="w-full">
      {label.trim() && (
        <label htmlFor={id} className="td-field-label mb-1 block">
          {label}
        </label>
      )}
      <InputText
        id={id}
        value={stringValue}
        readOnly
        className={`w-full rounded-lg border-color-light-gray text-xl font-normal ${className}`}
      />
    </div>
  )
}
