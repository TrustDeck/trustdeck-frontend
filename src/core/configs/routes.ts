import { FC, SVGProps } from 'react'
import LoggedOut from '../../pages/general/LoggedOut'
import Login from '../../pages/general/Login'
import AuthCallback from '../../pages/general/AuthCallback'
import SearchMask from '../../pages/search/SearchMask'
import SearchPsn from '../../pages/pseudonym/SearchPsn'
import PreReg from '../../pages/identity/PreReg'
import DomainManager from '../../pages/domains/DomainManager'
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
  ClipboardDocumentListIcon,
  WrenchScrewdriverIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline'
import PseudonymDetails from '../../pages/search/PseudonymDetails'
import Registration from '../../pages/identity/Registration'
import DuplicateResults from '../../pages/identity/DuplicateResults'
import Duplicate from '../../pages/identity/Duplicate'
import ProjectOverview from '../../pages/projects/ProjectOverview'
import NewProjectSimplified from '../../pages/projects/NewProjectSimplified'
import PermissionManagement from '../../pages/projects/PermissionManagement'
import Builder from '../../pages/builder/Builder'
import EntityManager from '../../pages/builder/EntityManager'
import BaseTypeManager from '../../pages/builder/BaseTypeManager'
import UserManagement from '../../pages/user/UserManagement'

export type RouteConfig = {
  path: string
  titleKey: string
  /** Plain-language explanation shown as the sidebar entry's tooltip. */
  descriptionKey?: string
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
    component: PermissionManagement,
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
    path: '/global-settings',
    titleKey: 'layout:menu.globalSettings',
    component: BaseTypeManager,
    Icon: WrenchScrewdriverIcon,
    isProtected: true,
    isSidebar: true,
    sideboardOrder: 8,
    isNonProject: true
  },
  {
    path: '/entity-types',
    titleKey: 'layout:menu.entityTypes',
    descriptionKey: 'layout:menuDescriptions.entityTypes',
    component: EntityManager,
    Icon: ClipboardDocumentListIcon,
    isProtected: true,
    isSidebar: true,
    sideboardOrder: 4,
    sidebarGroup: 'configuration'
  },
  {
    path: '/entity-types/new',
    titleKey: 'entityBuilder:addEntity',
    component: Builder,
    Icon: IdentificationIcon,
    isProtected: true,
    isSidebar: false
  },
  {
    path: '/entities',
    titleKey: 'layout:menu.entities',
    descriptionKey: 'layout:menuDescriptions.entities',
    component: PreReg,
    Icon: IdentificationIcon,
    isProtected: true,
    isSidebar: true,
    sideboardOrder: 6,
    sidebarGroup: 'management'
  },
  {
    path: '/entities/new',
    titleKey: 'layout:menu.registration',
    component: Registration,
    Icon: IdentificationIcon,
    isProtected: true,
    isSidebar: false
  },
  {
    path: '/entities/duplicates',
    titleKey: 'layout:menu.duplicates',
    component: DuplicateResults,
    Icon: IdentificationIcon,
    isProtected: true,
    isSidebar: false
  },
  {
    path: '/entities/duplicates/:duplicateId',
    titleKey: 'layout:menu.resolveDuplicates',
    component: Duplicate,
    Icon: IdentificationIcon,
    isProtected: true,
    isSidebar: false
  },
  {
    path: '/pseudonyms',
    titleKey: 'layout:menu.pseudonyms',
    component: SearchPsn,
    Icon: EyeSlashIcon,
    isProtected: true,
    isSidebar: true,
    sideboardOrder: 7,
    sidebarGroup: 'management'
  },
  {
    path: '/pseudonym-domains',
    titleKey: 'layout:menu.pseudonymDomains',
    component: DomainManager,
    Icon: ArchiveBoxIcon,
    isProtected: true,
    isSidebar: true,
    sideboardOrder: 3,
    sidebarGroup: 'configuration'
  },
  {
    path: '/pseudonyms/:domainName/:pseudonymId',
    titleKey: 'layout:menu.pseudonymDetails',
    component: PseudonymDetails,
    Icon: MagnifyingGlassIcon,
    isProtected: true,
    isSidebar: false
  },
  {
    path: '/pseudonyms/:pseudonymId',
    titleKey: 'layout:menu.pseudonymDetails',
    component: PseudonymDetails,
    Icon: MagnifyingGlassIcon,
    isProtected: true,
    isSidebar: false
  },
  {
    path: '/entities/:entityId/pseudonyms/:pseudonymId',
    titleKey: 'layout:menu.entityDetails',
    component: PseudonymDetails,
    Icon: MagnifyingGlassIcon,
    isProtected: true,
    isSidebar: false
  },
  {
    path: '/entities/:entityId',
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
