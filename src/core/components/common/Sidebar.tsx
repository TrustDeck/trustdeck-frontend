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

// internal imports
import { routes } from '../../configs/routes'
import useLayoutStore from '../../stores/LayoutStore'
import Divider from './Divider'
import PrimaryButton from '../form/buttons/PrimaryButton'


interface SidebarProps {
  projectName: string
}

export default function Sidebar({ projectName }: SidebarProps) {
  const { isSidebarOpen, toggleSidebar } = useLayoutStore()
  const { t } = useTranslation()
  const navigate = useNavigate()

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

      <div className="hidden sm:flex sm:flex-col sm:justify-center sm:items-center sm:fixed sm:inset-0 sm:w-sidebar-collapse sm:bg-sidebar sm:text-black sm:h-screen sm:shadow-[0px_2px_6px_1px_rgba(73,73,73,0.15)] xl:hidden">
        <ChevronDoubleRightIcon
          onClick={toggleSidebar}
          className="h-6 w-6 absolute top-4 cursor-pointer"
          aria-label="Close Sidebar"
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
        ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } xl:translate-x-0
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

        <div className="hidden sm:block xl:hidden">
          <ChevronDoubleLeftIcon
            onClick={toggleSidebar}
            className="h-7 w-7 absolute top-3 right-3 text-black cursor-pointer"
            aria-label="Close Sidebar"
          />
        </div>

        <h1 className="text-[42px] mt-8 pl-4 text-left">{projectName}</h1>
        <Divider/>
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
            onClick={() => navigate('/projects')}
          />
        </div>
      </div>
    </>
  )
}
