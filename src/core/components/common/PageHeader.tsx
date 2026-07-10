import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: ReactNode
  description?: ReactNode
  className?: string
}

export default function PageHeader({
  title,
  description,
  className = ''
}: PageHeaderProps) {
  return (
    <header className={`td-page-header ${className}`}>
      <h1 className="td-page-title">{title}</h1>
      {description && <p className="td-page-subtitle">{description}</p>}
    </header>
  )
}
