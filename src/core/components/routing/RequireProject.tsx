import { ReactNode, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import useProjectStore from '../../stores/ProjectStore'
import useToastStore from '../../stores/ToastStore'

type Props = { children: ReactNode }

export default function RequireProject({ children }: Props) {
  const location = useLocation()
  const selected = useProjectStore((s) => s.selectedProject)
  const showToast = useToastStore((s) => s.show)

  // Allow reaching /projects (and other public-ish paths) without a selected project
  const allowList = ['/projects', '/projects/new', '/permissions', '/projects/global-permissions', '/login', '/callback', '/logged-out']
  const isAllowed = allowList.some((p) => location.pathname.startsWith(p))

  useEffect(() => {
    if (!selected && !isAllowed) {
      showToast({
        severity: 'info',
        summary: 'Select a project first',
        detail: 'Please select a project before opening this section.',
        life: 3000
      })
    }
  }, [isAllowed, selected, showToast])

  if (!selected && !isAllowed) {
    return <Navigate to="/projects" replace state={{ from: location }} />
  }

  return <>{children}</>
}