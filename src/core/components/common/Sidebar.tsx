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
  canManagePermissions,
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
  if (hours > 0)
    return `${hours}h ${minutes}m ${String(seconds).padStart(2, '0')}s`
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}


function canSeeProjectDomainPermissions(
  access: CachedUserAccess | null,
  selectedProjectAbbreviation?: string
) {
  if (!access) return false
  const privileged = (access.roles ?? []).some((role) => {
    const normalized = String(role).trim().toLowerCase()
    return [
      'admin',
      'administrator',
      'realm-admin',
      'trustdeck-admin',
      'trustdeck_admin',
      'backend-admin'
    ].includes(normalized)
  })
  if (privileged) return true

  return (
    canManagePermissions(access, 'PROJECT', selectedProjectAbbreviation) ||
    canManagePermissions(access, 'DOMAIN') ||
    canManagePermissions(access, 'ENTITY_TYPE', undefined, selectedProjectAbbreviation)
  )
}
function normalizePermissionForSidebar(permission: any) {
  const resourceType = String(permission?.resourceType ?? '').toUpperCase()
  const resourceName =
    permission?.resourceName ??
    permission?.projectAbbreviation ??
    permission?.domainName ??
    permission?.entityTypeName
  const action = String(permission?.action ?? permission?.operation ?? '')
  if (!resourceType || !action) return null
  return {
    resourceType,
    resourceName: resourceName ? String(resourceName) : undefined,
    action
  }
}

function shortenProjectAbbreviation(abbreviation?: string) {
  if (!abbreviation) return 'TrustDeck'
  return abbreviation.length > 10
    ? `${abbreviation.slice(0, 9)}…`
    : abbreviation
}

