import React, { ReactNode } from 'react'

interface PanelProps {
  title?: ReactNode
  centered?: boolean
  children?: ReactNode
  className?: string
  noMaxWidth?: boolean
  noBasePanel?: boolean
  onClick?: () => void
}

const Panel: React.FC<PanelProps> = ({
  title,
  centered,
  children,
  className,
  noBasePanel,
  onClick
}) => {
  const classes = `${noBasePanel ? '' : 'basic-panel'} max-w-none ${className ?? ''}`
  return (
    <div className={classes} onClick={onClick}>
      {title && (
        <h2 className={centered ? 'text-center' : 'text-left'}>{title}</h2>
      )}
      <div>{children}</div>
    </div>
  )
}

export default Panel
