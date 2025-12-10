import React from 'react'
import CustomButton from './CustomButton'
import { ButtonProps } from '../../../types/Component'

const SecondaryButton: React.FC<ButtonProps> = (props) => {
  return (
    <CustomButton
      {...props}
      colorClass="bg-color-coral hover:bg-color-coral/80 text-white border-2 border-bg-color-coral"
    />
  )
}

export default SecondaryButton