export default function Sidebar({
  projectAbbreviation,
  projectName
}: SidebarProps) {
  const { isSidebarOpen, toggleSidebar, setSidebarOpen } = useLayoutStore()
  const { t } = useTranslation(['layout', 'common'])
  const auth = useAuth()
  const projectImage = useProjectStore((state) => state.projectImage)
  const selectedProject = useProjectStore((state) => state.selectedProject)
  const setProjectImage = useProjectStore((state) => state.setProjectImage)
  const roles = useUserStore((state) => state.roles)
  const fullname = useUserStore((state) => state.fullname)
  const email = useUserStore((state) => state.email)
  const username = useUserStore((state) => state.username)
  const tokenExpiresAt = useUserStore((state) => state.tokenExpiresAt)
  const [remaining, setRemaining] = useState(() =>
    formatRemaining(tokenExpiresAt)
  )
  const [permissionAccess, setPermissionAccess] =
    useState<CachedUserAccess | null>(null)
  const hasTriedRefetch = useRef(false)

  const displayedProjectTitle = shortenProjectAbbreviation(projectAbbreviation)
  const fullProjectTitle = projectName || projectAbbreviation || 'TrustDeck'
  const displayName =
    fullname || email || username || t('layout:userMenu.signedInUser')

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
    const isBrokenBlob =
      typeof projectImage === 'string' && projectImage.startsWith('blob:')
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
  }, [
    projectAbbreviation,
    projectImage,
    selectedProject?.abbreviation,
    setProjectImage
  ])

  useEffect(() => {
    let active = true
    const accessToken = auth.user?.access_token
    if (!accessToken) {
      setPermissionAccess(null)
      return () => {
        active = false
      }
    }

    async function loadSidebarAccess() {
      TrustDeck.instance().setToken(accessToken!)
      let access: CachedUserAccess
      try {
        access = await getCurrentUserAccess(false)
      } catch {
        access = {
          userId: 'current-user',
          roles: roles ?? [],
          effectivePermissions: [],
          loadedAt: Date.now()
        }
      }

      const subjectId = String(auth.user?.profile?.sub ?? access.subjectId ?? '').trim()
      const abbreviation = selectedProject?.abbreviation
      const scopedPermissions: any[] = []

      if (subjectId && abbreviation) {
        const requests: Promise<unknown[]>[] = [
          TrustDeck.instance().getProjectPermissions(
            abbreviation,
            subjectId
          ) as Promise<unknown[]>
        ]

        try {
          const entityTypes = await TrustDeck.instance().getProjectEntities(
            '*',
            abbreviation
          )
          const domainNames = Array.from(
            new Set(
              entityTypes
                .map((entityType: any) =>
                  String(entityType?.associatedDomainName ?? '').trim()
                )
                .filter(Boolean)
            )
          )
          domainNames.forEach((domainName) => {
            requests.push(
              TrustDeck.instance().getDomainPermissions(
                domainName,
                subjectId
              ) as Promise<unknown[]>
            )
          })
          entityTypes.forEach((entityType: any) => {
            const entityTypeName = String(
              entityType?.name ?? entityType?.entityTypeName ?? ''
            ).trim()
            if (!entityTypeName) return
            requests.push(
              TrustDeck.instance().getEntityTypePermissions(
                abbreviation,
                entityTypeName,
                subjectId
              ) as Promise<unknown[]>
            )
          })
        } catch {
          // Project/entity access is independently guarded. The project permission
          // request above still allows the route to be detected when possible.
        }

        const results = await Promise.allSettled(requests)
        results.forEach((result) => {
          if (result.status === 'fulfilled') scopedPermissions.push(...result.value)
        })
      }

      const normalizedScoped = scopedPermissions
        .map(normalizePermissionForSidebar)
        .filter(Boolean)
      const uniquePermissions = Array.from(
        new Map(
          [...(access.effectivePermissions ?? []), ...normalizedScoped].map(
            (permission: any) => [
              `${permission.resourceType}:${permission.resourceName ?? '*'}:${permission.action}`,
              permission
            ]
          )
        ).values()
      ) as CachedUserAccess['effectivePermissions']

      if (active) {
        setPermissionAccess({
          ...access,
          subjectId: subjectId || access.subjectId,
          effectivePermissions: uniquePermissions,
          loadedAt: Date.now()
        })
      }
    }

    void loadSidebarAccess()
    return () => {
      active = false
    }
  }, [
    auth.user?.access_token,
    auth.user?.profile?.sub,
    roles,
    selectedProject?.abbreviation
  ])

  const tokenRoles = useMemo(
    () => rolesFromAccessToken(auth.user?.access_token),
    [auth.user?.access_token]
  )

  const accessForSidebar = useMemo<CachedUserAccess | null>(() => {
    const mergedRoles = Array.from(
      new Set([
        ...(roles ?? []),
        ...tokenRoles,
        ...(permissionAccess?.roles ?? [])
      ])
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
      .filter(
        ({ isSidebar, requiresBaseTypeAccess, requiresScopedPermission }) => {
          if (!isSidebar) return false
          if (requiresScopedPermission === 'project-domain') {
            if (!permissionAccess && auth.isAuthenticated) return true
            return canSeeProjectDomainPermissions(
              accessForSidebar,
              selectedProject?.abbreviation
            )
          }
          if (!requiresBaseTypeAccess) return true
          if (!permissionAccess && auth.isAuthenticated) return true
          return canAccessBaseTypes(accessForSidebar)
        }
      )
      .sort(
        (a, b) =>
          (a.sideboardOrder ?? Infinity) - (b.sideboardOrder ?? Infinity)
      )
  }, [
    accessForSidebar,
    auth.isAuthenticated,
    permissionAccess,
    selectedProject?.abbreviation
  ])

  const projectScopedRoutes = sidebarRoutes.filter(
    (route) => !route.isNonProject
  )
  const ungroupedProjectRoutes = projectScopedRoutes.filter(
    (route) => !route.sidebarGroup
  )
  const configurationRoutes = projectScopedRoutes.filter(
    (route) => route.sidebarGroup === 'configuration'
  )
  const managementRoutes = projectScopedRoutes.filter(
    (route) => route.sidebarGroup === 'management'
  )
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
    const normalizedKey = titleKey.startsWith('layout:')
      ? titleKey.slice('layout:'.length)
      : titleKey

    return titleKey.startsWith('layout:')
      ? t(normalizedKey, { ns: 'layout', defaultValue: normalizedKey })
      : t(titleKey, { defaultValue: titleKey })
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
            <Icon
              className={
                collapsed ? 'h-6 w-6 shrink-0' : 'h-6 w-6 mr-2 shrink-0'
              }
            />
            {!collapsed && <span className="min-w-0 truncate">{label}</span>}
          </NavLink>
        </li>
      )
    })

  const renderExpandedRouteGroup = (title: string, items: RouteConfig[]) => {
    if (items.length === 0) return null
    return (
      <li className="pt-2">
        <div className="mb-2 px-4 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
          {title}
        </div>
        <ul className="space-y-2">{renderNavLinks(items)}</ul>
      </li>
    )
  }

  const renderCollapsedRouteGroup = (items: RouteConfig[]) => {
    if (items.length === 0) return null
    return (
      <li className="border-t border-gray-300 pt-6 dark:border-slate-700">
        <ul className="space-y-8">{renderNavLinks(items, true)}</ul>
      </li>
    )
  }

  return (
    <>
      <div className="sm:hidden">
        <Bars3Icon
          onClick={toggleSidebar}
          className="absolute left-3 top-3 h-7 w-7 cursor-pointer text-black dark:text-gray-100"
          aria-label={t('layout:sidebar.open')}
        />
      </div>

      <div
        className={`hidden sm:fixed sm:inset-0 sm:flex sm:h-screen sm:w-sidebar-collapse sm:flex-col sm:items-center sm:justify-center sm:bg-sidebar sm:text-black sm:shadow-[0px_2px_6px_1px_rgba(73,73,73,0.15)] dark:sm:bg-slate-900 dark:sm:text-gray-100 ${isSidebarOpen ? 'xl:hidden' : ''}`}
      >
        <ChevronDoubleRightIcon
          onClick={toggleSidebar}
          className="absolute top-4 h-6 w-6 cursor-pointer dark:text-gray-100"
          aria-label={t('layout:sidebar.open')}
        />
        <ul className="space-y-8">
          {renderNavLinks(ungroupedProjectRoutes, true)}
          {renderCollapsedRouteGroup(configurationRoutes)}
          {renderCollapsedRouteGroup(managementRoutes)}
          {nonProjectRoutes.length > 0 && (
            <li className="border-t border-gray-300 pt-8 dark:border-slate-700">
              <ul className="space-y-8">
                {renderNavLinks(nonProjectRoutes, true)}
              </ul>
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
            aria-label={t('layout:sidebar.close')}
          />
        </div>
        <div className="hidden sm:block">
          <ChevronDoubleLeftIcon
            onClick={toggleSidebar}
            className="absolute right-3 top-3 h-7 w-7 cursor-pointer text-black dark:text-gray-100"
            aria-label={t('layout:sidebar.close')}
          />
        </div>

        <div className="flex min-w-0 items-center">
          {projectImage && projectAbbreviation && (
            <img
              src={projectImage}
              alt={t('layout:sidebar.projectIconAlt')}
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
          <ul className="space-y-4">
            {renderNavLinks(ungroupedProjectRoutes)}
            {renderExpandedRouteGroup(
              t('layout:sidebarGroups.configuration'),
              configurationRoutes
            )}
            {renderExpandedRouteGroup(
              t('layout:sidebarGroups.management'),
              managementRoutes
            )}
          </ul>
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
