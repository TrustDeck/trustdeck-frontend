import React from 'react'
import CustomButton from './CustomButton'
import { ButtonProps } from '../../../types/Component'

const PrimaryButton: React.FC<ButtonProps> = ({ className, ...props }) => {
  return (
    <CustomButton
      {...props}
      className={className}
      //add border to have the same width as primary outlined button
      colorClass="td-button--primary"
    />
  )
}

export default PrimaryButton
