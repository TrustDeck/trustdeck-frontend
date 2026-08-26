import { Tree } from 'primereact/tree'
import { TreeNode } from 'primereact/treenode'
import { ProgressSpinner } from 'primereact/progressspinner'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { useTranslation } from 'react-i18next'
import IconActionButton from '../../core/components/common/IconActionButton'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

import Panel from '../../core/components/common/Panel'
import InheritanceIndicator from '../../core/components/common/InheritanceIndicator'
import Divider from '../../core/components/common/Divider'
import ConfirmDialog from '../../core/components/common/ConfirmDialog'
import PageHeader from '../../core/components/common/PageHeader'
import PrimaryButton from '../../core/components/form/buttons/PrimaryButton'
import DomainService from './services/DomainService'
import DomainOption from './components/DomainOption'
import useProjectStore from '../../core/stores/ProjectStore'
import { useTreeStateStore } from './stores/TreeStateStore'
import { CustomTreeNode } from './types/CustomTreeNode'
import useToastStore from '../../core/stores/ToastStore'
import { findNodeByKey, findNodeByLabel } from './utils/findNodeByKey'
import TrustDeck from '../../core/services/TrustDeck'
import type { Algorithm, Domain } from '../../core/types/Domain'
import { formatDateTime } from '../../core/utils/date'
import {
  CachedUserAccess,
  canUseDomainAction,
  getCurrentUserAccess
} from '../../core/services/PermissionCache'

type DomainDetailField = {
  key: string
  getValue: (domain: Domain) => unknown
  isInherited?: (domain: Domain) => boolean
}

const domainValue = (key: keyof Domain) => (domain: Domain) => domain[key]
const algorithmValue = (key: keyof Algorithm) => (domain: Domain) =>
  domain.algorithm?.[key]
const algorithmInherited = (domain: Domain) =>
  Boolean(domain.algorithmInherited)

const DOMAIN_DETAIL_FIELDS: DomainDetailField[] = [
  { key: 'name', getValue: domainValue('name') },
  { key: 'prefix', getValue: domainValue('prefix') },
  {
    key: 'projectAbbreviation',
    getValue: domainValue('projectAbbreviation')
  },
  { key: 'superDomainName', getValue: domainValue('superDomainName') },
  { key: 'description', getValue: domainValue('description') },
  {
    key: 'algorithm',
    getValue: algorithmValue('name'),
    isInherited: algorithmInherited
  },
  {
    key: 'alphabet',
    getValue: algorithmValue('alphabet'),
    isInherited: algorithmInherited
  },
  {
    key: 'pseudonymLength',
    getValue: algorithmValue('pseudonymLength'),
    isInherited: algorithmInherited
  },
  {
    key: 'randomAlgorithmDesiredSize',
    getValue: algorithmValue('randomAlgorithmDesiredSize'),
    isInherited: algorithmInherited
  },
  {
    key: 'randomAlgorithmDesiredSuccessProbability',
    getValue: algorithmValue('randomAlgorithmDesiredSuccessProbability'),
    isInherited: algorithmInherited
  },
  {
    key: 'multiplePsnAllowed',
    getValue: domainValue('multiplePsnAllowed'),
    isInherited: (domain) => Boolean(domain.multiplePsnAllowedInherited)
  },
  {
    key: 'paddingCharacter',
    getValue: algorithmValue('paddingCharacter'),
    isInherited: algorithmInherited
  },
  {
    key: 'addCheckDigit',
    getValue: algorithmValue('addCheckDigit'),
    isInherited: algorithmInherited
  },
  {
    key: 'lengthIncludesCheckDigit',
    getValue: algorithmValue('lengthIncludesCheckDigit'),
    isInherited: algorithmInherited
  },
  {
    key: 'validFrom',
    getValue: domainValue('validFrom'),
    isInherited: (domain) => Boolean(domain.validFromInherited)
  },
  {
    key: 'validTo',
    getValue: domainValue('validTo'),
    isInherited: (domain) => Boolean(domain.validToInherited)
  },
  { key: 'validityTime', getValue: domainValue('validityTime') },
  {
    key: 'enforceStartDateValidity',
    getValue: domainValue('enforceStartDateValidity'),
    isInherited: (domain) => Boolean(domain.enforceStartDateValidityInherited)
  },
  {
    key: 'enforceEndDateValidity',
    getValue: domainValue('enforceEndDateValidity'),
    isInherited: (domain) => Boolean(domain.enforceEndDateValidityInherited)
  },
  {
    key: 'consecutiveValueCounter',
    getValue: algorithmValue('consecutiveValueCounter'),
    isInherited: algorithmInherited
  },
  {
    key: 'saltLength',
    getValue: algorithmValue('saltLength'),
    isInherited: algorithmInherited
  },
  {
    key: 'salt',
    getValue: algorithmValue('salt'),
    isInherited: algorithmInherited
  }
]

