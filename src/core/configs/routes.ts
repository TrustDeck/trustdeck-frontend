import { FC, SVGProps } from 'react'
import LoggedOut from '../../pages/general/LoggedOut'
import Login from '../../pages/general/Login'
import AuthCallback from '../../pages/general/AuthCallback'
import SearchMask from '../../pages/search/SearchMask'
import SearchPsn from '../../pages/pseudonym/SearchPsn'
import PreReg from '../../pages/identity/PreReg'
import GroupManager from '../../pages/groups/GroupManager'
import EntityDetails from '../../pages/search/EntityDetails'
import {
  Bars3Icon,
  MagnifyingGlassIcon,
  IdentificationIcon,
  EyeSlashIcon,
  ArchiveBoxIcon,
  ShieldCheckIcon,
  FolderPlusIcon,
  FolderIcon,
  CubeTransparentIcon,
  WrenchScrewdriverIcon,
  UserCircleIcon
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
import BaseTypeManager from '../../pages/builder/BaseTypeManager'
import UserManagement from '../../pages/user/UserManagement'

export type RouteConfig = {
  path: string
  titleKey: string
  component: FC
  Icon: FC<SVGProps<SVGSVGElement>>
  isProtected: boolean
  isSidebar: boolean
  sideboardOrder?: number
  isNonProject?: boolean
  requiresBaseTypeAccess?: boolean
  requiresScopedPermission?: 'project-domain'
  sidebarGroup?: 'configuration' | 'management'
}

export const routes: RouteConfig[] = [
  {
    path: '/login',
    titleKey: 'Login',
    component: Login,
    Icon: Bars3Icon,
    isProtected: false,
    isSidebar: false
  },

  {
    path: '/callback',
    titleKey: 'Login callback',
    component: AuthCallback,
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
    Icon: FolderIcon,
    isProtected: true,
    isSidebar: true,
    sideboardOrder: 0
  },
  {
    path: '/projects/new',
    titleKey: 'layout:menu.newProject',
    component: NewProjectSimplified,
    Icon: FolderPlusIcon,
    isProtected: true,
    isSidebar: false,
    sideboardOrder: -2
  },
  {
    path: '/permissions',
    titleKey: 'layout:menu.permissions',
    component: GlobalPermissions,
    Icon: ShieldCheckIcon,
    isProtected: true,
    isSidebar: true,
    sideboardOrder: 5,
    sidebarGroup: 'configuration',
    requiresScopedPermission: 'project-domain'
  },
  {
    path: '/user-management',
    titleKey: 'layout:menu.userManagement',
    component: UserManagement,
    Icon: UserCircleIcon,
    isProtected: true,
    isSidebar: true,
    sideboardOrder: 10,
    isNonProject: true
  },
  {
    path: '/base-types',
    titleKey: 'layout:menu.globalSettings',
    component: BaseTypeManager,
    Icon: WrenchScrewdriverIcon,
    isProtected: true,
    isSidebar: true,
    sideboardOrder: 8,
    isNonProject: true
  },
  {
    path: '/entity/manager',
    titleKey: 'layout:menu.entityTypes',
    component: EntityManager,
    Icon: CubeTransparentIcon,
    isProtected: true,
    isSidebar: true,
    sideboardOrder: 4,
    sidebarGroup: 'configuration'
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
    titleKey: 'layout:menu.entities',
    component: PreReg,
    Icon: IdentificationIcon,
    isProtected: true,
    isSidebar: true,
    sideboardOrder: 6,
    sidebarGroup: 'management'
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
    titleKey: 'layout:menu.pseudonyms',
    component: SearchPsn,
    Icon: EyeSlashIcon,
    isProtected: true,
    isSidebar: true,
    sideboardOrder: 7,
    sidebarGroup: 'management'
  },
  {
    path: '/group-management',
    titleKey: 'layout:menu.pseudonymDomains',
    component: GroupManager,
    Icon: ArchiveBoxIcon,
    isProtected: true,
    isSidebar: true,
    sideboardOrder: 3,
    sidebarGroup: 'configuration'
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
    sideboardOrder: 2
  }
]
