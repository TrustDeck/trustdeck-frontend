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

/**
 * Shared text field with a permanent small label above the control.
 *
 * The historic component name is retained to avoid touching every caller, but
 * no floating-label behavior is rendered anymore.
 */
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

  const handleBlur = () => {
    if (validate) {
      setIsValid(validate(String(value)))
    } else if (required) {
      setIsValid(String(value).trim().length > 0)
    }
    onBlur?.()
  }

  const label = placeholder.trim()

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="td-field-label mb-1 flex items-center gap-1">
          <span>{label}</span>
          {required && <span aria-hidden="true">*</span>}
        </label>
      )}

      <div className="relative w-full">
        <InputText
          id={id}
          value={String(value)}
          onChange={onChange}
          placeholder={!readOnly && !disabled ? inputPlaceholder : undefined}
          onBlur={handleBlur}
          onKeyDown={onKeyDown}
          readOnly={readOnly}
          disabled={disabled}
          aria-invalid={!isValid}
          className={`h-[44px] w-full rounded-lg px-3 font-font-text text-xl font-normal ${helpText && helpIconInside ? 'pr-10' : ''} ${className} ${
            !isValid ? 'border border-red-500' : 'border border-color-light-gray'
          } ${disabled ? 'cursor-not-allowed text-gray-400' : ''}`}
        />

        {helpText && (
          <HelpTooltip
            text={helpText}
            className={`absolute top-1/2 z-30 -translate-y-1/2 ${
              helpIconInside ? 'right-3' : '-right-8'
            }`}
          />
        )}
      </div>

      {!isValid && errorMessage && (
        <p className="mt-1 text-sm font-semibold text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      )}
    </div>
  )
}

export default CustomFloatLabel
