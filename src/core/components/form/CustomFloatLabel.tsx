import React, { useState } from 'react'
import { InputText } from 'primereact/inputtext'
import HelpTooltip from '../common/HelpTooltip'

type CustomFloatLabelProps = {
  id: string
  value: string | number
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder: string
  inputPlaceholder?: string
  helpText?: string
  helpIconInside?: boolean
  errorMessage?: string
  onBlur?: () => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  validate?: (value: string) => boolean
  className?: string
  readOnly?: boolean
  disabled?: boolean
  required?: boolean
}

const CustomFloatLabel: React.FC<CustomFloatLabelProps> = ({
  id,
  value,
  onChange,
  placeholder,
  inputPlaceholder,
  helpText,
  helpIconInside = false,
  onBlur,
  onKeyDown,
  errorMessage = '',
  validate,
  className = '',
  readOnly,
  disabled,
  required
}) => {
  const [isValid, setIsValid] = useState(true)
  const [focused, setFocused] = useState(false)

  const handleBlur = () => {
    setFocused(false)
    if (validate) {
      setIsValid(validate(String(value)))
    } else if (required) {
      setIsValid(String(value).trim().length > 0)
    }
    onBlur?.()
  }

  const showFloating = focused || String(value).length > 0 || !isValid

  return (
    <div className="relative w-full">
      <InputText
        id={id}
        value={String(value)}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        placeholder={inputPlaceholder}
        onBlur={handleBlur}
        onKeyDown={onKeyDown}
        readOnly={readOnly}
        disabled={disabled}
        className={`h-[44px] w-full rounded-lg px-3 font-font-text text-xl font-normal ${helpText && helpIconInside ? 'pr-10' : ''} ${className} ${
          !isValid ? 'border border-red-500' : 'border border-color-light-gray'
        } ${disabled ? 'cursor-not-allowed text-gray-400' : ''}`}
      />

      <label
        htmlFor={id}
        className={`td-floating-label pointer-events-none absolute left-3 font-font-text transition-all
          ${showFloating ? 'td-floating-label--active -top-2 text-sm' : 'top-1/2 -translate-y-1/2 text-xl'}
          ${!isValid ? 'td-floating-label--error font-semibold text-red-600' : 'text-gray-500 dark:text-gray-300'}
        `}
      >
        {!isValid && errorMessage ? errorMessage : placeholder}
        {required && <span className="ml-1">*</span>}
      </label>

      {helpText && (
        <HelpTooltip
          text={helpText}
          className={`absolute top-1/2 z-30 -translate-y-1/2 ${
            helpIconInside ? 'right-3' : '-right-8'
          }`}
        />
      )}
    </div>
  )
}

export default CustomFloatLabel
