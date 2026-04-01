import React, { useState } from 'react'
import { InputText } from 'primereact/inputtext'
import { Dialog } from 'primereact/dialog'
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

type CustomFloatLabelProps = {
  id: string
  value: string | number
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder: string
  helpText?: string
  errorMessage?: string
  onBlur?: () => void
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
  helpText,
  errorMessage = '',
  validate,
  className = '',
  readOnly,
  disabled,
  required
}) => {
  const [visible, setVisible] = useState(false)
  const [isValid, setIsValid] = useState(true)
  const [focused, setFocused] = useState(false)

  const { t } = useTranslation()

  const handleBlur = () => {
    setFocused(false)
    if (validate) {
      setIsValid(validate(String(value)))
    } else if (required) {
      setIsValid(String(value).trim().length > 0)
    }
  }

  const handleFocus = () => {
    setFocused(true)
  }

  const showFloating = focused || String(value).length > 0 || !isValid

  return (
    <div className="relative w-full">
      <InputText
        id={id}
        value={String(value)}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        readOnly={readOnly}
        disabled={disabled}
        className={`w-full rounded-lg text-xl font-normal font-font-text px-3 h-[44px] ${className} ${
          !isValid ? 'border border-red-500' : 'border border-color-light-gray'
        } ${disabled ? 'text-gray-400 cursor-not-allowed' : ''}`}
      />

      {/* Floating label or error inside input */}
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
            className="h-5 w-5 absolute -right-8 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer z-10"
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

export default CustomFloatLabel
