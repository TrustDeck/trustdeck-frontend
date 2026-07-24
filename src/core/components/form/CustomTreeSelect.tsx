import React from 'react'
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
  disabledNodeTooltip,
  selectionMode = 'checkbox',
  nodeTemplate: nodeTemplateProp,
  ...props
}) => {
  const fieldLabel = (label || placeholder || '').trim()

  return (
    <div className={`w-full ${className}`}>
      {fieldLabel && (
        <label htmlFor={id} className="td-field-label mb-1 flex items-center gap-1">
          <span>{fieldLabel}</span>
          {required && <span aria-hidden="true">*</span>}
        </label>
      )}

      <div className="flex w-full items-start gap-2">
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
          {...props}
        />

        {helpText && <HelpTooltip text={helpText} className="mt-3 shrink-0" />}
      </div>
    </div>
  )
}

export default CustomTreeSelect
