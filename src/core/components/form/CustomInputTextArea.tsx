import React, { useState } from 'react'
import { InputTextarea } from 'primereact/inputtextarea'
import HelpTooltip from '../common/HelpTooltip'

type CustomInputTextAreaProps = {
  id: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder: string
  helpText?: string
  errorMessage?: string
  onBlur?: () => void
  validate?: (value: string) => boolean
  className?: string
  rows?: number
  autoResize?: boolean
}

const CustomInputTextArea: React.FC<CustomInputTextAreaProps> = ({
  id,
  value,
  onChange,
  placeholder,
  helpText,
  errorMessage = '',
  onBlur,
  validate,
  className,
  rows,
  autoResize = true
}) => {
  const [isValid, setIsValid] = useState(true)

  const handleBlur = () => {
    if (validate) setIsValid(validate(value))
    onBlur?.()
  }

  return (
    <div className="relative flex flex-col items-start">
      <div className="relative flex w-full items-start">
        <InputTextarea
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onBlur={handleBlur}
          rows={rows}
          autoResize={autoResize}
          className={`min-w-0 flex-1 rounded-lg border-color-light-gray text-xl font-normal ${!isValid ? 'p-invalid' : ''} ${className ?? ''}`}
        />
        {helpText && (
          <HelpTooltip text={helpText} className="ml-2 mt-1 shrink-0" />
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

export default CustomInputTextArea
