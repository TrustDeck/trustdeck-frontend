import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import useLayoutStore from '../../stores/LayoutStore'
import { useEffect } from 'react'
import useProjectStore from '../../../core/stores/ProjectStore'
import useToastStore from '../../../core/stores/ToastStore'
import { Toast } from 'primereact/toast'
import RouteErrorBoundary from './RouteErrorBoundary'

const Layout: React.FC = () => {
  const setToast = useToastStore((state) => state.setToast)
  const setTabActive = useLayoutStore((state) => state.setTabActive)
  const isSidebarOpen = useLayoutStore((state) => state.isSidebarOpen)
  const { selectedProject } = useProjectStore()
  const location = useLocation()

  const isLoggedOutPage = location.pathname === '/logged-out'
  const isLoginPage = location.pathname === '/login'
  const hideSidebar = isLoggedOutPage || isLoginPage

  const contentOffsetClass = hideSidebar
    ? 'ml-0'
    : isSidebarOpen
      ? 'ml-0 sm:ml-sidebar-collapse xl:ml-sidebar-large'
      : 'ml-0 sm:ml-sidebar-collapse xl:ml-sidebar-collapse'

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
        <Sidebar
          projectAbbreviation={
            location.pathname === '/projects'
              ? undefined
              : selectedProject?.abbreviation
          }
          projectName={selectedProject?.name}
        />
      )}
      <div className={`transition-all duration-300 ${contentOffsetClass}`}>
        <Toast ref={setToast} />
        <main className="flex w-full px-4 py-4 sm:px-6 sm:py-6 xl:px-8 2xl:px-10">
          <div className="w-full min-w-0">
            <RouteErrorBoundary resetKey={`${location.pathname}${location.search}`}>
              <Outlet />
            </RouteErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout
