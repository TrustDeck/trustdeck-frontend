import React from 'react'
import CustomButton from './CustomButton'
import { ButtonProps } from '../../../types/Component'

const PrimaryOutlinedButton: React.FC<ButtonProps> = (props) => {
  return (
    <CustomButton
      {...props}
      colorClass="border-2 border-color-blue bg-white text-color-blue hover:bg-gray-100"
    />
  )
}

export default PrimaryOutlinedButton