type ViewMode = 'details' | 'edit' | 'create'
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

    const normalized = DomainService.normalizeGroup(
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

export default function DomainManager() {
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
  const [groupSearchQuery, setGroupSearchQuery] = useState('')
  const [groupPage, setGroupPage] = useState(0)
  const [groupPageSize, setGroupPageSize] = useState(5)
  const [permissionAccess, setPermissionAccess] =
    useState<CachedUserAccess | null>(null)

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
  }, [auth.user?.access_token, justCreated])

  const canCreateCompleteGroups = canUseDomainAction(
    permissionAccess,
    undefined,
    'domain:create-complete'
  )
  const canCreateGroups =
    canCreateCompleteGroups ||
    canUseDomainAction(permissionAccess, undefined, 'domain:create')

  const canEditCompleteGroup = useCallback(
    (groupName?: string) =>
      Boolean(
        groupName &&
          canUseDomainAction(
            permissionAccess,
            groupName,
            'domain:update-complete'
          )
      ),
    [permissionAccess]
  )

  const canEditGroup = useCallback(
    (groupName?: string) =>
      canEditCompleteGroup(groupName) ||
      Boolean(
        groupName &&
          canUseDomainAction(permissionAccess, groupName, 'domain:update')
      ),
    [canEditCompleteGroup, permissionAccess]
  )

  const canDeleteGroup = useCallback(
    (groupName?: string) =>
      Boolean(
        groupName &&
          canUseDomainAction(permissionAccess, groupName, 'domain:delete')
      ),
    [permissionAccess]
  )

  const normalizedGroupSearchQuery = groupSearchQuery.trim().toLowerCase()
  const filteredGroups = groups.filter((group) =>
    [group.name, group.prefix, group.superDomainName]
      .filter(Boolean)
      .some((value) =>
        String(value).toLowerCase().includes(normalizedGroupSearchQuery)
      )
  )
  const groupPageCount = Math.max(
    1,
    Math.ceil(filteredGroups.length / groupPageSize)
  )
  const visibleGroups = filteredGroups.slice(
    groupPage * groupPageSize,
    (groupPage + 1) * groupPageSize
  )

  useEffect(() => {
    setGroupPage(0)
  }, [groupPageSize, groupSearchQuery])

  useEffect(() => {
    if (groupPage >= groupPageCount) setGroupPage(groupPageCount - 1)
  }, [groupPage, groupPageCount])

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

  const fetchGroups = useCallback(async () => {
    if (auth.user?.access_token) {
      TrustDeck.instance().setToken(auth.user.access_token)
    }
    setIsLoading(true)
    try {
      const groupTree = await DomainService.getGroups(
        selectedProject?.abbreviation
      )
      const pendingNodes = useTreeStateStore
        .getState()
        .tree.filter((node) => {
          const stored = node.data?.stored
          return (
            String(node.key).startsWith('temporal') &&
            (!stored ||
              (typeof stored === 'object' && Object.keys(stored).length === 0))
          )
        })
      setTree([...(groupTree as CustomTreeNode[]), ...pendingNodes])
      const treeDomains = flattenTree(groupTree).flatMap((node) =>
        node.data?.raw ? [node.data.raw] : []
      )
      const readableGroups = await DomainService.getReadableGroups(
        selectedProject?.abbreviation
      )
      const refreshedGroups = mergeDomains(readableGroups, treeDomains)
      setGroups(refreshedGroups)
      return refreshedGroups
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
  }, [
    auth.user?.access_token,
    selectedProject?.abbreviation,
    setTree,
    showToast,
    t
  ])

  useEffect(() => {
    let active = true
    const createdName = justCreated
      ? findNodeByKey(useTreeStateStore.getState().tree, selectedNodeKey)?.label
      : ''

    void fetchGroups().then(async (refreshedGroups) => {
      if (!active || !justCreated || !createdName) return
      const createdDomain = refreshedGroups?.find(
        (domain) => domain.name === createdName
      )
      if (createdDomain) {
        let detailedDomain = createdDomain
        try {
          const complete = await DomainService.getGroup(createdName)
          detailedDomain = {
            ...createdDomain,
            ...complete,
            algorithm: complete.algorithm ?? createdDomain.algorithm,
            algorithmInherited:
              complete.algorithmInherited ?? createdDomain.algorithmInherited
          }
          if (!active) return
          setTree(
            hydrateGroupNode(
              useTreeStateStore.getState().tree,
              createdName,
              detailedDomain
            )
          )
        } catch {
          // The refreshed list remains usable when detailed access is unavailable.
        }
        setSelectedGroup(detailedDomain)
        setSelectedGroupName(createdDomain.name)
        setViewMode('details')
        setGroupOption('default')
      }
      setJustCreated(false)
    })

    return () => {
      active = false
    }
  }, [
    fetchGroups,
    justCreated,
    selectedNodeKey,
    setGroupOption,
    setJustCreated,
    setTree
  ])

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
        const complete = await DomainService.getGroup(groupName)
        // A user may be allowed to list complete hierarchy data but receive a
        // reduced per-domain view. Keep any algorithm data already available.
        setSelectedGroup({
          ...fallback,
          ...complete,
          algorithm: complete.algorithm ?? fallback?.algorithm,
          algorithmInherited:
            complete.algorithmInherited ?? fallback?.algorithmInherited
        })
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
    if (viewMode === 'create') {
      deleteNode(selectedNodeKey)
      setGroupOption('default')
      setViewMode('details')
    }
    setSelectedGroupName(groupName)
    setShowDeleteDialog(true)
  }

  const deleteSelectedGroup = async () => {
    if (!selectedGroupName || !canDeleteGroup(selectedGroupName)) return
    const accessToken = auth.user?.access_token
    if (!accessToken) {
      showToast({
        severity: 'error',
        summary: t('common:error'),
        detail: 'Your session has expired.',
        life: 4000
      })
      return
    }
    setIsDeleting(true)
    setShowDeleteDialog(false)
    try {
      TrustDeck.instance().setToken(accessToken)
      await DomainService.deleteGroup(selectedGroupName)
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

  const renderGroupRows = (items: Domain[]) => {
    if (items.length === 0) {
      return (
        <tr>
          <td className="px-5 py-4 text-base text-gray-500" colSpan={4}>
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
        <td className="px-5 py-4">
          <div className="flex justify-end gap-2">
            <IconActionButton
              title={t('groups:buttons.view')}
              stopPropagation
              onClick={() => selectGroup(group.name, 'details')}
            >
              <EyeIcon className="h-5 w-5" />
            </IconActionButton>
            {canEditGroup(group.name) && (
              <IconActionButton
                title={t('groups:buttons.edit')}
                stopPropagation
                onClick={() => handleEdit(group.name)}
              >
                <PencilSquareIcon className="h-5 w-5" />
              </IconActionButton>
            )}
            {canDeleteGroup(group.name) && (
              <IconActionButton
                title={t('groups:buttons.delete')}
                stopPropagation
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

  const formatValue = (key: string, value: unknown): string => {
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
          <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
            {selectedGroup.projectAbbreviation ?? '-'}
          </span>
        </div>
        <Divider />
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
          <table className="min-w-full text-base">
            <tbody>
              {visibleDetailFields.map(({ key, getValue, isInherited }) => {
                const inherited = Boolean(isInherited?.(selectedGroup))
                const value = getValue(selectedGroup)
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
                      className={`w-[42%] px-5 py-4 text-left text-base font-semibold ${
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
                            className="text-base"
                          />
                        )}
                      </span>
                    </th>
                    <td className="break-all px-5 py-4 text-base text-gray-900 dark:text-gray-100">
                      {formatValue(key, value)}
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
        destructive
      />

      <div className="td-page-shell">
        <PageHeader
          title={t('groups:headers.title')}
          description={t('groups:headers.subtitle')}
        />

        <div className="w-full space-y-8">
          <div className="space-y-4">
            <Panel className="w-full">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="td-group-panel-title">
                  {t('groups:headers.left')}
                </h2>
                {canCreateGroups && (
                  <PrimaryButton
                    label={t('groups:buttons.addGroups')}
                    icon={<PlusIcon className="h-5 w-5" />}
                    iconPos="left"
                    onClick={handleNewGroup}
                  />
                )}
              </div>
              <Divider />
              <label className="mb-4 block">
                <span className="td-field-label mb-1 block">
                  {t('groups:crud.searchLabel')}
                </span>
                <div className="relative">
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={groupSearchQuery}
                    onChange={(event) => setGroupSearchQuery(event.target.value)}
                    placeholder={t('groups:crud.searchPlaceholder')}
                    className="h-11 w-full rounded-lg border border-color-light-gray bg-white pl-10 pr-3 text-base text-gray-900 outline-none transition focus:border-color-blue focus:ring-1 focus:ring-color-blue dark:bg-slate-900 dark:text-gray-100"
                  />
                </div>
              </label>
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <ProgressSpinner style={{ width: '60px', height: '60px' }} />
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
                  <table className="w-full table-fixed text-base">
                    <thead className="bg-gray-50 text-left text-base font-semibold text-gray-700 dark:bg-slate-800 dark:text-gray-200">
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
                        <th className="px-5 py-4 text-right">
                          {t('groups:crud.table.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {renderGroupRows(visibleGroups)}
                    </tbody>
                  </table>
                </div>
              )}
              {!isLoading && filteredGroups.length > 0 && (
                <div className="grid grid-cols-1 items-center gap-4 px-5 py-4 sm:grid-cols-[1fr_auto_1fr]">
                  {groupPageCount > 1 && (
                    <div className="flex items-center justify-self-center gap-3 sm:col-start-2">
                      <button
                        type="button"
                        title={t('search:pagination.previous')}
                        aria-label={t('search:pagination.previous')}
                        onClick={() =>
                          setGroupPage((page) => Math.max(0, page - 1))
                        }
                        disabled={groupPage === 0}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-color-blue text-color-blue transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
                      >
                        <ChevronLeftIcon className="h-5 w-5" />
                      </button>
                      <span className="text-base font-medium text-gray-700 dark:text-gray-200">
                        {t('search:pagination.pageOf', {
                          page: groupPage + 1,
                          pages: groupPageCount
                        })}
                      </span>
                      <button
                        type="button"
                        title={t('search:pagination.next')}
                        aria-label={t('search:pagination.next')}
                        onClick={() =>
                          setGroupPage((page) =>
                            Math.min(groupPageCount - 1, page + 1)
                          )
                        }
                        disabled={groupPage >= groupPageCount - 1}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-color-blue text-color-blue transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
                      >
                        <ChevronRightIcon className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                  <label className="flex items-center justify-self-end gap-2 text-base font-medium text-gray-700 dark:text-gray-200 sm:col-start-3">
                    <span>{t('search:pagination.resultsPerPage')}</span>
                    <select
                      value={groupPageSize}
                      onChange={(event) =>
                        setGroupPageSize(Number(event.target.value))
                      }
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-base dark:border-slate-700 dark:bg-slate-950 dark:text-gray-100"
                    >
                      {[5, 10, 20, 50, 100].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </Panel>
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
                  className="td-group-hierarchy-tree"
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
                  <DomainOption
                    onClose={closeEditor}
                    accessToken={auth.user?.access_token}
                    useCompleteEndpoint={
                      viewMode === 'create'
                        ? canCreateCompleteGroups
                        : canEditCompleteGroup(selectedGroupName)
                    }
                  />
                </div>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </>
  )
}
