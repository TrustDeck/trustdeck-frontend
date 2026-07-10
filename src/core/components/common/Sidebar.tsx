import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Bars3Icon,
  XMarkIcon,
  ChevronDoubleRightIcon,
  ChevronDoubleLeftIcon
} from '@heroicons/react/24/outline'
import { useAuth } from 'react-oidc-context'
import { useEffect, useMemo, useRef, useState } from 'react'

import { routes, RouteConfig } from '../../configs/routes'
import useLayoutStore from '../../stores/LayoutStore'
import Divider from './Divider'
import useProjectStore from '../../stores/ProjectStore'
import ProjectService from '../../../pages/projects/services/ProjectService'
import TrustDeck from '../../services/TrustDeck'
import useUserStore from '../../stores/UserStore'
import {
  CachedUserAccess,
  canAccessBaseTypes,
  getCurrentUserAccess
} from '../../services/PermissionCache'

interface SidebarProps {
  projectAbbreviation?: string
  projectName?: string
}

const XL_BREAKPOINT = 1280

function rolesFromAccessToken(accessToken?: string) {
  if (!accessToken) return []
  try {
    const payload = accessToken.split('.')[1]
    if (!payload) return []
    const decodedPayload = JSON.parse(
      window.atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    )
    const realmRoles = decodedPayload?.realm_access?.roles
    const resourceRoles = Object.values(decodedPayload?.resource_access ?? {})
      .flatMap((client: any) => client?.roles ?? [])
      .filter((role): role is string => typeof role === 'string')
    return Array.from(
      new Set([
        ...(Array.isArray(realmRoles) ? realmRoles : []),
        ...resourceRoles
      ])
    )
  } catch {
    return []
  }
}

