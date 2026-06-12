import { useRef, useState, useEffect } from 'react'
import { Button } from 'primereact/button'
import { OverlayPanel } from 'primereact/overlaypanel'
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
  const op = useRef<OverlayPanel>(null)
  const buttonRef = useRef<HTMLDivElement>(null)
  const [buttonWidth, setButtonWidth] = useState('auto')
  const [isOpen, setIsOpen] = useState(false)
  const [remaining, setRemaining] = useState('—')
  const [darkMode, setDarkMode] = useState(getInitialDarkMode)
  const fullname = useUserStore((state) => state.fullname)
  const email = useUserStore((state) => state.email)
  const tokenExpiresAt = useUserStore((state) => state.tokenExpiresAt)
  const displayName = fullname || email || 'Signed-in user'

  const updateWidth = () => {
    if (buttonRef.current) {
      setButtonWidth(`${buttonRef.current.offsetWidth}px`)
    }
  }

  useEffect(() => {
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

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

  const handleLogout = (e: React.MouseEvent<HTMLLIElement, MouseEvent>) => {
    markLoggedOut()
    setIsOpen(false)
    op.current?.toggle(e)
    navigate('/logged-out')
  }

  const closeMenu = () => {
    setIsOpen(false)
    op.current?.hide()
  }

  const handleDarkModeToggle = () => {
    setDarkMode((value) => !value)
    closeMenu()
  }

  const toggleMenu = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    setIsOpen(!isOpen)
    op.current?.toggle(e)
  }

  return (
    <div className="relative w-full">
      <div ref={buttonRef} className="w-full flex justify-end">
        <Button
          className={`group flex w-auto max-w-[340px] font-font-text items-center gap-2 bg-white hover:bg-gray-50 text-black shadow-md border-0 px-2 py-1 transition-all duration-200 ${
            isOpen ? 'rounded-t-lg rounded-b-none' : 'rounded-lg'
          }`}
          onClick={toggleMenu}
          aria-label="Open user menu"
        >
          <div className="flex items-center gap-2">
            <div className="min-w-0 max-w-0 overflow-hidden opacity-0 transition-all duration-200 group-hover:max-w-[230px] group-hover:opacity-100">
              <div className="truncate text-sm font-semibold text-gray-900">{displayName}</div>
              <div className="truncate text-[13px] text-gray-500">Automatic logout in {remaining}</div>
            </div>
            <div className="flex flex-col items-center leading-none">
              <Avatar
                className="bg-color-light-gray w-[41px] h-[41px]"
                label={getInitials(fullname, email)}
                size="normal"
                shape="circle"
              />
              <span className="mt-1 text-[13px] font-semibold text-gray-500" title="Time until automatic logout">
                {remaining}
              </span>
            </div>
          </div>
        </Button>
      </div>

      <OverlayPanel
        ref={op}
        className="bg-white shadow-lg rounded-b-lg rounded-t-none max-w-[320px] min-w-[190px]"
        style={{ width: buttonWidth, marginTop: '0px' }}
        onHide={() => setIsOpen(false)}
      >
        <ul>
          <li className="px-4 py-2 rounded">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 text-left"
              onClick={handleDarkModeToggle}
            >
              <span>Dark mode</span>
              <span
                className={`inline-flex h-6 w-11 items-center rounded-full border transition ${
                  darkMode ? 'bg-color-blue border-color-blue' : 'bg-gray-100 border-gray-300'
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
          </li>
          <li
            className="px-4 py-2 hover:bg-gray-100 cursor-pointer rounded"
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
          </li>
          <li
            className="px-4 py-2 hover:bg-gray-100 cursor-pointer rounded"
            onClick={handleLogout}
          >
            Log out
          </li>
        </ul>
      </OverlayPanel>
    </div>
  )
}

export default UserMenu
