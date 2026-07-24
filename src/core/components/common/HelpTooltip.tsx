import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline'

type HelpTooltipProps = {
  text: string
  className?: string
  iconClassName?: string
}

export default function HelpTooltip({
  text,
  className = '',
  iconClassName = 'h-5 w-5'
}: HelpTooltipProps) {
  const positionClass =
    /(?:^|\s)(?:absolute|fixed|relative|sticky)(?:\s|$)/.test(className)
      ? ''
      : 'relative'

  return (
    <span
      className={`td-help-tooltip ${positionClass} ${className}`}
      tabIndex={0}
      aria-label={text}
    >
      <QuestionMarkCircleIcon className={iconClassName} aria-hidden="true" />
      <span className="td-help-tooltip__content" role="tooltip">
        {text}
      </span>
    </span>
  )
}
