import React, { useState } from 'react'
import { Calendar } from 'primereact/calendar'
import HelpTooltip from '../common/HelpTooltip'

type CustomCalendarProps = {
  id: string
  value: Date | null
  onChange?: (e: { value: Date | null }) => void
  placeholder: string
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
  const [focused, setFocused] = useState(false)
  const [isValid, setIsValid] = useState(true)

  const handleBlur = () => {
    setFocused(false)
    if (validate) setIsValid(validate(value))
  }

  const handleChange = (event: { value?: Date | null }) => {
    onChange?.({ value: event?.value ?? null })
  }

  const showFloating = focused || Boolean(value) || !isValid

  return (
    <div className="relative w-full">
      <Calendar
        id={id}
        value={value}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        readOnlyInput={readOnly}
        disabled={readOnly}
        className={`h-[44px] w-full rounded-lg px-3 pb-2 pt-3 text-xl font-normal ${className} ${
          !isValid ? 'border border-red-500' : 'border border-color-light-gray'
        }`}
        panelClassName="z-[9999]"
        inputClassName={`m-0 h-full w-full border-none bg-transparent p-0 pb-1 font-font-text text-xl focus:ring-0 ${helpText ? 'pr-16' : 'pr-10'}`}
        dateFormat={dateFormat}
        showTime={showTime}
        showSeconds={showSeconds}
        hourFormat={hourFormat}
        showIcon
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
          className="absolute right-11 top-1/2 z-30 -translate-y-1/2"
        />
      )}
    </div>
  )
}

export default CustomCalendar
