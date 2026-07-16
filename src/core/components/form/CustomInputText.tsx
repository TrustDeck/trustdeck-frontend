import React, { useState } from 'react'
import { InputText } from 'primereact/inputtext'
import HelpTooltip from '../common/HelpTooltip'

type CustomInputTextProps = {
  id: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder: string
  helpText?: string
  errorMessage?: string
  onBlur?: () => void
  validate?: (value: string) => boolean
  className?: string
}

const CustomInputText: React.FC<CustomInputTextProps> = ({
  id,
  value,
  onChange,
  placeholder,
  helpText,
  errorMessage = '',
  onBlur,
  validate,
  className
}) => {
  const [isValid, setIsValid] = useState(true)

  const handleBlur = () => {
    if (validate) setIsValid(validate(value))
    onBlur?.()
  }

  return (
    <div className="relative flex flex-col items-start">
      <div className="relative flex w-full items-center">
        <InputText
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onBlur={handleBlur}
          invalid={!isValid}
          className={`min-w-0 flex-1 rounded-lg border-color-light-gray text-xl font-normal ${className ?? ''}`}
        />
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

export default CustomInputText
