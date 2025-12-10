import React from 'react'
import CustomButton from './CustomButton'
import { ButtonProps } from '../../../types/Component'

const SecondaryOutlinedButton: React.FC<ButtonProps> = (props) => {
  return (
    <CustomButton
      {...props}
      colorClass="border-2 border-color-coral bg-white text-color-coral hover:bg-gray-100"
    />
  )
}

export default SecondaryOutlinedButton
