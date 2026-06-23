import React, { useRef, useState } from 'react'
import { TreeSelect, TreeSelectChangeEvent } from 'primereact/treeselect'
import { Dialog } from 'primereact/dialog'
import { Tooltip } from 'primereact/tooltip'
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

import type { TreeSelectSelectionKeysType } from 'primereact/treeselect'

interface CustomTreeSelectProps {
  id: string
  label?: string
  value: TreeSelectSelectionKeysType | TreeSelectSelectionKeysType[] | null | undefined | any
  options: any //avoids import issues with TreeNode[]
  onChange: (e: TreeSelectChangeEvent) => void
  placeholder?: string
  className?: string
  helpText?: string
  textColor?: 'text-gray-500' | 'text-gray-700'
  required?: boolean
  /** Shown when the user clicks a non-selectable tree node */
  disabledNodeTooltip?: string
  nodeTemplate?: (node: any) => React.ReactNode
  /** 'single' = one node only, no parent/child cascade; 'checkbox' = multiple with cascade */
  selectionMode?: 'single' | 'multiple' | 'checkbox'
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
  const [visible, setVisible] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const { t } = useTranslation()
  const tooltipRef = useRef<Tooltip>(null)
  const occupiedNodeClass = `${id}-occupied-group`

  const nodeTemplate = disabledNodeTooltip
    ? (node: any) => (
        <span
          className={node.selectable === false ? occupiedNodeClass : undefined}
          style={
            node.selectable === false
              ? { pointerEvents: 'auto', cursor: 'not-allowed' }
              : undefined
          }
          onClick={(e) => {
            if (node.selectable === false) {
              e.stopPropagation()
              e.preventDefault()
              tooltipRef.current?.show(e)
            }
          }}
        >
          {node.label}
        </span>
      )
    : nodeTemplateProp

  // Show floating label if focused or has any selection
  const hasValue =
    Array.isArray(value)
      ? value.length > 0
      : typeof value === 'string'
        ? value.length > 0
        : value && typeof value === 'object' && Object.keys(value).length > 0
  const showFloating = isFocused || hasValue

  return (
    <div className={`flex items-start gap-2 w-full ${className}`}>
      {disabledNodeTooltip && (
        <Tooltip
          ref={tooltipRef}
          target={`.${occupiedNodeClass}`}
          content={disabledNodeTooltip}
          position="top"
        />
      )}
      {/* TreeSelect + floating label wrapper */}
      <div className="relative flex-1">
        <TreeSelect
          id={id}
          value={value}
          options={options}
          onChange={onChange}
          placeholder=""
          selectionMode={selectionMode}
          className="w-full rounded-lg border font-font-text border-color-light-gray text-xl"
          panelStyle={{ maxHeight: '300px', overflowY: 'auto' }}
          display="chip"
          onShow={() => setIsFocused(true)}
          onHide={() => setIsFocused(false)}
          nodeTemplate={nodeTemplate}
          {...props}
        />

        {/* Floating label */}
        <label
          htmlFor={id}
          className={`absolute left-3 px-1 font-font-text transition-all bg-white pointer-events-none
            ${showFloating ? '-top-2 text-sm' : 'top-1/2 -translate-y-1/2 text-xl'}
            text-gray-500
          `}
        >
          {placeholder || label}
          {required && <span className="ml-1">*</span>}
        </label>
      </div>

      {/* Help icon positioned outside */}
      {helpText && (
        <>
          <QuestionMarkCircleIcon
            id={`${id}-help`}
            className="h-5 w-5 mt-3 text-gray-500 cursor-pointer shrink-0"
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

export default CustomTreeSelect
