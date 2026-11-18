import { type ReactNode, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ProgressSpinner } from 'primereact/progressspinner'

/** How long loading may take before the spinner shows, so that quick responses do not flicker. */
const SPINNER_DELAY_MS = 250

type LoadingOverlayProps = {
  loading: boolean
  children: ReactNode
  className?: string
}

/**
 * Keeps its content in place while new content loads, dimmed and covered by a spinner. The
 * layout and scroll position stay as they are.
 */
export default function LoadingOverlay({
  loading,
  children,
  className = ''
}: LoadingOverlayProps) {
  const { t } = useTranslation('common')
  const [delayPassed, setDelayPassed] = useState(false)
  const showSpinner = loading && delayPassed

  useEffect(() => {
    if (!loading) return undefined
    const timer = window.setTimeout(() => setDelayPassed(true), SPINNER_DELAY_MS)
    return () => {
      window.clearTimeout(timer)
      setDelayPassed(false)
    }
  }, [loading])

  return (
    <div className={`relative ${className}`} aria-busy={loading}>
      <div
        className={`transition-opacity ${showSpinner ? 'pointer-events-none opacity-40' : ''}`}
      >
        {children}
      </div>
      {showSpinner && (
        <div
          role="status"
          className="absolute inset-0 flex items-center justify-center"
        >
          <ProgressSpinner
            style={{ width: '48px', height: '48px' }}
            strokeWidth="5"
            aria-hidden="true"
          />
          <span className="sr-only">{t('loading')}</span>
        </div>
      )}
    </div>
  )
}
