export interface AbstractButtonProps {
  label: any
  onClick?: () => void
  colorClass: string
  type?: 'button' | 'submit' | 'reset'
  loading?: boolean
  icon?: React.ReactNode | string; // vorher: React.ReactNode
  className?: string
  disabled?: boolean
  iconPos?: string
  tooltip?: string
}

export type ButtonProps = Omit<AbstractButtonProps, 'colorClass'>;
