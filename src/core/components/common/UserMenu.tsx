import { useRef, useState, useEffect } from 'react'
import { Button } from 'primereact/button'
import { OverlayPanel } from 'primereact/overlaypanel'
import { Avatar } from 'primereact/avatar'
import useUserStore from '../../stores/UserStore.tsx'
import { oidcConfig } from '../../configs/oidc.ts'
import { useNavigate } from 'react-router-dom' // Import useNavigate

const UserMenu: React.FC = () => {
  const navigate = useNavigate() // Initialize useNavigate
  const op = useRef<OverlayPanel>(null)
  const buttonRef = useRef<HTMLDivElement>(null)
  const [buttonWidth, setButtonWidth] = useState('auto')
  const [isOpen, setIsOpen] = useState(false)
  const fullname = useUserStore((state) => state.fullname)
  // Function to get initials
  const getInitials = (name: string | undefined) => {
    if (!name) return 'JD'
    const parts = name.split(' ')
    return parts.map((p) => p[0]).join(''.toUpperCase())
  }

  // Update panel width to match button width on mount and resize
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
          className={`flex sm:w-full max-w-[300px] font-font-text items-left gap-2 p-2 bg-white hover:bg-gray-100 text-white shadow-md border-0 ${
            isOpen ? 'rounded-t-lg rounded-b-none' : 'rounded-lg'
          }`}
          onClick={toggleMenu}
        >
          <div className="flex items-center justify-between gap-2 w-full">
            <span className="flex-1 truncate text-black px-1 hidden sm:inline">
              {fullname || 'John Doe'}
            </span>
            <Avatar
              className="bg-color-light-gray w-[41px] h-[41px]"
              label={getInitials(fullname || 'John Doe')}
              size="normal"
              shape="circle"
            />
          </div>
        </Button>
      </div>

      <OverlayPanel
        ref={op}
        className="bg-white shadow-lg rounded-b-lg rounded-t-none max-w-[300px] min-w-[100px]"
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