function formatRemaining(expiresAt: number | null) {
  if (!expiresAt) return '—'
  const remaining = Math.max(0, expiresAt - Date.now())
  const totalSeconds = Math.floor(remaining / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m ${String(seconds).padStart(2, '0')}s`
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}

function shortenProjectAbbreviation(abbreviation?: string) {
  if (!abbreviation) return 'TrustDeck'
  return abbreviation.length > 10 ? `${abbreviation.slice(0, 9)}…` : abbreviation
}

export default function Sidebar({ projectAbbreviation, projectName }: SidebarProps) {
  const { isSidebarOpen, toggleSidebar, setSidebarOpen } = useLayoutStore()
  const { t, i18n } = useTranslation(['layout', 'common'])
  const auth = useAuth()
  const projectImage = useProjectStore((state) => state.projectImage)
  const selectedProject = useProjectStore((state) => state.selectedProject)
  const setProjectImage = useProjectStore((state) => state.setProjectImage)
  const roles = useUserStore((state) => state.roles)
  const fullname = useUserStore((state) => state.fullname)
  const email = useUserStore((state) => state.email)
  const username = useUserStore((state) => state.username)
  const tokenExpiresAt = useUserStore((state) => state.tokenExpiresAt)
  const [remaining, setRemaining] = useState(() => formatRemaining(tokenExpiresAt))
  const [permissionAccess, setPermissionAccess] = useState<CachedUserAccess | null>(null)
  const hasTriedRefetch = useRef(false)

  const displayedProjectTitle = shortenProjectAbbreviation(projectAbbreviation)
  const fullProjectTitle = projectName || projectAbbreviation || 'TrustDeck'
  const displayName = fullname || email || username || t('layout:userMenu.signedInUser')

  useEffect(() => {
    const updateRemaining = () => setRemaining(formatRemaining(tokenExpiresAt))
    updateRemaining()
    const interval = window.setInterval(updateRemaining, 1000)
    return () => window.clearInterval(interval)
  }, [tokenExpiresAt])

  useEffect(() => {
    if (window.innerWidth >= XL_BREAKPOINT) setSidebarOpen(true)
  }, [setSidebarOpen])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < XL_BREAKPOINT) setSidebarOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [setSidebarOpen])

  useEffect(() => {
    const abbreviation = selectedProject?.abbreviation
    if (!abbreviation || !projectAbbreviation) {
      setProjectImage(undefined)
      return
    }

    setProjectImage(undefined)
    let cancelled = false
    ProjectService.getProjectImage(abbreviation)
      .then((image) => {
        if (!cancelled && image) setProjectImage(image)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [projectAbbreviation, selectedProject?.abbreviation, setProjectImage])

  useEffect(() => {
    const abbreviation = selectedProject?.abbreviation
    if (!abbreviation || !projectAbbreviation) return
    const isBrokenBlob = typeof projectImage === 'string' && projectImage.startsWith('blob:')
    if (isBrokenBlob && !hasTriedRefetch.current) {
      hasTriedRefetch.current = true
      setProjectImage(undefined)
      ProjectService.getProjectImage(abbreviation)
        .then((image) => {
          if (image) setProjectImage(image)
        })
        .catch(() => {})
        .finally(() => {
          hasTriedRefetch.current = false
        })
    }
  }, [projectAbbreviation, projectImage, selectedProject?.abbreviation, setProjectImage])

  useEffect(() => {
    let active = true
    if (!auth.user?.access_token) {
      setPermissionAccess(null)
      return () => {
        active = false
      }
    }

    TrustDeck.instance().setToken(auth.user.access_token)
    getCurrentUserAccess(false)
      .then((access) => {
        if (active) setPermissionAccess(access)
      })
      .catch(() => {
        if (active) setPermissionAccess(null)
      })

    return () => {
      active = false
    }
  }, [auth.user?.access_token])

  const tokenRoles = useMemo(
    () => rolesFromAccessToken(auth.user?.access_token),
    [auth.user?.access_token]
  )

  const accessForSidebar = useMemo<CachedUserAccess | null>(() => {
    const mergedRoles = Array.from(
      new Set([...(roles ?? []), ...tokenRoles, ...(permissionAccess?.roles ?? [])])
    )
    if (permissionAccess) return { ...permissionAccess, roles: mergedRoles }
    return {
      userId: 'current-user',
      roles: mergedRoles,
      effectivePermissions: [],
      loadedAt: Date.now()
    }
  }, [permissionAccess, roles, tokenRoles])

  const sidebarRoutes = useMemo(() => {
    return routes
      .filter(({ isSidebar, requiresBaseTypeAccess }) => {
        if (!isSidebar) return false
        if (!requiresBaseTypeAccess) return true
        if (!permissionAccess && auth.isAuthenticated) return true
        return canAccessBaseTypes(accessForSidebar)
      })
      .sort(
        (a, b) =>
          (a.sideboardOrder ?? Infinity) - (b.sideboardOrder ?? Infinity)
      )
  }, [accessForSidebar, auth.isAuthenticated, permissionAccess])

  const projectScopedRoutes = sidebarRoutes.filter((route) => !route.isNonProject)
  const nonProjectRoutes = sidebarRoutes.filter((route) => route.isNonProject)

  const closeSidebarOnNavigate = () => {
    if (window.innerWidth < XL_BREAKPOINT && isSidebarOpen) toggleSidebar()
  }

  function getNavLinkClasses({ isActive }: { isActive: boolean }) {
    return `flex min-w-0 items-center px-4 py-2 rounded-lg transition-all duration-300 ${
      isActive
        ? 'bg-color-blue text-white'
        : 'hover:bg-gray-100 text-black dark:text-gray-100 dark:hover:bg-slate-800'
    }`
  }

  const routeTitle = (titleKey: string) => {
    const lang = (i18n.resolvedLanguage ?? i18n.language ?? 'en')
      .toLowerCase()
      .split('-')[0]
    const normalizedKey = titleKey.startsWith('layout:')
      ? titleKey.slice('layout:'.length)
      : titleKey
    const fixedSidebarTitles: Record<string, Record<string, string>> = {
      'menu.entityManagement': {
        en: 'Entity Management',
        de: 'Entitätenverwaltung'
      },
      'menu.globalSettings': {
        en: 'Global Settings',
        de: 'Globale Einstellungen'
      },
      'menu.permissionManagement': {
        en: 'Permission Management',
        de: 'Berechtigungsverwaltung'
      }
    }

    const fixedTitle = fixedSidebarTitles[normalizedKey]
    if (fixedTitle) return fixedTitle[lang] ?? fixedTitle.en

    const translated = titleKey.startsWith('layout:')
      ? t(normalizedKey, { ns: 'layout' })
      : t(titleKey)
    return translated === titleKey || translated === normalizedKey
      ? fixedSidebarTitles[normalizedKey]?.[lang] ?? translated
      : translated
  }

  const renderNavLinks = (items: RouteConfig[], collapsed = false) =>
    items.map(({ titleKey, path, Icon }) => {
      const isUserManagement = path === '/user-management'
      const label = isUserManagement ? displayName : routeTitle(titleKey)
      const tooltip = isUserManagement
        ? t('layout:userMenu.logoutIn', { time: remaining })
        : label

      return (
        <li key={path}>
          <NavLink
            to={path.replace('*', '/')}
            className={getNavLinkClasses}
            onClick={closeSidebarOnNavigate}
            title={tooltip}
            aria-label={isUserManagement ? `${label}. ${tooltip}` : label}
          >
            <Icon className={collapsed ? 'h-6 w-6 shrink-0' : 'h-6 w-6 mr-2 shrink-0'} />
            {!collapsed && <span className="min-w-0 truncate">{label}</span>}
          </NavLink>
        </li>
      )
    })

  return (
    <>
      <div className="sm:hidden">
        <Bars3Icon
          onClick={toggleSidebar}
          className="absolute left-3 top-3 h-7 w-7 cursor-pointer text-black dark:text-gray-100"
          aria-label="Open Sidebar"
        />
      </div>

      <div
        className={`hidden sm:fixed sm:inset-0 sm:flex sm:h-screen sm:w-sidebar-collapse sm:flex-col sm:items-center sm:justify-center sm:bg-sidebar sm:text-black sm:shadow-[0px_2px_6px_1px_rgba(73,73,73,0.15)] dark:sm:bg-slate-900 dark:sm:text-gray-100 ${isSidebarOpen ? 'xl:hidden' : ''}`}
      >
        <ChevronDoubleRightIcon
          onClick={toggleSidebar}
          className="absolute top-4 h-6 w-6 cursor-pointer dark:text-gray-100"
          aria-label="Open Sidebar"
        />
        <ul className="space-y-8">
          {renderNavLinks(projectScopedRoutes, true)}
          {nonProjectRoutes.length > 0 && (
            <li className="border-t border-gray-300 pt-8 dark:border-slate-700">
              <ul className="space-y-8">{renderNavLinks(nonProjectRoutes, true)}</ul>
            </li>
          )}
        </ul>
      </div>

      <div
        className={`fixed inset-0 z-50 h-screen w-sidebar-large transform bg-sidebar p-4 text-black shadow-[0px_2px_6px_1px_rgba(73,73,73,0.15)] transition-transform duration-300 ease-in-out dark:bg-slate-900 dark:text-gray-100 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="sm:hidden">
          <XMarkIcon
            onClick={toggleSidebar}
            className="absolute right-3 top-3 h-7 w-7 cursor-pointer text-black dark:text-gray-100"
            aria-label="Close Sidebar"
          />
        </div>
        <div className="hidden sm:block">
          <ChevronDoubleLeftIcon
            onClick={toggleSidebar}
            className="absolute right-3 top-3 h-7 w-7 cursor-pointer text-black dark:text-gray-100"
            aria-label="Close Sidebar"
          />
        </div>

        <div className="flex min-w-0 items-center">
          {projectImage && projectAbbreviation && (
            <img
              src={projectImage}
              alt="Project icon"
              className="mt-8 h-10 w-10 shrink-0 rounded-xl object-cover"
            />
          )}
          <h1
            className="mt-8 min-w-0 truncate pl-3 text-left text-[28px] xl:text-[34px]"
            title={fullProjectTitle}
          >
            {displayedProjectTitle}
          </h1>
        </div>

        <Divider />
        <nav className="flex h-[calc(100vh-8rem)] flex-col overflow-y-auto pb-6">
          <ul className="space-y-4">{renderNavLinks(projectScopedRoutes)}</ul>
          {nonProjectRoutes.length > 0 && (
            <div className="mt-auto pt-6">
              <Divider />
              <ul className="space-y-4">{renderNavLinks(nonProjectRoutes)}</ul>
            </div>
          )}
        </nav>
      </div>
    </>
  )
}
