// external imports
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

// internal imports
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
  projectName: string
}

const XL_BREAKPOINT = 1280

export default function Sidebar({ projectName }: SidebarProps) {
  const { isSidebarOpen, toggleSidebar, setSidebarOpen } = useLayoutStore()
  const { t } = useTranslation(['layout', 'common'])
  const auth = useAuth()
  const projectImage = useProjectStore((state) => state.projectImage)
  const selectedProject = useProjectStore((state) => state.selectedProject)
  const setProjectImage = useProjectStore((state) => state.setProjectImage)
  const roles = useUserStore((state) => state.roles)
  const [permissionAccess, setPermissionAccess] =
    useState<CachedUserAccess | null>(null)
  const hasTriedRefetch = useRef(false)

  // On xl screens, default sidebar to open.
  useEffect(() => {
    if (window.innerWidth >= XL_BREAKPOINT) {
      setSidebarOpen(true)
    }
  }, [setSidebarOpen])

  // When resizing below xl, close the sidebar automatically.
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < XL_BREAKPOINT) {
        setSidebarOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [setSidebarOpen])

  // When the selected project changes, clear old image and fetch the new project's image.
  useEffect(() => {
    const projectAbbreviation = selectedProject?.abbreviation
    if (!projectAbbreviation || projectName === 'TrustDeck') {
      setProjectImage(undefined)
      return
    }

    setProjectImage(undefined)
    let cancelled = false
    ProjectService.getProjectImage(projectAbbreviation)
      .then((image) => {
        if (!cancelled && image) setProjectImage(image)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [projectName, selectedProject?.abbreviation, setProjectImage])

  // Refetch when the stored image is a blob URL (invalid after refresh).
  useEffect(() => {
    const projectAbbreviation = selectedProject?.abbreviation
    if (!projectAbbreviation || projectName === 'TrustDeck') return
    const stored = projectImage
    const isBrokenBlob =
      typeof stored === 'string' && stored.startsWith('blob:')

    if (isBrokenBlob && !hasTriedRefetch.current) {
      hasTriedRefetch.current = true
      setProjectImage(undefined)
      ProjectService.getProjectImage(projectAbbreviation)
        .then((image) => {
          if (image) setProjectImage(image)
        })
        .catch(() => {})
        .finally(() => {
          hasTriedRefetch.current = false
        })
    }
  }, [
    projectName,
    projectImage,
    selectedProject?.abbreviation,
    setProjectImage
  ])

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

  const accessForSidebar = useMemo<CachedUserAccess | null>(() => {
    if (permissionAccess) return permissionAccess
    return {
      userId: 'current-user',
      roles: roles ?? [],
      effectivePermissions: [],
      loadedAt: Date.now()
    }
  }, [permissionAccess, roles])

  const sidebarRoutes = useMemo(() => {
    return routes
      .filter(({ isSidebar, requiresBaseTypeAccess }) => {
        if (!isSidebar) return false
        if (requiresBaseTypeAccess) return canAccessBaseTypes(accessForSidebar)
        return true
      })
      .sort(
        (a, b) =>
          (a.sideboardOrder ?? Infinity) - (b.sideboardOrder ?? Infinity)
      )
  }, [accessForSidebar])

  const projectScopedRoutes = sidebarRoutes.filter(
    (route) => !route.isNonProject
  )
  const nonProjectRoutes = sidebarRoutes.filter((route) => route.isNonProject)

  // Only close sidebar on nav click when below xl (so big screens keep it open).
  const closeSidebarOnNavigate = () => {
    if (window.innerWidth < XL_BREAKPOINT && isSidebarOpen) toggleSidebar()
  }

  // create classes for NavLinks
  function getNavLinkClasses({ isActive }: { isActive: boolean }) {
    return `flex items-center px-4 py-2 rounded-lg transition-all duration-300 
      ${isActive ? 'bg-color-blue text-white' : 'hover:bg-gray-100 text-black dark:text-gray-100 dark:hover:bg-slate-800'}`
  }

  const routeTitle = (titleKey: string) => {
    if (titleKey.startsWith('layout:')) {
      return t(titleKey.slice('layout:'.length), { ns: 'layout' })
    }
    return t(titleKey)
  }

  const renderNavLinks = (items: RouteConfig[], collapsed = false) =>
    items.map(({ titleKey, path, Icon }) => (
      <li key={titleKey}>
        <NavLink
          to={path.replace('*', '/')}
          className={getNavLinkClasses}
          onClick={closeSidebarOnNavigate}
        >
          <Icon
            className={collapsed ? 'h-6 w-6' : 'h-6 w-6 mr-2'}
            aria-label={routeTitle(titleKey)}
          />
          {!collapsed && routeTitle(titleKey)}
        </NavLink>
      </li>
    ))

  return (
    <>
      <div className="sm:hidden">
        <Bars3Icon
          onClick={toggleSidebar}
          className="h-7 w-7 absolute top-3 left-3 text-black cursor-pointer dark:text-gray-100"
          aria-label="Open Sidebar"
        />
      </div>

      <div
        className={`hidden sm:flex sm:flex-col sm:justify-center sm:items-center sm:fixed sm:inset-0 sm:w-sidebar-collapse sm:bg-sidebar sm:text-black dark:sm:bg-slate-900 dark:sm:text-gray-100 sm:h-screen sm:shadow-[0px_2px_6px_1px_rgba(73,73,73,0.15)] ${isSidebarOpen ? 'xl:hidden' : ''}`}
      >
        <ChevronDoubleRightIcon
          onClick={toggleSidebar}
          className="h-6 w-6 absolute top-4 cursor-pointer dark:text-gray-100"
          aria-label="Open Sidebar"
        />
        <ul className="space-y-8">
          {renderNavLinks(projectScopedRoutes, true)}
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
        className={`fixed inset-0 bg-sidebar text-black dark:bg-slate-900 dark:text-gray-100 w-sidebar-large h-screen p-4 
        transform transition-transform duration-300 ease-in-out 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        shadow-[0px_2px_6px_1px_rgba(73,73,73,0.15)]
        z-50
          `}
      >
        <div className="sm:hidden">
          <XMarkIcon
            onClick={toggleSidebar}
            className="h-7 w-7 absolute top-3 right-3 text-black cursor-pointer dark:text-gray-100"
            aria-label="Close Sidebar"
          />
        </div>

        <div className="hidden sm:block">
          <ChevronDoubleLeftIcon
            onClick={toggleSidebar}
            className="h-7 w-7 absolute top-3 right-3 text-black cursor-pointer dark:text-gray-100"
            aria-label="Close Sidebar"
          />
        </div>
        <div className="flex">
          {projectImage && projectName !== 'TrustDeck' && (
            <img
              src={projectImage}
              alt="Project icon"
              className="mt-8 h-10 w-10 rounded-xl object-cover shrink-0"
            />
          )}
          <h1
            className={[
              'min-w-0 text-[28px] xl:text-[34px] mt-8 pl-3 text-left',
              projectName === 'TrustDeck'
                ? 'max-w-none whitespace-nowrap'
                : 'max-w-[150px] truncate'
            ].join(' ')}
            title={projectName}
          >
            {projectName}
          </h1>
        </div>

        <Divider />
        <nav className="flex h-[calc(100vh-8rem)] flex-col overflow-y-auto pb-6">
          <ul className="space-y-6">{renderNavLinks(projectScopedRoutes)}</ul>
          {nonProjectRoutes.length > 0 && (
            <div className="mt-auto pt-8">
              <Divider />
              <ul className="space-y-6">{renderNavLinks(nonProjectRoutes)}</ul>
            </div>
          )}
        </nav>
      </div>
    </>
  )
}
