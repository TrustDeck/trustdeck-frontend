import { Dropdown, DropdownChangeEvent } from 'primereact/dropdown'
import HelpTooltip from '../common/HelpTooltip'

interface DropdownOption {
  label: string
  value: string
}

type CustomDropdownProps = {
  id: string
  label?: string
  value: string | number
  options: DropdownOption[]
  onChange: (e: DropdownChangeEvent) => void
  placeholder?: string
  className?: string
  helpText?: string
  textColor?: 'text-gray-500' | 'text-gray-700'
  required?: boolean
  disabled?: boolean
  invalid?: boolean
  errorMessage?: string
  filter?: boolean
  filterPlaceholder?: string
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  id,
  label,
  value,
  options,
  onChange,
  placeholder,
  className = '',
  helpText,
  textColor = 'text-gray-500',
  required,
  disabled,
  invalid = false,
  errorMessage,
  filter = false,
  filterPlaceholder,
  ...props
}) => {
  const fieldLabel = (label || placeholder || '').trim()

  return (
    <div className={`td-custom-dropdown w-full ${className}`}>
      {fieldLabel && (
        <label htmlFor={id} className="td-field-label mb-1 flex items-center gap-1">
          <span>{fieldLabel}</span>
          {required && <span aria-hidden="true">*</span>}
        </label>
      )}

      <div className="relative w-full">
        <Dropdown
          id={id}
          value={value}
          options={options}
          onChange={onChange}
          placeholder=""
          disabled={disabled}
          filter={filter}
          filterPlaceholder={filterPlaceholder}
          className={`flex h-[44px] w-full items-center rounded-lg border font-font-text text-xl font-normal ${
            invalid ? 'border-red-500' : 'border-color-light-gray'
          } ${helpText ? 'pr-9' : ''}`}
          pt={{
            input: {
              className: `flex h-[44px] items-center px-3 font-font-text text-xl font-normal ${textColor}`
            },
            item: {
              className: 'font-font-text text-lg font-normal text-gray-500'
            }
          }}
          {...props}
        />

        {helpText && (
          <HelpTooltip
            text={helpText}
            className="absolute right-10 top-1/2 z-30 -translate-y-1/2"
          />
        )}
      </div>

      {invalid && errorMessage && (
        <p className="mt-1 text-sm font-medium text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      )}
    </div>
  )
}

export default CustomDropdown
