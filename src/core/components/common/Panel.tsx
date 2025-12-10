import React, { ReactNode } from 'react'

interface PanelProps {
  title?: string
  centered?: boolean
  children?: ReactNode
  className?: string
  noMaxWidth?: boolean
  onClick?: () => void
}
// A basic panel. You can pass it a title, a centered prop, any children, any classes you want, and finally a "noMaxWidth" to remove the max-w-7xl restriction. 

const Panel: React.FC<PanelProps> = ({ title, centered, children, className, noMaxWidth, onClick }) => {
  const classes = `basic-panel ${noMaxWidth ? "max-w-none" : "max-w-7xl"} ${className ? className : ""}` 
  return (
    <div className={classes} onClick={onClick}>
      {title && (
        <h2 className={`${centered ? 'text-center' : 'text-left'}`}>{title}</h2>
      )}
      <div className=''>{children}</div>
    </div>
  )
}

export default Panel
