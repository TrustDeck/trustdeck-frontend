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
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  id,
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
  ...props
}) => {
  const showFloating = value !== ''

  return (
    <div
      className={`td-custom-dropdown relative w-full ${helpText ? 'td-custom-dropdown--with-help' : ''} ${className}`}
    >
      <div className="relative w-full">
        <Dropdown
          id={id}
          value={value}
          options={options}
          onChange={onChange}
          placeholder=""
          disabled={disabled}
          className={`flex h-[44px] w-full items-center rounded-lg border font-font-text text-xl font-normal ${
            invalid ? 'border-red-500' : 'border-color-light-gray'
          }`}
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

        <label
          htmlFor={id}
          className={`pointer-events-none absolute left-3 bg-white px-1 font-font-text text-gray-500 transition-all dark:bg-slate-950 dark:text-gray-300
            ${showFloating ? '-top-2 text-sm' : 'top-1/2 -translate-y-1/2 text-xl'}
            ${invalid ? 'font-semibold text-red-600' : ''}
          `}
        >
          {placeholder}
          {required && <span className="ml-1">*</span>}
        </label>
      </div>

      {invalid && errorMessage && (
        <p className="mt-1 text-sm font-medium text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      )}

      {helpText && (
        <HelpTooltip
          text={helpText}
          className="td-custom-dropdown__help absolute top-1/2 z-30 -translate-y-1/2"
        />
      )}
    </div>
  )
}

export default CustomDropdown
