import { ReactNode, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import useProjectStore from '../../stores/ProjectStore'
import useToastStore from '../../stores/ToastStore'
import { useTranslation } from 'react-i18next'

type Props = { children: ReactNode }

export default function RequireProject({ children }: Props) {
  const location = useLocation()
  const selected = useProjectStore((s) => s.selectedProject)
  const showToast = useToastStore((s) => s.show)
  const { t } = useTranslation()

  // Allow reaching /projects (and other public-ish paths) without a selected project
  const allowList = ['/projects', '/projects/new', '/permissions', '/projects/global-permissions', '/base-types', '/user-management', '/login', '/callback', '/logged-out']
  const isAllowed = allowList.some((p) => location.pathname.startsWith(p))

  useEffect(() => {
    if (!selected && !isAllowed) {
      showToast({
        severity: 'info',
        summary: t('common:projectRequired.summary'),
        detail: t('common:projectRequired.detail'),
        life: 3000
      })
    }
  }, [isAllowed, selected, showToast, t])

  if (!selected && !isAllowed) {
    return <Navigate to="/projects" replace state={{ from: location }} />
  }

  return <>{children}</>
}