import { FC, SVGProps } from 'react'
import LoggedOut from '../../pages/general/LoggedOut'
import Login from '../../pages/general/Login'
import ResultsMask from '../../pages/search/ResultsMask'
import SearchMask from '../../pages/search/SearchMask'
import SearchPsn from '../../pages/pseudonym/SearchPsn'
import PreReg from '../../pages/identity/PreReg'
import GroupManager from '../../pages/groups/GroupManager'
import Settings from '../../pages/project/Settings'
import EntityDetails from '../../pages/search/EntityDetails'
import {
  Bars3Icon,
  MagnifyingGlassIcon,
  IdentificationIcon,
  EyeSlashIcon,
  ArchiveBoxIcon,
  Cog8ToothIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline'
import PseudonymDetails from '../../pages/search/PseudonymDetails'
import Registration from '../../pages/identity/Registration'
import DuplicateResults from '../../pages/identity/DuplicateResults'
import Duplicate from '../../pages/identity/Duplicate'
import ProjectOverview from '../../pages/projects/ProjectOverview'
import NewProjectSimplified from '../../pages/projects/NewProjectSimplified'
import GlobalPermissions from '../../pages/projects/GlobalPermissions'
import Builder from '../../pages/builder/Builder'
import EntityManager from '../../pages/builder/EntityManager'
import AdminCenter from '../../pages/admin/AdminCenter'

export type RouteConfig = {
  path: string
  titleKey: string
  component: FC
  Icon: FC<SVGProps<SVGSVGElement>>
  isProtected: boolean
  isSidebar: boolean
  sideboardOrder?: number
}

export const routes: RouteConfig[] = [
  {
    path: '/auth/login',
    titleKey: 'Login',
    component: Login,
    Icon: Bars3Icon,
    isProtected: false,
    isSidebar: false
  },
  {
    path: '/logged-out',
    titleKey: 'layout:menu.logout',
    component: LoggedOut,
    Icon: Bars3Icon,
    isProtected: false,
    isSidebar: false
  },
  {
    path: '/projects',
    titleKey: 'layout:menu.projects',
    component: ProjectOverview,
    Icon: MagnifyingGlassIcon,
    isProtected: true,
    isSidebar: false
  },
  {
    path: '/projects/new',
    titleKey: 'layout:menu.projects',
    component: NewProjectSimplified,
    Icon: MagnifyingGlassIcon,
    isProtected: true,
    isSidebar: false
  },
  {
    path: '/projects/global-permissions',
    titleKey: 'layout:menu.projects',
    component: GlobalPermissions,
    Icon: MagnifyingGlassIcon,
    isProtected: true,
    isSidebar: false
  },
  {
    path: '/entity/manager',
    titleKey: 'layout:menu.entityManager',
    component: EntityManager,
    Icon: IdentificationIcon,
    isProtected: true,
    isSidebar: true,
    sideboardOrder: 1
  },
  {
    path: '/entity/manager/new',
    titleKey: 'entityBuilder:addEntity',
    component: Builder,
    Icon: IdentificationIcon,
    isProtected: true,
    isSidebar: false
  },
  {
    path: '/identity',
    titleKey: 'layout:menu.identityManagement',
    component: PreReg,
    Icon: IdentificationIcon,
    isProtected: true,
    isSidebar: true,
    sideboardOrder: 1
  },
  {
    path: '/identity/register',
    titleKey: 'layout:menu.registration',
    component: Registration,
    Icon: IdentificationIcon,
    isProtected: true,
    isSidebar: false
  },
  {
    path: '/identity/duplicates',
    titleKey: 'layout:menu.duplicates',
    component: DuplicateResults,
    Icon: IdentificationIcon,
    isProtected: true,
    isSidebar: false
  },
  {
    path: '/identity/duplicates/:duplicateId',
    titleKey: 'layout:menu.resolveDuplicates',
    component: Duplicate,
    Icon: IdentificationIcon,
    isProtected: true,
    isSidebar: false
  },
  {
    path: '/pseudonym-management',
    titleKey: 'layout:menu.pseudonymManagement',
    component: SearchPsn,
    Icon: EyeSlashIcon,
    isProtected: true,
    isSidebar: true,
    sideboardOrder: 2
  },
  {
    path: '/group-management',
    titleKey: 'layout:menu.groupManagement',
    component: GroupManager,
    Icon: ArchiveBoxIcon,
    isProtected: true,
    isSidebar: true,
    sideboardOrder: 3
  },
  {
    path: '/project-settings',
    titleKey: 'layout:menu.projectSettings',
    component: Settings,
    Icon: Cog8ToothIcon,
    isProtected: true,
    isSidebar: true,
    sideboardOrder: 4
  },
  {
    path: '/admin',
    titleKey: 'Backend admin',
    component: AdminCenter,
    Icon: WrenchScrewdriverIcon,
    isProtected: true,
    isSidebar: true,
    sideboardOrder: 5
  },
  {
    path: '/search/results',
    titleKey: 'layout:menu.searchResults',
    component: ResultsMask,
    Icon: MagnifyingGlassIcon,
    isProtected: true,
    isSidebar: false
  },
  {
    path: '/search/pseudonym/:domainName/:pseudonymId',
    titleKey: 'layout:menu.pseudonymDetails',
    component: PseudonymDetails,
    Icon: MagnifyingGlassIcon,
    isProtected: true,
    isSidebar: false
  },
  {
    path: '/search/pseudonym/:pseudonymId',
    titleKey: 'layout:menu.pseudonymDetails',
    component: PseudonymDetails,
    Icon: MagnifyingGlassIcon,
    isProtected: true,
    isSidebar: false
  },
  {
    path: '/search/:entityId/:pseudonymId',
    titleKey: 'layout:menu.entityDetails',
    component: PseudonymDetails,
    Icon: MagnifyingGlassIcon,
    isProtected: true,
    isSidebar: false
  },
  {
    path: '/search/:entityId',
    titleKey: 'layout:menu.entityDetails',
    component: EntityDetails,
    Icon: MagnifyingGlassIcon,
    isProtected: true,
    isSidebar: false
  },
  {
    path: '/search',
    titleKey: 'layout:menu.search',
    component: SearchMask,
    Icon: MagnifyingGlassIcon,
    isProtected: true,
    isSidebar: true,
    sideboardOrder: 0
  }
]
