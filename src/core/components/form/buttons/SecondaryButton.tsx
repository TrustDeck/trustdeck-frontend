import React from 'react'
import CustomButton from './CustomButton'
import { ButtonProps } from '../../../types/Component'

const SecondaryButton: React.FC<ButtonProps> = (props) => {
  return (
    <CustomButton
      {...props}
      colorClass="td-button--danger"
    />
  )
}

export default SecondaryButton
