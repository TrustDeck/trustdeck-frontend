import { useRef, useState, useEffect } from 'react'
import { Button } from 'primereact/button'
import { OverlayPanel } from 'primereact/overlaypanel'
import { Avatar } from 'primereact/avatar'
import useUserStore from '../../stores/UserStore.tsx'
import { oidcConfig } from '../../configs/oidc.ts'
import { useNavigate } from 'react-router-dom'

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
  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }
  if (minutes > 0) return `${minutes}m`
  return `${seconds}s`
}

const UserMenu: React.FC = () => {
  const navigate = useNavigate()
  const op = useRef<OverlayPanel>(null)
  const buttonRef = useRef<HTMLDivElement>(null)
  const [buttonWidth, setButtonWidth] = useState('auto')
  const [isOpen, setIsOpen] = useState(false)
  const [remaining, setRemaining] = useState('—')
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

  const handleLogout = (e: React.MouseEvent<HTMLLIElement, MouseEvent>) => {
    setIsOpen(false)
    op.current?.toggle(e)
    navigate('/logged-out')
  }

  const toggleMenu = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    setIsOpen(!isOpen)
    op.current?.toggle(e)
  }

  return (
    <div className="relative w-full">
      <div ref={buttonRef} className="w-full flex justify-end">
        <Button
          className={`group flex w-auto max-w-[320px] font-font-text items-center gap-2 bg-white hover:bg-gray-50 text-black shadow-md border-0 px-2 py-1 transition-all duration-200 ${
            isOpen ? 'rounded-t-lg rounded-b-none' : 'rounded-lg'
          }`}
          onClick={toggleMenu}
          aria-label="Open user menu"
        >
          <div className="flex items-center gap-2">
            <div className="min-w-0 max-w-0 overflow-hidden opacity-0 transition-all duration-200 group-hover:max-w-[220px] group-hover:opacity-100">
              <div className="truncate text-sm font-semibold text-gray-900">{displayName}</div>
              <div className="truncate text-[11px] text-gray-400">automatic logout in {remaining}</div>
            </div>
            <div className="flex flex-col items-center leading-none">
              <Avatar
                className="bg-color-light-gray w-[41px] h-[41px]"
                label={getInitials(fullname, email)}
                size="normal"
                shape="circle"
              />
              <span className="mt-1 text-[10px] font-normal text-gray-400" title="Time until automatic logout">
                {remaining}
              </span>
            </div>
          </div>
        </Button>
      </div>

      <OverlayPanel
        ref={op}
        className="bg-white shadow-lg rounded-b-lg rounded-t-none max-w-[300px] min-w-[160px]"
        style={{ width: buttonWidth, marginTop: '0px' }}
        onHide={() => setIsOpen(false)}
      >
        <ul>
          <li
            className="px-4 py-2 hover:bg-gray-100 cursor-pointer rounded"
            onClick={() => {
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
