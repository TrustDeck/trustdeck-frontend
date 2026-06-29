import { useState } from 'react'
import { Dropdown, DropdownChangeEvent } from 'primereact/dropdown'
import { Dialog } from 'primereact/dialog'
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

interface DropdownOption {
  label: string
  value: string
}

type CustomDropdownProps = {
  id: string
  label?: string
  value: string | number
  options: DropdownOption[]
  onChange: (e: DropdownChangeEvent) => void
  placeholder?: string
  className?: string
  helpText?: string
  textColor?: 'text-gray-500' | 'text-gray-700'
  required?: boolean
  disabled?: boolean
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  id,
  value,
  options,
  onChange,
  placeholder,
  className = '',
  helpText,
  textColor = 'text-gray-500',
  required,
  disabled,
  ...props
}) => {
  const [visible, setVisible] = useState(false)
  const { t } = useTranslation()

  const showFloating = value !== ''

  return (
    <div
      className={`td-custom-dropdown relative w-full ${helpText ? 'td-custom-dropdown--with-help' : ''} ${className}`}
    >
      <div className="relative w-full">
        <Dropdown
          id={id}
          value={value}
          options={options}
          onChange={onChange}
          placeholder=""
          disabled={disabled}
          className="w-full rounded-lg border font-font-text font-normal border-color-light-gray text-xl h-[44px] flex items-center [&_.p-dropdown-label]:flex [&_.p-dropdown-label]:items-center [&_.p-dropdown-label]:h-full [&_.p-dropdown-label]:py-0 [&_.p-dropdown-label]:font-font-text [&_.p-dropdown-label]:font-normal"
          pt={{
            input: {
              className: `px-3 h-[44px] flex items-center font-font-text font-normal ${textColor} text-xl`
            },
            item: {
              className: 'font-font-text font-normal text-lg text-gray-500'
            }
          }}
          {...props}
        />

        <label
          htmlFor={id}
          className={`absolute left-3 px-1 font-font-text transition-all bg-white pointer-events-none
            ${showFloating ? '-top-2 text-sm' : 'top-1/2 -translate-y-1/2 text-xl'}
            text-gray-500
          `}
        >
          {placeholder}
          {required && <span className="ml-1">*</span>}
        </label>
      </div>

      {helpText && (
        <>
          <QuestionMarkCircleIcon
            id={`${id}-help`}
            className="td-custom-dropdown__help absolute top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 cursor-pointer z-10"
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

export default CustomDropdown
