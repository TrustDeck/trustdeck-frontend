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
      <h1 className="text-center text-3xl font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h1>
      {description && (
        <p className="mx-auto mt-2 max-w-4xl text-center text-base text-gray-600 dark:text-gray-300">
          {description}
        </p>
      )}
    </header>
  )
}
