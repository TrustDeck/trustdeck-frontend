import {
  Routes,
  Route,
  useLocation,
  useNavigate,
  Navigate,
  matchPath
} from 'react-router-dom'
import Layout from './components/common/Layout'
import { withAuthenticationRequired, useAuth } from 'react-oidc-context'
import { FC, useEffect } from 'react'
import { routes } from './configs/routes'
import useLayoutStore from './stores/LayoutStore' // Import useLayoutStore
import useUserStore from './stores/UserStore.tsx' // Import the UserStore
import useProjectStore from './stores/ProjectStore.tsx'
import TrustDeck from '@service/TrustDeck'
import logger from './Logger.ts'
import { useSyncApiToken } from './services/setupApi.ts'
import RequireProject from './components/routing/RequireProject'

// Higher-Order Component to handle protected routes dynamically
interface ProtectedRouteProps {
  checkAuth: boolean
  component: FC
  isProtected: boolean
}

const ProtectedRoute: FC<ProtectedRouteProps> = ({
  checkAuth,
  component: Component,
  isProtected
}) => {
  const auth = useAuth()
  //TODO while this is logged it means the service self reloads somewehere but i dont know where
  //TODO this causes the page to reload multiple times
  logger.info('hitting protected route')

  logger.info(isProtected ? 'Route is protected' : 'Route is public')

  logger.info(checkAuth ? 'is authenticated' : 'is not authenticated')

  if (isProtected && !checkAuth) {
    auth.removeUser()
    TrustDeck.instance().clearToken()
    auth.clearStaleState()
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('selected-project')
    }
  }

  const WrappedComponent = isProtected
    ? withAuthenticationRequired(Component, {
        signinRedirectArgs: {
          redirect_uri:
            window.location.origin +
            window.location.pathname +
            window.location.search +
            window.location.hash
        }
      })
    : Component

  return <WrappedComponent />
}

const AuthStateListener: React.FC = () => {
  const navigate = useNavigate() // Initialize useNavigate
  const isAuthenticated = useUserStore((state) => state.isAuthenticated)
  const isTabActive = useLayoutStore((state) => state.isTabActive) // Use isTabActive from LayoutStore
  const location = useLocation()
  const auth = useAuth()

  useEffect(() => {
    let previousAuthState = isAuthenticated

    const unsubscribe = useUserStore.subscribe(
      (state) => state.isAuthenticated,
      (currentAuthState) => {
        if (previousAuthState && !currentAuthState && !isTabActive) {
          console.log('User is no longer authenticated')
          navigate('/logged-out') // Use navigate instead of hard setting the location
        }
        previousAuthState = currentAuthState
      }
    )

    return () => unsubscribe()
  }, [isAuthenticated, isTabActive, navigate])

  useEffect(() => {
    let previousAuthState = isAuthenticated

    const unsubscribe = useUserStore.subscribe(
      (state) => state.isAuthenticated,
      (currentAuthState) => {
        if (!previousAuthState && currentAuthState && isTabActive) {
          const url = new URL(window.location.href)
          if (url.searchParams.has('code') || url.searchParams.has('state')) {
            navigate(location.pathname, { replace: true })
          }
          // debug package? log level
        }
        previousAuthState = currentAuthState
      }
    )

    return () => unsubscribe()
  }, [isAuthenticated, isTabActive, location, navigate])

  // Listen for token expiration warnings - automaticSilentRenew should handle refresh before this
  useEffect(() => {
    const handleTokenExpiring = () => {
      // Token is about to expire - automaticSilentRenew should refresh it
      // This event helps ensure we're aware of refresh attempts
      console.log('Access token expiring. Silent renew should trigger')
    }

    const unsubscribeExpiring = auth.events.addAccessTokenExpiring(handleTokenExpiring)
    return () => unsubscribeExpiring()
  }, [auth.events])

  //this mavigates every tab as soon as the token is expired for any reason and then performs the logout in each tab. while the "real" logout itself only happens in the active tab
  useEffect(() => {
    // the `return` is important - addAccessTokenExpired() returns a cleanup function
    return auth.events.addAccessTokenExpired(() => {
      navigate('/logged-out') // Use navigate instead of hard setting the location
    })
  }, [auth.events, navigate])

  return null
}

//this is updated on every page change
const BreadcrumbUpdater: React.FC = () => {
  const location = useLocation()
  const setBreadcrumbItems = useLayoutStore((state) => state.setBreadcrumbItems)

  useEffect(() => {
    const pathname = location.pathname
    
    // Special handling for direct pseudonym search: /search/pseudonym/:pseudonymId
    // Should only show: Search > Pseudonym Details (not entities > pseudonyms)
    if (pathname.match(/^\/search\/pseudonym\/[^/]+$/)) {
      const searchRoute = routes.find((r) => r.path === '/search')
      const pseudonymRoute = routes.find((r) => r.path === '/search/pseudonym/:pseudonymId')
      const breadcrumbList = [
        { label: searchRoute?.titleKey || '/search', url: '/search' },
        { label: pseudonymRoute?.titleKey || pathname, url: pathname }
      ]
      setBreadcrumbItems(breadcrumbList)
      return
    }

    // Project overview: only show Home
    if (pathname === '/projects') {
      setBreadcrumbItems([])
      return
    }

    // Default behavior for all other paths
    const pathnames = pathname.split('/').filter((x) => x)
    const breadcrumbList = pathnames.map((_, index) => {
      const path = `/${pathnames.slice(0, index + 1).join('/')}`
      const route = routes.find((r) =>
        matchPath({ path: r.path, end: true }, path)
      )
      return { label: route ? route.titleKey : path, url: path }
    })

    setBreadcrumbItems(breadcrumbList)
  }, [location, setBreadcrumbItems])

  return null
}

const ProjectListener: React.FC = () => {
  //TODO if no project is set navigate the use always to the first page
  //TODO try to get the project from the current path

  const currentProject = useProjectStore((state) => state.projectName)
  const setProjectName = useProjectStore((state) => state.setProjectName)

  useEffect(() => {
    if (!currentProject) {
      setProjectName('ProjectX') //TODO TODO TODO DO NOT HARDCODE
    }
  }, [currentProject, setProjectName])

  return null
}

const AppRouter: FC = () => {
  useSyncApiToken()
  const isAuthenticated = useUserStore((state) => state.isAuthenticated)

  return (
    <>
      <AuthStateListener />
      <ProjectListener />
      <BreadcrumbUpdater />
      <Routes>
        <Route element={<Layout />}>
          {routes.map(({ path, component, isProtected }) => (
            <Route
              key={path}
              path={path}
              element={
                <RequireProject>
                  <ProtectedRoute
                    checkAuth={isAuthenticated}
                    component={component}
                    isProtected={isProtected}
                  />
                </RequireProject>
              }
            />
          ))}
          <Route path="*" element={<Navigate to="/projects" replace />} />
        </Route>
      </Routes>
    </>
  )
}

export default AppRouter
