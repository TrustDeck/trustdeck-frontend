import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowTopRightOnSquareIcon,
  ArrowRightStartOnRectangleIcon,
  MoonIcon,
  SunIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline'
import useUserStore from '../../core/stores/UserStore'
import { oidcConfig } from '../../core/configs/oidc'
import { markLoggedOut } from '../../core/services/authSession'
import Panel from '../../core/components/common/Panel'
import PageHeader from '../../core/components/common/PageHeader'

function formatRemaining(expiresAt: number | null) {
  if (!expiresAt) return '—'
  const remaining = Math.max(0, expiresAt - Date.now())
  const totalSeconds = Math.floor(remaining / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0)
    return `${hours}h ${minutes}m ${String(seconds).padStart(2, '0')}s`
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}

function getInitialDarkMode() {
  if (typeof window === 'undefined') return false
  const stored = window.localStorage.getItem('trustdeck:theme')
  if (stored === 'dark') return true
  if (stored === 'light') return false
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export default function UserManagement() {
  const navigate = useNavigate()
  const { t } = useTranslation('layout')
  const fullname = useUserStore((state) => state.fullname)
  const username = useUserStore((state) => state.username)
  const email = useUserStore((state) => state.email)
  const tokenExpiresAt = useUserStore((state) => state.tokenExpiresAt)
  const locale = useUserStore((state) => state.locale)
  const setLocale = useUserStore((state) => state.setLocale)
  const [remaining, setRemaining] = useState(() =>
    formatRemaining(tokenExpiresAt)
  )
  const [darkMode, setDarkMode] = useState(getInitialDarkMode)
  const displayName =
    fullname || email || username || t('userMenu.signedInUser')

  useEffect(() => {
    const updateRemaining = () => setRemaining(formatRemaining(tokenExpiresAt))
    updateRemaining()
    const interval = window.setInterval(updateRemaining, 1000)
    return () => window.clearInterval(interval)
  }, [tokenExpiresAt])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    window.localStorage.setItem('trustdeck:theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  const openAccountConsole = () => {
    const configuredAccountUrl = (
      oidcConfig as typeof oidcConfig & { account_console_url?: string }
    ).account_console_url
    const accountUrl =
      configuredAccountUrl ||
      `${String(oidcConfig.authority).replace(/\/$/, '')}/account/#/personal-info`
    const newWindow = window.open(accountUrl, '_blank', 'noopener,noreferrer')
    if (newWindow) newWindow.opener = null
  }

  const logout = () => {
    markLoggedOut('manual')
    navigate('/logged-out')
  }

  return (
    <div className="td-page-shell">
      <PageHeader
        title={t('userManagement.title')}
        description={t('userManagement.subtitle')}
      />
      <div className="td-page-content space-y-6">
        <Panel className="!w-full">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
            <section className="space-y-5">
              <div className="flex items-center gap-4">
                <UserCircleIcon className="h-14 w-14 shrink-0 text-color-blue" />
                <div className="min-w-0">
                  <h2 className="td-panel-title !mb-0 truncate">
                    {displayName}
                  </h2>
                  {email && (
                    <p className="mt-1 truncate text-base text-gray-600 dark:text-gray-300">
                      {email}
                    </p>
                  )}
                </div>
              </div>

              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                  <dt className="td-field-label uppercase tracking-wide text-gray-500 dark:text-gray-300">
                    {t('userManagement.username')}
                  </dt>
                  <dd className="mt-2 break-words text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {username || '—'}
                  </dd>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                  <dt className="td-field-label uppercase tracking-wide text-gray-500 dark:text-gray-300">
                    {t('userManagement.sessionRemaining')}
                  </dt>
                  <dd className="mt-2 font-mono text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                    {remaining}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="space-y-3">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-base font-medium text-gray-800 transition hover:border-color-blue hover:text-color-blue dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100"
                onClick={() => setDarkMode((value) => !value)}
              >
                <span>{t('userManagement.darkMode')}</span>
                <span className="inline-flex items-center gap-2">
                  {darkMode ? (
                    <MoonIcon className="h-5 w-5" />
                  ) : (
                    <SunIcon className="h-5 w-5" />
                  )}
                  <span>
                    {darkMode
                      ? t('userManagement.enabled')
                      : t('userManagement.disabled')}
                  </span>
                </span>
              </button>

              <div className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-base font-medium text-gray-800 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100">
                <span>{t('userManagement.language')}</span>
                <div className="inline-flex rounded-lg border border-gray-200 p-1 dark:border-slate-700">
                  {(['en', 'de'] as const).map((language) => (
                    <button
                      key={language}
                      type="button"
                      className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${locale === language ? 'bg-color-blue text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-800'}`}
                      onClick={() => setLocale(language)}
                    >
                      {language === 'en'
                        ? t('userMenu.english')
                        : t('userMenu.german')}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-base font-medium text-gray-800 transition hover:border-color-blue hover:text-color-blue dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100"
                onClick={openAccountConsole}
              >
                <span>{t('userManagement.account')}</span>
                <ArrowTopRightOnSquareIcon className="h-5 w-5" />
              </button>

              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl border border-red-200 bg-white px-4 py-3 text-left text-base font-medium text-red-700 transition hover:bg-red-50 dark:border-red-900 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/30"
                onClick={logout}
              >
                <span>{t('userManagement.logout')}</span>
                <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
              </button>
            </section>
          </div>
        </Panel>
      </div>
    </div>
  )
}
