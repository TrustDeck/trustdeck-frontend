/*
 * Trust Deck Services
 * Copyright 2024-2026 Armin Müller and Loic Khodarkovsky
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
import useLayoutStore from './stores/LayoutStore'
import useUserStore from './stores/UserStore'
import TrustDeck from '@service/TrustDeck'
import { useSyncApiToken } from './services/setupApi'
import { refreshAccessTokenForNavigation } from './services/tokenRefresh'
import RequireProject from './components/routing/RequireProject'
import { hasValidOidcUser, isMarkedLoggedOut, isTimestampExpired, markLoggedOut } from './services/authSession'

/** Defines the authentication state needed to render a route. */
interface ProtectedRouteProps {
  checkAuth: boolean
  component: FC
  isProtected: boolean
}

/** Renders a route only when the current OIDC or persisted session is valid. */
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


/** Refreshes the access token when the user changes between main application areas. */
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

/** Synchronizes token expiry and cross-tab authentication state with routing. */
const AuthStateListener: React.FC = () => {
  const navigate = useNavigate()
  const isAuthenticated = useUserStore((state) => state.isAuthenticated)
  const isTabActive = useLayoutStore((state) => state.isTabActive)
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
        }
        previousAuthState = currentAuthState
      }
    )

    return () => unsubscribe()
  }, [isAuthenticated, isTabActive, location, navigate])

  // OIDC renews proactively; this listener registers the lifecycle event intentionally.
  useEffect(() => {
    const handleTokenExpiring = () => {
      // `automaticSilentRenew` performs the refresh; registering keeps the event lifecycle explicit.
    }

    const unsubscribeExpiring = auth.events.addAccessTokenExpiring(handleTokenExpiring)
    return () => unsubscribeExpiring()
  }, [auth.events])

  // Every tab routes to the logged-out view; only the active tab starts provider logout.
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

/** Mounts application routes and the authentication lifecycle listeners. */
const AppRouter: FC = () => {
  useSyncApiToken()
  const isAuthenticated = useUserStore((state) => state.isAuthenticated)

  return (
    <>
      <AuthStateListener />
      <TokenRefreshOnMainNavigation />
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
