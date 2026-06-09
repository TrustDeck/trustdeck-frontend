import React, { useState } from 'react'
import { Calendar } from 'primereact/calendar'
import { Dialog } from 'primereact/dialog'
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

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
  hourFormat = '24'
}) => {
  const [visible, setVisible] = useState(false)
  const [focused, setFocused] = useState(false)
  const [isValid, setIsValid] = useState(true)

  const { t } = useTranslation()

  const handleBlur = () => {
    setFocused(false)
    if (validate) {
      setIsValid(validate(value))
    }
  }

  const handleFocus = () => {
    setFocused(true)
  }

  // Normalisiere das PrimeReact-Event (Nullable<Date>) zu { value: Date | null }
  const handleChange = (e: any) => {
    const next: Date | null = (e && 'value' in e ? e.value : null) ?? null
    onChange?.({ value: next })
  }

  const showFloating = focused || !!value || !isValid

  return (
    <div className="relative w-full">
      <Calendar
        id={id}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        readOnlyInput={readOnly}
        disabled={readOnly}
        className={`w-full h-[44px] rounded-lg text-xl font-normal px-3 pt-3 pb-2 ${className} ${
          !isValid ? 'border border-red-500' : 'border border-color-light-gray'
        }`}
        panelClassName="z-[9999]" // Ensure the calendar popup is above modals
        inputClassName="w-full pb-1 h-full border-none font-font-text text-xl focus:ring-0 p-0 m-0 bg-transparent"
        dateFormat={dateFormat}
        showTime={showTime}
        hourFormat={hourFormat}
        showIcon
      />

      <label
        htmlFor={id}
        className={`absolute left-3 px-1 transition-all font-font-text bg-white pointer-events-none
          ${showFloating ? '-top-2 text-sm' : 'top-1/2 -translate-y-1/2 text-xl'}
          ${!isValid ? 'text-red-600 font-semibold' : 'text-gray-500'}
        `}
      >
        {!isValid && errorMessage ? errorMessage : placeholder}
        {required && <span className="ml-1">*</span>}
      </label>

      {helpText && (
        <>
          <QuestionMarkCircleIcon
            id={`${id}-help`}
            className="h-5 w-5 absolute top-2 right-2 text-gray-500 cursor-pointer"
            onClick={() => setVisible(true)}
          />
          <Dialog
            header={t('common:help')}
            visible={visible}
            onHide={() => setVisible(false)}
            dismissableMask
            className="w-full md:w-3/4 xl:w-1/2"
          >
            <p>{helpText}</p>
          </Dialog>
        </>
      )}
    </div>
  )
}

export default CustomCalendar
