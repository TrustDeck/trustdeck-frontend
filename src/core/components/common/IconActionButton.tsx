import type { MouseEvent, ReactNode } from 'react'

type IconActionButtonProps = {
  title: string
  onClick: () => void
  children: ReactNode
  variant?: 'primary' | 'danger'
  disabled?: boolean
  stopPropagation?: boolean
}

export default function IconActionButton({
  title,
  onClick,
  children,
  variant = 'primary',
  disabled = false,
  stopPropagation = false
}: IconActionButtonProps) {
  const colorClasses =
    variant === 'danger'
      ? 'border-color-coral text-color-coral hover:bg-red-50 dark:hover:bg-red-950'
      : 'border-color-blue text-color-blue hover:bg-blue-50 dark:hover:bg-slate-800'

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (stopPropagation) event.stopPropagation()
    onClick()
  }

  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onClick={handleClick}
      disabled={disabled}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 bg-white transition disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-950 ${colorClasses}`}
    >
      {children}
    </button>
  )
}
