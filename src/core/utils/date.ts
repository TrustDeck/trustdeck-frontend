import i18n from '../../core/configs/i18n'

const getLocale = () => i18n?.language || navigator.language || 'en'

export function formatDate(iso?: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat(getLocale(), {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    ...options
  }).format(d)
}

export function formatDateTime(iso?: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat(getLocale(), {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  }).format(d)
}