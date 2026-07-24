type InheritanceIndicatorProps = {
  title: string
  className?: string
}

export default function InheritanceIndicator({
  title,
  className = ''
}: InheritanceIndicatorProps) {
  return (
    <span
      title={title}
      aria-label={title}
      className={`inline-flex items-center justify-center font-semibold leading-none text-blue-700 dark:text-blue-300 ${className}`}
    >
      ⇣
    </span>
  )
}
