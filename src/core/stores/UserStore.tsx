import { create } from 'zustand'
import { shared } from 'use-broadcast-ts'
import { jwtDecode } from 'jwt-decode'
import { subscribeWithSelector } from 'zustand/middleware'

interface TokenDetails {
  sub: string
  given_name: string
  family_name: string
  email: string
  locale: string
  exp?: number
  resource_access?: {
    backend?: {
      roles?: string[]
    }
  }
}

interface UserState {
  username: string
  firstname: string
  lastname: string
  fullname: string
  email: string
  roles: string[]
  tokenExpiresAt: number | null
  isAuthenticated: boolean
  locale: string
  setFromAccessToken: (token: string) => void
  clear: () => void
}

const useUserStore = create<UserState>()(
  subscribeWithSelector(
    shared(
      (set) => ({
        username: '',
        firstname: '',
        lastname: '',
        fullname: '',
        email: '',
        locale: 'en',
        roles: [],
        tokenExpiresAt: null,
        isAuthenticated: false,
        setFromAccessToken: (token: string) => {
          try {
            const decoded = jwtDecode<TokenDetails>(token)
            //console.log(decoded);
            set({
              username: decoded.sub,
              fullname: (
                (decoded.given_name || '') +
                ' ' +
                (decoded.family_name || '')
              ).trim(),
              firstname: decoded.given_name || '',
              lastname: decoded.family_name || '',
              email: decoded.email || '',
              locale: decoded.locale || 'en',
              roles: decoded.resource_access?.backend?.roles || [],
              tokenExpiresAt: decoded.exp ? decoded.exp * 1000 : null,
              isAuthenticated: true
            })
          } catch (error) {
            console.error('Invalid token:', error)
            set({
              username: '',
              firstname: '',
              lastname: '',
              fullname: '',
              email: '',
              locale: 'en',
              roles: [],
              tokenExpiresAt: null,
              isAuthenticated: false
            })
          }
        },
        clear: () =>
          set({
            username: '',
            firstname: '',
            lastname: '',
            fullname: '',
            email: '',
            locale: 'en',
            roles: [],
            tokenExpiresAt: null,
            isAuthenticated: false
          })
      }),
      { name: 'user-broadcast' }
    )
  )
)

export default useUserStore
