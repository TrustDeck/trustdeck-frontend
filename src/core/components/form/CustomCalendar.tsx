import React, { useState } from 'react'
import { Calendar } from 'primereact/calendar'
import HelpTooltip from '../common/HelpTooltip'

type CustomCalendarProps = {
  id: string
  value: Date | null
  onChange?: (e: { value: Date | null }) => void
  placeholder?: string
  label?: string
  helpText?: string
  errorMessage?: string
  validate?: (value: Date | null) => boolean
  className?: string
  readOnly?: boolean
  required?: boolean
  dateFormat?: string
  showTime?: boolean
  showSeconds?: boolean
  hourFormat?: '12' | '24'
}

const CustomCalendar: React.FC<CustomCalendarProps> = ({
  id,
  value,
  onChange,
  placeholder,
  label,
  helpText,
  errorMessage = '',
  validate,
  className = '',
  readOnly,
  required,
  dateFormat = 'yy-mm-dd',
  showTime = false,
  showSeconds = false,
  hourFormat = '24'
}) => {
  const [isValid, setIsValid] = useState(true)

  const handleBlur = () => {
    if (validate) setIsValid(validate(value))
  }

  const handleChange = (event: { value?: Date | null }) => {
    onChange?.({ value: event?.value ?? null })
  }

  const fieldLabel = (label || placeholder || '').trim()

  return (
    <div className="w-full">
      {fieldLabel && (
        <label htmlFor={id} className="td-field-label mb-1 flex items-center gap-1">
          <span>{fieldLabel}</span>
          {required && <span aria-hidden="true">*</span>}
        </label>
      )}

      <div className="relative w-full">
        <Calendar
          id={id}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          readOnlyInput={readOnly}
          disabled={readOnly}
          className={`h-[44px] w-full rounded-lg text-xl font-normal ${className} ${
            !isValid ? 'border border-red-500' : 'border border-color-light-gray'
          }`}
          panelClassName="z-[9999]"
          inputClassName={`m-0 h-full w-full border-none bg-transparent px-3 font-font-text text-xl font-normal text-gray-900 focus:ring-0 dark:text-gray-100 ${helpText ? 'pr-16' : 'pr-10'}`}
          dateFormat={dateFormat}
          showTime={showTime}
          showSeconds={showSeconds}
          hourFormat={hourFormat}
          showIcon
        />

        {helpText && (
          <HelpTooltip
            text={helpText}
            className="absolute right-11 top-1/2 z-30 -translate-y-1/2"
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

export default CustomCalendar
