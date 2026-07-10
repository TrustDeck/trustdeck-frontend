import { create } from 'zustand'
import { shared } from 'use-broadcast-ts'
import { jwtDecode } from 'jwt-decode'
import { subscribeWithSelector } from 'zustand/middleware'
import { isTimestampExpired } from '../services/authSession'

function normalizeLocale(locale?: string | null): 'en' | 'de' {
  return locale?.toLowerCase().startsWith('de') ? 'de' : 'en'
}

interface TokenDetails {
  sub: string
  preferred_username?: string
  given_name: string
  family_name: string
  email: string
  locale: string
  exp?: number
  realm_access?: {
    roles?: string[]
  }
  resource_access?: Record<string, { roles?: string[] }>
}

function getStoredLocaleOverride() {
  if (typeof window === 'undefined') return null
  const stored = window.localStorage.getItem('trustdeck:locale')
  return stored === 'de' || stored === 'en' ? stored : null
}

function persistLocaleOverride(locale: string) {
  if (typeof window === 'undefined') return
  if (locale === 'de' || locale === 'en') {
    window.localStorage.setItem('trustdeck:locale', locale)
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
  setLocale: (locale: string) => void
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
        locale: getStoredLocaleOverride() ?? 'en',
        roles: [],
        tokenExpiresAt: null,
        isAuthenticated: false,
        setFromAccessToken: (token: string) => {
          try {
            const decoded = jwtDecode<TokenDetails>(token)
            const tokenExpiresAt = decoded.exp ? decoded.exp * 1000 : null

            if (isTimestampExpired(tokenExpiresAt, 0)) {
              set({
                username: '',
                firstname: '',
                lastname: '',
                fullname: '',
                email: '',
                locale: getStoredLocaleOverride() ?? 'en',
                roles: [],
                tokenExpiresAt: null,
                isAuthenticated: false
              })
              return
            }

            const resourceRoles = Object.values(
              decoded.resource_access ?? {}
            ).flatMap((client) => client.roles ?? [])
            const realmRoles = decoded.realm_access?.roles ?? []
            const roles = Array.from(new Set([...realmRoles, ...resourceRoles]))

            set({
              username: decoded.preferred_username || decoded.sub,
              fullname: (
                (decoded.given_name || '') +
                ' ' +
                (decoded.family_name || '')
              ).trim(),
              firstname: decoded.given_name || '',
              lastname: decoded.family_name || '',
              email: decoded.email || '',
              locale:
                getStoredLocaleOverride() ?? normalizeLocale(decoded.locale),
              roles,
              tokenExpiresAt,
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
              locale: getStoredLocaleOverride() ?? 'en',
              roles: [],
              tokenExpiresAt: null,
              isAuthenticated: false
            })
          }
        },
        setLocale: (locale: string) => {
          const normalized = normalizeLocale(locale)
          persistLocaleOverride(normalized)
          set({ locale: normalized })
        },
        clear: () =>
          set({
            username: '',
            firstname: '',
            lastname: '',
            fullname: '',
            email: '',
            locale: getStoredLocaleOverride() ?? 'en',
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
