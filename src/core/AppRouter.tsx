import {
  Routes,
  Route,
  useLocation,
  useNavigate,
  Navigate,
  matchPath
} from 'react-router-dom'
import Layout from './components/common/Layout'
import { useAuth } from 'react-oidc-context'
import { FC, useEffect, useRef } from 'react'
import { routes } from './configs/routes'
import useLayoutStore from './stores/LayoutStore' // Import useLayoutStore
import useUserStore from './stores/UserStore.tsx' // Import the UserStore
import TrustDeck from '@service/TrustDeck'
import logger from './Logger.ts'
import { useSyncApiToken } from './services/setupApi.ts'
import { refreshAccessTokenForNavigation } from './services/tokenRefresh.ts'
import RequireProject from './components/routing/RequireProject'
import { hasValidOidcUser, isMarkedLoggedOut, isTimestampExpired, markLoggedOut } from './services/authSession'

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
  const location = useLocation()
  const tokenExpiresAt = useUserStore((state) => state.tokenExpiresAt)
  const locallyLoggedOut = isMarkedLoggedOut()
  const hasValidStoredUser = checkAuth && !isTimestampExpired(tokenExpiresAt, 0)
  const hasValidOidcSession = auth.isAuthenticated && hasValidOidcUser(auth.user)
  const authenticated = !locallyLoggedOut && (hasValidStoredUser || hasValidOidcSession)

  logger.info(isProtected ? 'Route is protected' : 'Route is public')
  logger.info(authenticated ? 'is authenticated' : 'is not authenticated')

  if (auth.isLoading && isProtected && !authenticated && !locallyLoggedOut) {
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center text-gray-500">
        Checking your session...
      </div>
    )
  }

  if (isProtected && !authenticated) {
    TrustDeck.instance().clearToken()
    useUserStore.getState().clear()
    const returnTo = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />
  }

  return <Component />
}


const TokenRefreshOnMainNavigation: React.FC = () => {
  const auth = useAuth()
  const location = useLocation()

  useEffect(() => {
    if (!auth.isAuthenticated || auth.isLoading || isMarkedLoggedOut()) return
    const isMainRoute = routes.some(
      (route) =>
        route.isSidebar &&
        Boolean(matchPath({ path: route.path, end: false }, location.pathname))
    )
    if (!isMainRoute) return
    void refreshAccessTokenForNavigation(auth)
  }, [auth, auth.isAuthenticated, auth.isLoading, location.pathname])

  return null
}

const AuthStateListener: React.FC = () => {
  const navigate = useNavigate() // Initialize useNavigate
  const isAuthenticated = useUserStore((state) => state.isAuthenticated)
  const isTabActive = useLayoutStore((state) => state.isTabActive) // Use isTabActive from LayoutStore
  const location = useLocation()
  const auth = useAuth()
  const hadLiveSessionRef = useRef(false)

  useEffect(() => {
    if (hasValidOidcUser(auth.user)) {
      hadLiveSessionRef.current = true
    }
  }, [auth.user])

  useEffect(() => {
    let previousAuthState = isAuthenticated

    const unsubscribe = useUserStore.subscribe(
      (state) => state.isAuthenticated,
      (currentAuthState) => {
        if (previousAuthState && !currentAuthState && !isTabActive) {
          console.log('User is no longer authenticated')
          markLoggedOut('timeout')
          navigate('/logged-out')
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
      TrustDeck.instance().clearToken()
      useUserStore.getState().clear()

      if (hadLiveSessionRef.current) {
        markLoggedOut('timeout')
        navigate('/logged-out')
      } else {
        navigate('/login', { replace: true })
      }
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
    if (pathname.match(/^\/search\/pseudonym\/([^/]+)(\/[^/]+)?$/)) {
      const searchRoute = routes.find((r) => r.path === '/search')
      const pseudonymRoute = routes.find((r) => r.path === '/search/pseudonym/:domainName/:pseudonymId') ?? routes.find((r) => r.path === '/search/pseudonym/:pseudonymId')
      const breadcrumbList = [
        { label: searchRoute?.titleKey || '/search', url: '/search' },
        { label: pseudonymRoute?.titleKey || pathname, url: pathname }
      ]
      setBreadcrumbItems(breadcrumbList)
      return
    }

    // Project overview still gets an explicit breadcrumb.
    if (pathname === '/projects') {
      const projectRoute = routes.find((r) => r.path === '/projects')
      setBreadcrumbItems([{ label: projectRoute?.titleKey || 'Projects', url: '/projects' }])
      return
    }

    // Default behavior for all other paths
    const pathnames = pathname.split('/').filter((x) => x)
    const breadcrumbList = pathnames
      .map((_, index) => {
        const path = `/${pathnames.slice(0, index + 1).join('/')}`
        const route = routes.find((r) =>
          matchPath({ path: r.path, end: true }, path)
        )

        // Skip intermediate synthetic segments like "/entity" when there is no route.
        if (!route && index < pathnames.length - 1) return null

        return { label: route ? route.titleKey : path, url: path }
      })
      .filter((item): item is { label: string; url: string } => item !== null)

    setBreadcrumbItems(breadcrumbList)
  }, [location, setBreadcrumbItems])

  return null
}

const AppRouter: FC = () => {
  useSyncApiToken()
  const isAuthenticated = useUserStore((state) => state.isAuthenticated)

  return (
    <>
      <AuthStateListener />
      <TokenRefreshOnMainNavigation />
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
