import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import useProjectStore from '../../stores/ProjectStore'

type Props = { children: ReactNode }

export default function RequireProject({ children }: Props) {
  const location = useLocation()
  const selected = useProjectStore((s) => s.selectedProject)

  // Allow reaching /projects (and other public-ish paths) without a selected project
  const allowList = ['/projects', '/projects/new', '/logged-out']
  const isAllowed = allowList.some((p) => location.pathname.startsWith(p))

  if (!selected && !isAllowed) {
    return <Navigate to="/projects" replace state={{ from: location }} />
  }

  return <>{children}</>
}