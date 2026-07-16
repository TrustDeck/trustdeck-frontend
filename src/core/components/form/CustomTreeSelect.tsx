import React, { useState } from 'react'
import { TreeSelect, TreeSelectChangeEvent } from 'primereact/treeselect'
import type { TreeSelectSelectionKeysType } from 'primereact/treeselect'
import HelpTooltip from '../common/HelpTooltip'

interface CustomTreeSelectProps {
  id: string
  label?: string
  value:
    | TreeSelectSelectionKeysType
    | TreeSelectSelectionKeysType[]
    | null
    | undefined
    | any
  options: any
  onChange: (e: TreeSelectChangeEvent) => void
  placeholder?: string
  className?: string
  helpText?: string
  textColor?: 'text-gray-500' | 'text-gray-700'
  required?: boolean
  selectionMode?: 'single' | 'multiple' | 'checkbox'
  filter?: boolean
  filterPlaceholder?: string
}

const CustomTreeSelect: React.FC<CustomTreeSelectProps> = ({
  id,
  label,
  value,
  options,
  onChange,
  placeholder,
  className = '',
  helpText,
  required,
  selectionMode = 'checkbox',
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false)

  const hasValue = Array.isArray(value)
    ? value.length > 0
    : typeof value === 'string'
      ? value.length > 0
      : value && typeof value === 'object' && Object.keys(value).length > 0
  const floatingLabel = (placeholder || label || '').trim()
  const showFloating = isFocused || hasValue

  return (
    <div className={`flex w-full items-start gap-2 ${className}`}>
      <div className="relative flex-1">
        <TreeSelect
          id={id}
          value={value}
          options={options}
          onChange={onChange}
          placeholder=""
          selectionMode={selectionMode}
          className="w-full rounded-lg border border-color-light-gray font-font-text text-xl"
          panelStyle={{ maxHeight: '300px', overflowY: 'auto' }}
          display="chip"
          onShow={() => setIsFocused(true)}
          onHide={() => setIsFocused(false)}
          {...props}
        />

        {floatingLabel && (
          <label
            htmlFor={id}
            className={`td-floating-label pointer-events-none absolute left-3 font-font-text text-gray-500 transition-all dark:text-gray-300
              ${showFloating ? 'td-floating-label--active -top-2 text-sm' : 'top-1/2 -translate-y-1/2 text-xl'}
            `}
          >
            {floatingLabel}
            {required && <span className="ml-1">*</span>}
          </label>
        )}
      </div>

      {helpText && <HelpTooltip text={helpText} className="mt-3 shrink-0" />}
    </div>
  )
}

export default CustomTreeSelect
