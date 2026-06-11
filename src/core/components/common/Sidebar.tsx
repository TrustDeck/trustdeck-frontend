// external imports
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Bars3Icon,
  XMarkIcon,
  ChevronDoubleRightIcon,
  ChevronDoubleLeftIcon
} from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'

// internal imports
import { routes } from '../../configs/routes'
import useLayoutStore from '../../stores/LayoutStore'
import Divider from './Divider'
import PrimaryButton from '../form/buttons/PrimaryButton'
import useProjectStore from '../../stores/ProjectStore'
import ProjectService from '../../../pages/projects/services/ProjectService'

interface SidebarProps {
  projectName: string
}

const XL_BREAKPOINT = 1280

export default function Sidebar({ projectName }: SidebarProps) {
  const { isSidebarOpen, toggleSidebar, setSidebarOpen } = useLayoutStore()
  const { t } = useTranslation()
  const projectImage = useProjectStore((state) => state.projectImage)
  const setProjectImage = useProjectStore((state) => state.setProjectImage)
  const hasTriedRefetch = useRef(false)

  const navigate = useNavigate()

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
    if (!projectName) return
    setProjectImage(undefined)
    let cancelled = false
    ProjectService.getProjectImage()
      .then((image) => {
        if (!cancelled && image) setProjectImage(image)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [projectName, setProjectImage])

  // Refetch when the stored image is a blob URL (invalid after refresh).
  useEffect(() => {
    if (!projectName) return
    const stored = projectImage
    const isBrokenBlob = typeof stored === 'string' && stored.startsWith('blob:')

    if (isBrokenBlob && !hasTriedRefetch.current) {
      hasTriedRefetch.current = true
      setProjectImage(undefined)
      ProjectService.getProjectImage()
        .then((image) => {
          if (image) setProjectImage(image)
        })
        .catch(() => {})
        .finally(() => {
          hasTriedRefetch.current = false
        })
    }
  }, [projectName, projectImage, setProjectImage])

  // Only close sidebar on nav click when below xl (so big screens keep it open).
  const closeSidebarOnNavigate = () => {
    if (window.innerWidth < XL_BREAKPOINT && isSidebarOpen) toggleSidebar()
  }

  // create classes for NavLinks
  function getNavLinkClasses({ isActive }: { isActive: boolean }) {
    return `flex items-center px-4 py-2 rounded-lg transition-all duration-300 
      ${
        isActive ? 'bg-color-blue text-white' : 'hover:bg-gray-100 text-black'
      }`
  }

  return (
    <>
      <div className="sm:hidden">
        <Bars3Icon
          onClick={toggleSidebar}
          className="h-7 w-7 absolute top-3 left-3 text-black cursor-pointer"
          aria-label="Open Sidebar"
        />
      </div>

      <div className={`hidden sm:flex sm:flex-col sm:justify-center sm:items-center sm:fixed sm:inset-0 sm:w-sidebar-collapse sm:bg-sidebar sm:text-black sm:h-screen sm:shadow-[0px_2px_6px_1px_rgba(73,73,73,0.15)] ${isSidebarOpen ? 'xl:hidden' : ''}`}>
        <ChevronDoubleRightIcon
          onClick={toggleSidebar}
          className="h-6 w-6 absolute top-4 cursor-pointer"
          aria-label="Open Sidebar"
        />
        <ul className="space-y-12">
          {routes
            .filter(({ isSidebar }) => isSidebar)
            .sort(
              (a, b) =>
                (a.sideboardOrder ?? Infinity) - (b.sideboardOrder ?? Infinity)
            )
            .map(({ titleKey, path, Icon }) => (
              <h4 key={t(titleKey)}>
                <NavLink
                  to={path.replace('*', '/')}
                  className={getNavLinkClasses}
                  onClick={closeSidebarOnNavigate}
                >
                  <Icon className="w-6 h-6" aria-label={t(titleKey)} />
                </NavLink>
              </h4>
            ))}
        </ul>
      </div>

      <div
        className={`fixed inset-0 bg-sidebar text-black w-sidebar-large h-screen p-4 
        transform transition-transform duration-300 ease-in-out 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        shadow-[0px_2px_6px_1px_rgba(73,73,73,0.15)]
        z-50
          `}
      >
        <div className="sm:hidden">
          <XMarkIcon
            onClick={toggleSidebar}
            className="h-7 w-7 absolute top-3 right-3 text-black cursor-pointer"
            aria-label="Close Sidebar"
          />
        </div>

        <div className="hidden sm:block">
          <ChevronDoubleLeftIcon
            onClick={toggleSidebar}
            className="h-7 w-7 absolute top-3 right-3 text-black cursor-pointer"
            aria-label="Close Sidebar"
          />
        </div>
        <div className='flex'>
          {projectImage && projectName !== 'TrustDeck' && <img src={projectImage} alt="" className='w-32 h-32 object-contain shrink-0' />}
          <h1
            className={[
              'min-w-0 text-[28px] xl:text-[34px] mt-8 pl-4 text-left',
              projectName === 'TrustDeck' ? 'max-w-none whitespace-nowrap' : 'max-w-[150px] truncate'
            ].join(' ')}
            title={projectName}
          >
            {projectName}
          </h1>
        </div>

        <Divider />
        <ul className="space-y-10">
          {routes
            .filter(({ isSidebar }) => isSidebar)
            .sort(
              (a, b) =>
                (a.sideboardOrder ?? Infinity) - (b.sideboardOrder ?? Infinity)
            )
            .map(({ titleKey, path, Icon }) => (
              <h4 key={t(titleKey)}>
                <NavLink
                  to={path.replace('*', '/')}
                  className={getNavLinkClasses}
                  onClick={closeSidebarOnNavigate}
                >
                  <Icon className="w-6 h-6 mr-2" />
                  {t(titleKey)}
                </NavLink>
              </h4>
            ))}
        </ul>
        <div className="absolute bottom-10 left-0 right-0 flex justify-center">
          <PrimaryButton
            label={t('layout:menu.backToProjects')}
            onClick={() => {
              closeSidebarOnNavigate()
              navigate('/projects')
            }}
          />
        </div>
      </div>
    </>
  )
}
