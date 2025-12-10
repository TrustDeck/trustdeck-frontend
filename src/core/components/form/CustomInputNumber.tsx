import React, { useState } from 'react'
import { InputNumber, InputNumberValueChangeEvent } from 'primereact/inputnumber'
import { Dialog } from 'primereact/dialog'
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

type CustomInputNumberProps = {
  id: string
  value: number | null
  onChange: (e: InputNumberValueChangeEvent) => void
  placeholder: string
  helpText?: string
  errorMessage?: string
  onBlur?: () => void
  validate?: (value: number | null) => boolean
  className?: string
  min?: number
  max?: number
  mode?: 'decimal' | 'currency'
  showButtons?: boolean
  step?: number
  suffix?: string
  prefix?: string
}

const CustomInputNumber: React.FC<CustomInputNumberProps> = ({
  id,
  value,
  onChange,
  placeholder,
  helpText,
  errorMessage = '',
  onBlur,
  validate,
  className,
  min,
  max,
  mode = 'decimal',
  showButtons = false,
  step = 1,
  suffix,
  prefix,
}) => {
  const [visible, setVisible] = useState(false)
  const [isValid, setIsValid] = useState(true)

  const { t } = useTranslation()

  const handleBlur = () => {
    if (validate) {
      setIsValid(validate(value))
    }
    if (onBlur) {
      onBlur()
    }
  }

  return (
    <div className="relative flex flex-col items-start">
      <div className="relative flex items-center w-full">
        <div className="flex-1 min-w-0">
          <InputNumber
            id={id}
            value={value}
            onValueChange={onChange}
            placeholder={placeholder}
            onBlur={handleBlur}
            useGrouping={false}
            min={min}
            max={max}
            mode={mode}
            showButtons={showButtons}
            step={step}
            suffix={suffix}
            prefix={prefix}
            inputClassName={`w-full rounded-lg border border-color-light-gray text-xl font-normal ${!isValid ? 'p-invalid' : ''}`}
            className={`w-full ${className ?? ''}`}
          />
        </div>
        {helpText && (
          <>
            <QuestionMarkCircleIcon
              id={`${id}-help`}
              className="h-5 w-5 ml-2 text-gray-500 cursor-pointer"
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
      {!isValid && errorMessage && (
        <small id={`${id}-error`} className="p-error">
          {errorMessage}
        </small>
      )}
    </div>
  )
}

export default CustomInputNumber
