import React from 'react'
import CustomButton from './CustomButton'
import { ButtonProps } from '../../../types/Component'

const SecondaryOutlinedButton: React.FC<ButtonProps> = (props) => {
  return (
    <CustomButton
      {...props}
      colorClass="td-button--cancel"
    />
  )
}

export default SecondaryOutlinedButton
