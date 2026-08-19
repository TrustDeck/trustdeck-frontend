import React from 'react'
import CustomButton from './CustomButton'
import { ButtonProps } from '../../../types/Component'

const PrimaryOutlinedButton: React.FC<ButtonProps> = (props) => {
  return (
    <CustomButton
      {...props}
      colorClass="td-button--primary-outlined"
    />
  )
}

export default PrimaryOutlinedButton
