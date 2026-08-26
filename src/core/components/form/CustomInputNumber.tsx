import React, { useEffect, useRef, useState } from 'react'
import {
  InputNumber,
  InputNumberValueChangeEvent
} from 'primereact/inputnumber'
import HelpTooltip from '../common/HelpTooltip'

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
  prefix
}) => {
  const [isValid, setIsValid] = useState(true)
  const latestValue = useRef(value)

  useEffect(() => {
    latestValue.current = value
  }, [value])

  const handleValueChange = (event: InputNumberValueChangeEvent) => {
    latestValue.current = event.value ?? null
    onChange(event)
  }

  const handleBlur = () => {
    if (validate) setIsValid(validate(latestValue.current))
    onBlur?.()
  }

  return (
    <div className="relative flex flex-col items-start">
      <div className="relative flex w-full items-center">
        <div className="min-w-0 flex-1">
          <InputNumber
            id={id}
            value={value}
            onValueChange={handleValueChange}
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
            inputClassName={`h-[44px] w-full rounded-lg border border-color-light-gray bg-white px-3 !font-font-text !text-xl !font-normal text-gray-900 dark:bg-slate-950 dark:text-gray-100 ${!isValid ? 'p-invalid' : ''}`}
            className={`w-full ${className ?? ''}`}
          />
        </div>
        {helpText && <HelpTooltip text={helpText} className="ml-2 shrink-0" />}
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
