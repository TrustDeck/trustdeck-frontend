import React from 'react'
import { Button } from 'primereact/button'
import { AbstractButtonProps } from '../../../types/Component'

const CustomButton: React.FC<AbstractButtonProps> = ({
  label,
  onClick,
  colorClass,
  type = 'button',
  className = '',
  loading = false,
  icon,
  disabled = false,
  tooltip,
  iconPos
}) => {
  return (
    <div className="flex">
      <Button
        type={type}
        className={`inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-bold rounded-lg ${colorClass} w-auto ${className}`}
        onClick={onClick}
        label={label}
        loading={loading}
        icon={icon}
        iconPos={iconPos as any}
        disabled={disabled}
        tooltip={tooltip}
      />
    </div>
  )
}

export default CustomButton
