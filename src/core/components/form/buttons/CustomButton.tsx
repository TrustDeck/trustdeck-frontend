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
  disabled = false,
  tooltip
}) => {
  return (
    <div className="flex">
      <Button
        type={type}
        className={`px-6 py-3 text-base font-bold rounded-lg ${colorClass} w-auto ${className}`}
        onClick={onClick}
        label={label}
        outlined={true}
        loading={loading}
        disabled={disabled}
        tooltip={tooltip}
      />
    </div>
  )
}

export default CustomButton
