import { Tree } from 'primereact/tree'
import { TreeNode } from 'primereact/treenode'
import { ProgressSpinner } from 'primereact/progressspinner'
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { useTranslation } from 'react-i18next'
import {
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

import Panel from '../../core/components/common/Panel'
import InheritanceIndicator from '../../core/components/common/InheritanceIndicator'
import Divider from '../../core/components/common/Divider'
import ConfirmDialog from '../../core/components/common/ConfirmDialog'
import PageHeader from '../../core/components/common/PageHeader'
import PrimaryButton from '../../core/components/form/buttons/PrimaryButton'
import GroupService from './service/GroupService'
import GroupOption from './components/GroupOption'
import useProjectStore from '../../core/stores/ProjectStore'
import { useTreeStateStore } from './stores/TreeStateStore'
import { CustomTreeNode } from './types/CustomTreeNode'
import useToastStore from '../../core/stores/ToastStore'
import { findNodeByKey, findNodeByLabel } from './utils/findNodeByKey'
import TrustDeck from '../../core/services/TrustDeck'
import type { Domain } from '../../core/types/Domain'
import { formatDateTime } from '../../core/utils/date'
import {
  CachedUserAccess,
  canUseDomainAction,
  getCurrentUserAccess
} from '../../core/services/PermissionCache'

type DomainDetailField = {
  key: keyof Domain
  inheritedKey?: keyof Domain
}

const DOMAIN_DETAIL_FIELDS: DomainDetailField[] = [
  { key: 'name' },
  { key: 'prefix' },
  { key: 'superDomainName' },
  { key: 'description' },
  { key: 'algorithm', inheritedKey: 'algorithmInherited' },
  { key: 'alphabet', inheritedKey: 'alphabetInherited' },
  { key: 'pseudonymLength', inheritedKey: 'pseudonymLengthInherited' },
  {
    key: 'randomAlgorithmDesiredSize',
    inheritedKey: 'randomAlgorithmDesiredSizeInherited'
  },
  {
    key: 'randomAlgorithmDesiredSuccessProbability',
    inheritedKey: 'randomAlgorithmDesiredSuccessProbabilityInherited'
  },
  { key: 'multiplePsnAllowed', inheritedKey: 'multiplePsnAllowedInherited' },
  { key: 'paddingCharacter', inheritedKey: 'paddingCharacterInherited' },
  { key: 'addCheckDigit', inheritedKey: 'addCheckDigitInherited' },
  {
    key: 'lengthIncludesCheckDigit',
    inheritedKey: 'lengthIncludesCheckDigitInherited'
  },
  { key: 'validFrom', inheritedKey: 'validFromInherited' },
  { key: 'validTo', inheritedKey: 'validToInherited' },
  { key: 'validityTime' },
  {
    key: 'enforceStartDateValidity',
    inheritedKey: 'enforceStartDateValidityInherited'
  },
  {
    key: 'enforceEndDateValidity',
    inheritedKey: 'enforceEndDateValidityInherited'
  },
  { key: 'consecutiveValueCounter' },
  { key: 'saltLength' },
  { key: 'salt' }
]

type ViewMode = 'details' | 'edit' | 'create'
type GroupScope = 'currentProject' | 'unassigned' | 'otherProject'
type IconActionButtonProps = {
  title: string
  onClick: () => void
  children: ReactNode
  variant?: 'primary' | 'danger'
  disabled?: boolean
}

function IconActionButton({
  title,
  onClick,
  children,
  variant = 'primary',
  disabled = false
}: IconActionButtonProps) {
  const colorClasses =
    variant === 'danger'
      ? 'border-color-coral text-color-coral hover:bg-red-50 dark:hover:bg-red-950'
      : 'border-color-blue text-color-blue hover:bg-blue-50 dark:hover:bg-slate-800'

  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      disabled={disabled}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border-2 bg-white transition disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-950 ${colorClasses}`}
    >
      {children}
    </button>
  )
}

function findPathToLabel(
  nodes: CustomTreeNode[],
  label: string,
  path: string[] = []
): string[] | null {
  for (const node of nodes) {
    const currentPath = [...path, String(node.key)]
    if (node.label === label) return currentPath
    if (Array.isArray(node.children)) {
      const childPath = findPathToLabel(
        node.children as CustomTreeNode[],
        label,
        currentPath
      )
      if (childPath) return childPath
    }
  }
  return null
}

function flattenTree(nodes: CustomTreeNode[]): CustomTreeNode[] {
  const out: CustomTreeNode[] = []
  const walk = (node: CustomTreeNode) => {
    out.push(node)
    if (Array.isArray(node.children)) {
      ;(node.children as CustomTreeNode[]).forEach(walk)
    }
  }
  nodes.forEach(walk)
  return out
}

function mergeDomains(primary: Domain[], fallback: Domain[]): Domain[] {
  const map = new Map<string, Domain>()
  fallback.forEach((domain) => {
    if (domain.name) map.set(domain.name, domain)
  })
  primary.forEach((domain) => {
    if (domain.name) {
      map.set(domain.name, { ...map.get(domain.name), ...domain })
    }
  })
  return Array.from(map.values()).sort((a, b) =>
    (a.name ?? '').localeCompare(b.name ?? '')
  )
}

function hydrateGroupNode(
  nodes: CustomTreeNode[],
  groupName: string,
  group: Domain
): CustomTreeNode[] {
  return nodes.map((node) => {
    const children = Array.isArray(node.children)
      ? hydrateGroupNode(node.children as CustomTreeNode[], groupName, group)
      : node.children

    if (node.label !== groupName) return { ...node, children }

    const normalized = GroupService.normalizeGroup(
      group,
      group.superDomainName ?? null
    )
    return {
      ...node,
      label: group.name ?? node.label,
      hasChanges: false,
      data: {
        stored: normalized,
        temporal: { ...normalized },
        raw: group
      },
      children
    }
  })
}

export default function GroupManager() {
  const {
    tree,
    setTree,
    setGroupOption,
    newNode,
    selectedNodeKey,
    setSelectedNodeKey,
    expandedKeys,
    setExpandedKeys,
    deleteNode
  } = useTreeStateStore()

  const auth = useAuth()
  const { justCreated, setJustCreated, selectedProject } = useProjectStore()
  const { t, i18n } = useTranslation(['groups', 'common'])
  const showToast = useToastStore((state) => state.show)

  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [groups, setGroups] = useState<Domain[]>([])
  const [selectedGroup, setSelectedGroup] = useState<Domain | null>(null)
  const [selectedGroupName, setSelectedGroupName] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('details')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [permissionAccess, setPermissionAccess] =
    useState<CachedUserAccess | null>(null)
  const [currentProjectGroupNames, setCurrentProjectGroupNames] = useState<
    Set<string>
  >(new Set())
  const [allAssignedGroupNames, setAllAssignedGroupNames] = useState<
    Set<string>
  >(new Set())

  useEffect(() => {
    let active = true
    if (!auth.user?.access_token) {
      setPermissionAccess(null)
      return () => {
        active = false
      }
    }

    TrustDeck.instance().setToken(auth.user.access_token)
    getCurrentUserAccess(true)
      .then((access) => {
        if (active) setPermissionAccess(access)
      })
      .catch((error) => {
        console.warn('Could not load current-user group permissions.', error)
        if (active) setPermissionAccess(null)
      })

    return () => {
      active = false
    }
  }, [auth.user?.access_token])

  const canCreateGroups =
    canUseDomainAction(permissionAccess, undefined, 'domain:create') ||
    canUseDomainAction(permissionAccess, undefined, 'domain:create-complete')

  const canEditGroup = useCallback(
    (groupName?: string) =>
      Boolean(
        groupName &&
        (canUseDomainAction(permissionAccess, groupName, 'domain:update') ||
          canUseDomainAction(
            permissionAccess,
            groupName,
            'domain:update-complete'
          ))
      ),
    [permissionAccess]
  )

  const canDeleteGroup = useCallback(
    (groupName?: string) =>
      Boolean(
        groupName &&
        canUseDomainAction(permissionAccess, groupName, 'domain:delete')
      ),
    [permissionAccess]
  )

  const nodeTemplate = useCallback(
    (node: TreeNode) => {
      const label = node.label ?? ''
      const maxLength = 18
      const isLong = label.length > maxLength
      const shortLabel = isLong ? `${label.slice(0, maxLength)}…` : label
      const isSelected = String(node.key) === String(selectedNodeKey)
      const hasChanges = (node as CustomTreeNode).hasChanges
      const stored = (node as CustomTreeNode).data?.stored
      const isTemporal =
        stored === undefined ||
        (Array.isArray(stored)
          ? stored.length === 0
          : stored && typeof stored === 'object'
            ? Object.keys(stored).length === 0
            : false)

      let buttonStyle = ''
      if (hasChanges) {
        buttonStyle = isSelected
          ? 'bg-color-coral hover:bg-color-coral/80 border-color-coral text-white border-dashed'
          : 'bg-white hover:bg-color-coral/80 border-color-coral text-color-coral border-dashed'
      } else if (isSelected) {
        buttonStyle = isTemporal
          ? 'bg-blue-900 hover:bg-blue-900/80 border-blue-900 text-white border-dashed'
          : 'bg-blue-900 hover:bg-blue-900/80 border-blue-900 text-white border-solid'
      } else {
        buttonStyle = isTemporal
          ? 'bg-color-coral hover:bg-color-coral/80 border-color-coral text-color-coral border-dashed'
          : 'bg-white hover:bg-blue-900/80 border-blue-900 text-blue-900 hover:text-white border-solid'
      }

      return (
        <div className="group relative inline-block">
          <button
            type="button"
            data-group-tree-key={String(node.key)}
            className={`flex w-[180px] items-center justify-center overflow-hidden whitespace-nowrap text-ellipsis rounded-md border-2 px-4 py-2 text-center text-base transition-colors duration-200 ${buttonStyle}`}
          >
            <span className="font-bold">{shortLabel}</span>
          </button>
          {isLong && (
            <div className="pointer-events-none absolute left-0 top-full z-50 mt-1 w-max max-w-xs rounded-md border border-gray-300 bg-white p-2 opacity-0 shadow-lg transition-opacity duration-300 group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-900">
              <span className="font-bold">{label}</span>
            </div>
          )}
        </div>
      )
    },
    [selectedNodeKey]
  )

  const fetchAssignmentInfo = useCallback(async () => {
    const currentProject = selectedProject?.abbreviation
    const currentProjectGroups = new Set<string>()
    const allProjectGroups = new Set<string>()

    try {
      if (currentProject) {
        const projectTypes = await TrustDeck.instance().getProjectEntities(
          '*',
          currentProject
        )
        projectTypes.forEach((type) => {
          if (type.associatedDomainName) {
            currentProjectGroups.add(type.associatedDomainName)
            allProjectGroups.add(type.associatedDomainName)
          }
        })
      }
    } catch (error) {
      console.warn('Could not load project-assigned groups.', error)
    }

    try {
      const projects = await TrustDeck.instance().getProjects()
      await Promise.all(
        projects.map(async (project) => {
          const projectName = project.abbreviation
          if (!projectName) return
          try {
            const projectTypes = await TrustDeck.instance().getProjectEntities(
              '*',
              projectName
            )
            projectTypes.forEach((type) => {
              if (type.associatedDomainName) {
                allProjectGroups.add(type.associatedDomainName)
              }
            })
          } catch {
            // Project-specific entity-type access may be restricted.
          }
        })
      )
    } catch {
      // Project listing may be restricted.
    }

    setCurrentProjectGroupNames(currentProjectGroups)
    setAllAssignedGroupNames(allProjectGroups)
  }, [selectedProject?.abbreviation])

  const fetchGroups = useCallback(async () => {
    setIsLoading(true)
    try {
      const groupTree = await GroupService.getGroups()
      setTree(groupTree as CustomTreeNode[])
      const treeDomains = flattenTree(groupTree).flatMap((node) =>
        node.data?.raw ? [node.data.raw] : []
      )
      const readableGroups = await GroupService.getReadableGroups()
      setGroups(mergeDomains(readableGroups, treeDomains))
      await fetchAssignmentInfo()
    } catch (error) {
      console.error('Failed to load groups.', error)
      showToast({
        severity: 'error',
        summary: t('groups:crud.loadFailedSummary'),
        detail: t('groups:crud.loadFailedDetail'),
        life: 4000
      })
    } finally {
      setIsLoading(false)
    }
  }, [fetchAssignmentInfo, setTree, showToast, t])

  useEffect(() => {
    fetchGroups()
    if (justCreated) setJustCreated(false)
  }, [fetchGroups, justCreated, setJustCreated])

  const revealGroupInHierarchy = useCallback(
    (groupName: string) => {
      const path = findPathToLabel(tree, groupName)
      if (!path?.length) return

      const selectedKey = path[path.length - 1]!
      setSelectedNodeKey(selectedKey)
      const nextExpanded = { ...useTreeStateStore.getState().expandedKeys }
      path.slice(0, -1).forEach((key) => {
        nextExpanded[key] = true
      })
      setExpandedKeys(nextExpanded)

      window.requestAnimationFrame(() => {
        const target = Array.from(
          document.querySelectorAll<HTMLElement>('[data-group-tree-key]')
        ).find((element) => element.dataset.groupTreeKey === selectedKey)
        target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      })
    },
    [setExpandedKeys, setSelectedNodeKey, tree]
  )

  const selectGroup = useCallback(
    async (groupName: string, mode: ViewMode = 'details') => {
      revealGroupInHierarchy(groupName)

      setSelectedGroupName(groupName)
      setViewMode(mode)
      setGroupOption(mode === 'edit' ? 'edit' : 'default')

      const fallback = groups.find((group) => group.name === groupName) ?? null
      setSelectedGroup(fallback)
      try {
        const complete = await GroupService.getGroup(groupName)
        setSelectedGroup(complete)
        if (mode === 'edit') {
          const currentTree = useTreeStateStore.getState().tree
          setTree(hydrateGroupNode(currentTree, groupName, complete))
        }
      } catch {
        // Keep the reduced readable result when complete view is unavailable.
      }
    },
    [groups, revealGroupInHierarchy, setGroupOption, setTree]
  )

  useEffect(() => {
    if (selectedGroupName) revealGroupInHierarchy(selectedGroupName)
  }, [revealGroupInHierarchy, selectedGroupName])

  const handleTreeNodeClick = (nodeKey: string) => {
    const node = findNodeByKey(tree, nodeKey)
    if (node?.label) selectGroup(node.label, 'details')
  }

  const handleNewGroup = () => {
    if (!canCreateGroups) return
    newNode()
    setViewMode('create')
    setGroupOption('registration')
    setSelectedGroup(null)
    setSelectedGroupName('')
  }

  const handleEdit = (groupName: string) => {
    if (!canEditGroup(groupName)) return
    selectGroup(groupName, 'edit')
  }

  const closeEditor = () => {
    setViewMode('details')
    setGroupOption('default')
    fetchGroups()
  }

  const handleDelete = (groupName: string) => {
    if (!canDeleteGroup(groupName)) return
    setSelectedGroupName(groupName)
    setShowDeleteDialog(true)
  }

  const deleteSelectedGroup = async () => {
    if (!selectedGroupName || !canDeleteGroup(selectedGroupName)) return
    setIsDeleting(true)
    setShowDeleteDialog(false)
    try {
      await GroupService.deleteGroup(selectedGroupName)
      const node = findNodeByLabel(tree, selectedGroupName)
      if (node) deleteNode(node.key)
      setSelectedGroup(null)
      setSelectedGroupName('')
      setGroupOption('default')
      setViewMode('details')
      await fetchGroups()
      showToast({
        severity: 'success',
        summary: t('groups:crud.deleteSuccessSummary'),
        detail: t('groups:crud.deleteSuccessDetail'),
        life: 4000
      })
    } catch (error) {
      console.error(error)
      showToast({
        severity: 'error',
        summary: t('groups:crud.deleteFailedSummary'),
        detail: t('groups:crud.deleteFailedDetail'),
        life: 4000
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const getGroupScope = useCallback(
    (groupName?: string): GroupScope => {
      if (!groupName) return 'unassigned'
      if (currentProjectGroupNames.has(groupName)) return 'currentProject'
      if (!allAssignedGroupNames.has(groupName)) return 'unassigned'
      return 'otherProject'
    },
    [allAssignedGroupNames, currentProjectGroupNames]
  )

  const groupedDomains = useMemo(() => {
    const currentProject: Domain[] = []
    const unassigned: Domain[] = []
    const otherProject: Domain[] = []

    groups.forEach((group) => {
      const scope = getGroupScope(group.name)
      if (scope === 'currentProject') currentProject.push(group)
      else if (scope === 'unassigned') unassigned.push(group)
      else otherProject.push(group)
    })

    return { currentProject, unassigned, otherProject }
  }, [getGroupScope, groups])

  const renderScopeBadge = (group: Domain) => {
    const scope = getGroupScope(group.name)
    const label =
      scope === 'currentProject'
        ? t('groups:crud.scopeCurrentProject')
        : scope === 'unassigned'
          ? t('groups:crud.scopeUnassigned')
          : t('groups:crud.scopeOtherProject')
    const className =
      scope === 'currentProject'
        ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-200'
        : scope === 'unassigned'
          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200'
          : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-200'

    return (
      <span
        className={`rounded-full px-3 py-1 text-sm font-semibold ${className}`}
      >
        {label}
      </span>
    )
  }

  const renderGroupRows = (items: Domain[]) => {
    if (items.length === 0) {
      return (
        <tr>
          <td className="px-5 py-4 text-lg text-gray-500" colSpan={5}>
            {t('groups:crud.noGroupsInSection')}
          </td>
        </tr>
      )
    }

    return items.map((group) => (
      <tr
        key={group.name}
        role="button"
        tabIndex={0}
        onClick={() => selectGroup(group.name, 'details')}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            selectGroup(group.name, 'details')
          }
        }}
        className={`cursor-pointer border-t border-gray-200 text-lg transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 dark:border-slate-700 dark:hover:bg-slate-800 ${
          selectedGroupName === group.name
            ? 'bg-blue-50 dark:bg-blue-950/30'
            : ''
        }`}
      >
        <td className="px-5 py-4 font-semibold text-gray-900 dark:text-gray-100">
          {group.name}
        </td>
        <td className="px-5 py-4">{group.prefix ?? '-'}</td>
        <td className="px-5 py-4">{group.superDomainName ?? '-'}</td>
        <td className="px-5 py-4">{renderScopeBadge(group)}</td>
        <td className="px-5 py-4">
          <div className="flex justify-end gap-2">
            <IconActionButton
              title={t('groups:buttons.view')}
              onClick={() => selectGroup(group.name, 'details')}
            >
              <EyeIcon className="h-5 w-5" />
            </IconActionButton>
            {canEditGroup(group.name) && (
              <IconActionButton
                title={t('groups:buttons.edit')}
                onClick={() => handleEdit(group.name)}
              >
                <PencilSquareIcon className="h-5 w-5" />
              </IconActionButton>
            )}
            {canDeleteGroup(group.name) && (
              <IconActionButton
                title={t('groups:buttons.delete')}
                onClick={() => handleDelete(group.name)}
                variant="danger"
              >
                <TrashIcon className="h-5 w-5" />
              </IconActionButton>
            )}
          </div>
        </td>
      </tr>
    ))
  }

  const renderScopeSection = (title: string, items: Domain[]) => (
    <>
      <tr className="border-t border-gray-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
        <th
          colSpan={5}
          className="px-5 py-3 text-left text-base font-bold text-blue-900 dark:text-blue-200"
        >
          {title}
        </th>
      </tr>
      {renderGroupRows(items)}
    </>
  )

  const formatValue = (key: keyof Domain, value: unknown): string => {
    if (value === null || value === undefined || value === '') return '—'
    if (key === 'validFrom' || key === 'validTo') {
      return formatDateTime(String(value)) || '—'
    }
    if (key === 'randomAlgorithmDesiredSuccessProbability') {
      const probability = Number(value)
      if (Number.isFinite(probability)) {
        const percentage = new Intl.NumberFormat(i18n.language || undefined, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 20
        }).format(probability * 100)
        return `${percentage}%`
      }
    }
    if (typeof value === 'boolean') {
      return value ? t('common:yes') : t('common:no')
    }
    if (typeof value === 'number') {
      return new Intl.NumberFormat(i18n.language || undefined, {
        maximumFractionDigits: 20
      }).format(value)
    }
    if (typeof value === 'object' && value !== null)
      return JSON.stringify(value)
    return String(value)
  }

  const visibleDetailFields = selectedGroup ? DOMAIN_DETAIL_FIELDS : []

  const renderDetails = () => {
    if (!selectedGroup) {
      return (
        <p className="py-8 text-center text-base text-gray-500">
          {t('groups:crud.selectGroupHint')}
        </p>
      )
    }

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="td-group-panel-title">{selectedGroup.name}</h2>
            <p className="td-section-subtitle">
              {t('groups:crud.detailSubtitle')}
            </p>
          </div>
          {renderScopeBadge(selectedGroup)}
        </div>
        <Divider />
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
          <table className="min-w-full text-lg">
            <tbody>
              {visibleDetailFields.map(({ key, inheritedKey }) => {
                const inherited = Boolean(
                  inheritedKey && selectedGroup[inheritedKey]
                )
                return (
                  <tr
                    key={key}
                    className={`border-b border-gray-200 last:border-b-0 dark:border-slate-700 ${
                      inherited
                        ? 'bg-blue-50/70 dark:bg-blue-950/30'
                        : 'bg-white dark:bg-slate-900'
                    }`}
                  >
                    <th
                      className={`w-[42%] px-5 py-4 text-left text-lg font-semibold ${
                        inherited
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-gray-700 dark:text-gray-200'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        {t(`groups:details.${key}`)}
                        {inherited && (
                          <InheritanceIndicator
                            title={t('groups:inputs.inheritedReadonly')}
                            className="text-lg"
                          />
                        )}
                      </span>
                    </th>
                    <td className="break-all px-5 py-4 text-xl text-gray-900 dark:text-gray-100">
                      {formatValue(key, selectedGroup[key])}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <>
      <ConfirmDialog
        visible={showDeleteDialog}
        message={t('groups:messages.deleteConfirmation')}
        header={t('groups:messages.confirmDelete')}
        label={t('groups:buttons.yesDelete')}
        rejectLabel={t('groups:buttons.noDelete')}
        onHide={() => setShowDeleteDialog(false)}
        onAccept={() => deleteSelectedGroup()}
      />

      <div className="td-page-shell">
        <PageHeader
          title={t('groups:headers.title')}
          description={t('groups:headers.subtitle')}
        />

        <div className="w-full space-y-8">
          <div className="space-y-4">
            <Panel className="w-full">
              <h2 className="td-group-panel-title">
                {t('groups:headers.left')}
              </h2>
              <Divider />
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <ProgressSpinner style={{ width: '60px', height: '60px' }} />
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
                  <table className="w-full table-fixed text-lg">
                    <colgroup>
                      <col className="w-[24%]" />
                      <col className="w-[14%]" />
                      <col className="w-[22%]" />
                      <col className="w-[20%]" />
                      <col className="w-[20%]" />
                    </colgroup>
                    <thead className="bg-gray-50 text-left text-lg font-semibold text-gray-700 dark:bg-slate-800 dark:text-gray-200">
                      <tr>
                        <th className="px-5 py-4">
                          {t('groups:crud.table.name')}
                        </th>
                        <th className="px-5 py-4">
                          {t('groups:crud.table.prefix')}
                        </th>
                        <th className="px-5 py-4">
                          {t('groups:crud.table.parent')}
                        </th>
                        <th className="px-5 py-4">
                          {t('groups:crud.table.assignment')}
                        </th>
                        <th className="px-5 py-4 text-right">
                          {t('groups:crud.table.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {renderScopeSection(
                        t('groups:crud.assignedToCurrentProject'),
                        groupedDomains.currentProject
                      )}
                      {renderScopeSection(
                        t('groups:crud.notAssignedToAnyProject'),
                        groupedDomains.unassigned
                      )}
                      {groupedDomains.otherProject.length > 0 &&
                        renderScopeSection(
                          t('groups:crud.assignedElsewhere'),
                          groupedDomains.otherProject
                        )}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            {canCreateGroups && (
              <div className="flex justify-center">
                <PrimaryButton
                  label={t('groups:buttons.addGroups')}
                  onClick={handleNewGroup}
                />
              </div>
            )}
          </div>

          <div className="grid w-full gap-6 xl:grid-cols-[minmax(20rem,0.8fr)_minmax(0,1.7fr)]">
            <Panel className="w-full">
              <h2 className="td-group-panel-title">
                {t('groups:crud.hierarchyTitle')}
              </h2>
              <Divider />
              <div className="overflow-x-auto">
                <Tree
                  value={tree}
                  dragdropScope="groupManagerTree"
                  nodeTemplate={nodeTemplate}
                  expandedKeys={expandedKeys}
                  onToggle={(event) => setExpandedKeys(event.value)}
                  onNodeClick={(event) =>
                    handleTreeNodeClick(String(event.node.key))
                  }
                />
              </div>
            </Panel>

            <Panel className="relative w-full">
              {isDeleting && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-slate-950/70">
                  <ProgressSpinner style={{ width: '60px', height: '60px' }} />
                </div>
              )}

              {viewMode === 'details' ? (
                renderDetails()
              ) : (
                <div className="mx-auto w-full max-w-5xl space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="td-section-title">
                        {viewMode === 'create'
                          ? t('groups:crud.createTitle')
                          : t('groups:crud.editTitle')}
                      </h2>
                      <p className="td-section-subtitle">
                        {viewMode === 'create'
                          ? t('groups:crud.createSubtitle')
                          : t('groups:crud.editSubtitle')}
                      </p>
                    </div>
                    <button
                      type="button"
                      title={
                        viewMode === 'edit'
                          ? t('groups:buttons.closeEditView')
                          : t('groups:buttons.closeCreateView')
                      }
                      aria-label={
                        viewMode === 'edit'
                          ? t('groups:buttons.closeEditView')
                          : t('groups:buttons.closeCreateView')
                      }
                      onClick={closeEditor}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border-2 border-color-blue bg-white text-color-blue transition hover:bg-blue-50 dark:bg-slate-950 dark:hover:bg-slate-800"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                  <Divider />
                  <GroupOption onClose={closeEditor} />
                </div>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </>
  )
}
