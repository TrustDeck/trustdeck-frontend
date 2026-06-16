import { useState, useEffect } from 'react'
import { Avatar } from 'primereact/avatar'
import useUserStore from '../../stores/UserStore.tsx'
import { oidcConfig } from '../../configs/oidc.ts'
import { useNavigate } from 'react-router-dom'
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline'
import { markLoggedOut } from '../../services/authSession.ts'

function getInitials(name: string | undefined, email?: string) {
  const source = (name && name.trim()) || email || ''
  if (!source) return '??'
  const parts = source.includes('@') ? source.split('@')[0].split(/[._-]/) : source.split(/\s+/)
  return parts
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '??'
}

function formatRemaining(milliseconds: number | null) {
  if (!milliseconds) return '—'
  const remaining = Math.max(0, milliseconds - Date.now())
  const totalSeconds = Math.floor(remaining / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const paddedSeconds = String(seconds).padStart(2, '0')

  if (hours > 0) return `${hours}h ${minutes}m ${paddedSeconds}s`
  return `${minutes}m ${paddedSeconds}s`
}

function getInitialDarkMode() {
  if (typeof window === 'undefined') return false
  const stored = window.localStorage.getItem('trustdeck:theme')
  if (stored === 'dark') return true
  if (stored === 'light') return false
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

const UserMenu: React.FC = () => {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [remaining, setRemaining] = useState('—')
  const [darkMode, setDarkMode] = useState(getInitialDarkMode)
  const fullname = useUserStore((state) => state.fullname)
  const email = useUserStore((state) => state.email)
  const tokenExpiresAt = useUserStore((state) => state.tokenExpiresAt)
  const displayName = fullname || email || 'Signed-in user'

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

  const closeMenu = () => setIsOpen(false)

  const handleLogout = () => {
    markLoggedOut()
    closeMenu()
    navigate('/logged-out')
  }

  const handleDarkModeToggle = () => {
    setDarkMode((value) => !value)
    closeMenu()
  }

  return (
    <div className="relative flex w-full justify-end">
      <div
        className={`w-auto max-w-[360px] overflow-hidden rounded-xl bg-white text-black shadow-md ring-1 ring-black/5 transition-all duration-200 dark:bg-slate-900 dark:text-gray-100 dark:ring-white/10 ${isOpen ? 'min-w-[275px]' : 'min-w-[72px]'}`}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
      >
        <button
          type="button"
          className="flex w-full items-center justify-end gap-3 px-2 py-2 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
          aria-label="Open user menu"
          onClick={() => setIsOpen((value) => !value)}
        >
          {isOpen && (
            <div className="min-w-0 flex-1 text-right">
              <div className="truncate text-sm font-semibold text-gray-900 dark:text-gray-50">{displayName}</div>
              <div className="truncate text-[0.95rem] font-medium text-gray-500 dark:text-gray-300">Logout in {remaining}</div>
            </div>
          )}
          <div className="flex flex-col items-center leading-none">
            <Avatar
              className="bg-color-light-gray h-[41px] w-[41px] dark:bg-slate-700 dark:text-white"
              label={getInitials(fullname, email)}
              size="normal"
              shape="circle"
            />
            {!isOpen && (
              <span className="mt-1 text-[0.95rem] font-semibold text-gray-500 dark:text-gray-300" title="Time until automatic logout">
                {remaining}
              </span>
            )}
          </div>
        </button>

        {isOpen && (
          <div className="border-t border-gray-100 p-2 dark:border-slate-700">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-slate-800"
              onClick={handleDarkModeToggle}
            >
              <span>Dark mode</span>
              <span
                className={`inline-flex h-6 w-11 items-center rounded-full border transition ${
                  darkMode ? 'border-color-blue bg-color-blue' : 'border-gray-300 bg-gray-100 dark:border-slate-500 dark:bg-slate-700'
                }`}
                aria-hidden="true"
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition ${
                    darkMode ? 'translate-x-5 text-color-blue' : 'translate-x-0.5 text-gray-500'
                  }`}
                >
                  {darkMode ? <MoonIcon className="h-3.5 w-3.5" /> : <SunIcon className="h-3.5 w-3.5" />}
                </span>
              </span>
            </button>
            <button
              type="button"
              className="w-full rounded px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-slate-800"
              onClick={() => {
                closeMenu()
                const newWindow = window.open(
                  oidcConfig.authority + '/account',
                  '_blank',
                  'noopener,noreferrer'
                )
                if (newWindow) newWindow.opener = null
              }}
            >
              Your Account
            </button>
            <button
              type="button"
              className="w-full rounded px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-slate-800"
              onClick={handleLogout}
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default UserMenu
