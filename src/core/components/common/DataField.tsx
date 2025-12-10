import { FloatLabel } from 'primereact/floatlabel'
import { InputText } from 'primereact/inputtext'

interface DataFieldProps {
  id: string
  value: string | number | undefined
  label: string
  className?: string
}

/**
 * The `DataField` component is a custom wrapper around PrimeReact's `InputText` 
 * and `FloatLabel` components that displays a non-editable input field with a floating label.
 * It allows for easy presentation of data with a clean and accessible UI.
 * 
 * @param {Object} props - The component props.
 * @param {string} props.id - The unique identifier for the input field.
 * @param {string} props.value - The value to be displayed in the input field.
 * @param {string} props.label - The label associated with the input field.
 * @param {string} [props.className] - Optional additional CSS classes for custom styling.
 * 
 * @returns {JSX.Element} The rendered `DataField` component.
 */
export default function DataField({ id, value, label, className }: DataFieldProps) {
  const classes = `w-full rounded-lg border-color-light-gray text-xl font-normal ${className}`
  const stringValue = typeof value === 'number' ? value.toString() : value ?? ''
  return (
    <FloatLabel className="mt-8 w-full">
      <InputText
        id={id}
        value={stringValue}
        readOnly
        className={classes}
      />
      <label htmlFor={id}>{label}</label>
    </FloatLabel>
  )
}
