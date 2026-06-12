import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import UserMenu from './UserMenu'
import Breadcrumbs from './Breadcrumbs'
import useUserStore from '../../stores/UserStore'
import useLayoutStore from '../../stores/LayoutStore'
import { useEffect } from 'react'
import useProjectStore from '../../../core/stores/ProjectStore'
import useToastStore from '../../../core/stores/ToastStore'
import { Toast } from 'primereact/toast'
import RouteErrorBoundary from './RouteErrorBoundary'

const Layout: React.FC = () => {
  const setToast = useToastStore((state) => state.setToast)
  const isAuthenticated = useUserStore((state) => state.isAuthenticated)
  const setTabActive = useLayoutStore((state) => state.setTabActive)
  const isSidebarOpen = useLayoutStore((state) => state.isSidebarOpen)
  const { selectedProject } = useProjectStore()
  const location = useLocation()
  const sidebarTitle = location.pathname === '/projects' ? 'TrustDeck' : selectedProject?.name ?? 'TrustDeck'

  const isLoggedOutPage = location.pathname === '/logged-out'
  const isLoginPage = location.pathname === '/auth/login'
  const hideSidebar = isLoggedOutPage || isLoginPage

  const contentOffsetClass = hideSidebar
    ? 'ml-0'
    : isSidebarOpen
      ? 'ml-0 sm:ml-sidebar-collapse xl:ml-sidebar-large'
      : 'ml-0 sm:ml-sidebar-collapse xl:ml-sidebar-collapse'
  const breadcrumbOffsetClass = hideSidebar
    ? 'ml-0'
    : 'ml-sidebar-collapse sm:ml-0'

  useEffect(() => {
    const updateTabStatus = () => {
      const isActiveTab =
        document.visibilityState === 'visible' && document.hasFocus()
      setTabActive(isActiveTab)
    }

    document.addEventListener('visibilitychange', updateTabStatus)
    window.addEventListener('focus', updateTabStatus)
    window.addEventListener('blur', updateTabStatus)
    updateTabStatus()

    return () => {
      document.removeEventListener('visibilitychange', updateTabStatus)
      window.removeEventListener('focus', updateTabStatus)
      window.removeEventListener('blur', updateTabStatus)
    }
  }, [setTabActive])

  return (
    <div className="relative min-h-screen bg-surface">
      {!hideSidebar && (
        <Sidebar projectName={sidebarTitle} />
      )}
      <div className={`transition-all duration-300 ${contentOffsetClass}`}>
        {!isLoggedOutPage && !isLoginPage && (
          <div className="flex flex-row w-full p-4 items-center">
            <div className={`${breadcrumbOffsetClass} mr-4 sm:mr-0 w-3/4`}>
              <Breadcrumbs />
            </div>
            <div className="w-1/4">
              {isAuthenticated && <UserMenu />}
            </div>
          </div>
        )}
        <Toast ref={setToast} />
        <div className="flex w-full p-4">
          <RouteErrorBoundary resetKey={`${location.pathname}${location.search}`}>
            <Outlet />
          </RouteErrorBoundary>
        </div>
      </div>
    </div>
  )
}

export default Layout
