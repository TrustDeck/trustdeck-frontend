import React, { useState } from 'react'
import { InputTextarea } from 'primereact/inputtextarea'
import { Dialog } from 'primereact/dialog'
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

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
  validate,
  className,
  rows,
  autoResize = true
}) => {
  const [visible, setVisible] = useState(false)
  const [isValid, setIsValid] = useState(true)

  const { t } = useTranslation()

  const handleBlur = () => {
    if (validate) {
      setIsValid(validate(value))
    }
  }

  return (
    <div className="relative flex flex-col items-start">
      <div className="relative flex items-start w-full">
        <InputTextarea
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onBlur={handleBlur}
          rows={rows}
          autoResize={autoResize}
          className={`flex-1 min-w-0 rounded-lg border-color-light-gray text-xl font-normal ${!isValid ? 'p-invalid' : ''} ${className}`}
        />
        {helpText && (
          <>
            <QuestionMarkCircleIcon
              id={`${id}-help`}
              className="h-5 w-5 ml-2 mt-1 text-gray-500 cursor-pointer"
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

export default CustomInputTextArea
