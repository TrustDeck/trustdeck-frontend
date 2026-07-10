import { Tree } from 'primereact/tree'
import { TreeNode } from 'primereact/treenode'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Panel from '../../core/components/common/Panel'
import Divider from '../../core/components/common/Divider'
import PrimaryOutlinedButton from '../../core/components/form/buttons/PrimaryOutlinedButton'
import PrimaryButton from '../../core/components/form/buttons/PrimaryButton.tsx'
import SecondaryOutlinedButton from '../../core/components/form/buttons/SecondaryOutlinedButton.tsx'
import GroupService from './service/GroupService'
import GroupOption from './components/GroupOption'
import { useTranslation } from 'react-i18next'
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { Dialog } from 'primereact/dialog'
import useProjectStore from '../../core/stores/ProjectStore'
import { useTreeStateStore } from './stores/TreeStateStore'
import { CustomTreeNode } from './types/CustomTreeNode'
import ConfirmDialog from '../../core/components/common/ConfirmDialog.tsx'
import useToastStore from '../../core/stores/ToastStore.ts'
import { findNodeByKey, findNodeByLabel } from './utils/findNodeByKey.ts'
import { ProgressSpinner } from 'primereact/progressspinner'
import TrustDeck from '../../core/services/TrustDeck.ts'
import type { Domain } from '../../core/types/Domain.ts'
import PageHeader from '../../core/components/common/PageHeader.tsx'

const DOMAIN_DETAIL_FIELDS: Array<keyof Domain> = [
  'name',
  'prefix',
  'validFrom',
  'validFromInherited',
  'validTo',
  'validToInherited',
  'validityTime',
  'enforceStartDateValidity',
  'enforceStartDateValidityInherited',
  'enforceEndDateValidity',
  'enforceEndDateValidityInherited',
  'algorithm',
  'algorithmInherited',
  'alphabet',
  'alphabetInherited',
  'randomAlgorithmDesiredSize',
  'randomAlgorithmDesiredSizeInherited',
  'randomAlgorithmDesiredSuccessProbability',
  'randomAlgorithmDesiredSuccessProbabilityInherited',
  'multiplePsnAllowed',
  'multiplePsnAllowedInherited',
  'consecutiveValueCounter',
  'pseudonymLength',
  'pseudonymLengthInherited',
  'paddingCharacter',
  'paddingCharacterInherited',
  'addCheckDigit',
  'addCheckDigitInherited',
  'lengthIncludesCheckDigit',
  'lengthIncludesCheckDigitInherited',
  'salt',
  'saltLength',
  'description',
  'superDomainID',
  'superDomainName'
]

type ViewMode = 'details' | 'edit' | 'create'

type GroupScope = 'currentProject' | 'unassigned' | 'otherProject'

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
    if (domain.name) map.set(domain.name, { ...map.get(domain.name), ...domain })
  })
  return Array.from(map.values()).sort((a, b) =>
    (a.name ?? '').localeCompare(b.name ?? '')
  )
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
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

  const { justCreated, setJustCreated, selectedProject } = useProjectStore()
  const { t } = useTranslation()
  const showToast = useToastStore((state) => state.show)

  const [visible, setVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [groups, setGroups] = useState<Domain[]>([])
  const [selectedGroup, setSelectedGroup] = useState<Domain | null>(null)
  const [selectedGroupName, setSelectedGroupName] = useState<string>('')
  const [viewMode, setViewMode] = useState<ViewMode>('details')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [currentProjectGroupNames, setCurrentProjectGroupNames] = useState<Set<string>>(new Set())
  const [allAssignedGroupNames, setAllAssignedGroupNames] = useState<Set<string>>(new Set())

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
        <div className="relative inline-block group">
          <button
            type="button"
            className={`flex items-center px-4 py-2 rounded-md border-2 text-center justify-center
            w-[180px] overflow-hidden whitespace-nowrap text-ellipsis
            transition-colors duration-200 ${buttonStyle}`}
          >
            <span className="font-bold">{shortLabel}</span>
          </button>

          {isLong && (
            <div
              className="absolute left-0 top-full mt-1 p-2 bg-white border border-gray-300 rounded-md
              whitespace-normal w-max max-w-xs shadow-lg opacity-0 group-hover:opacity-100
              pointer-events-none transition-opacity duration-300 z-50"
            >
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
        const projectTypes = await TrustDeck.instance().getProjectEntities('*', currentProject)
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
            const projectTypes = await TrustDeck.instance().getProjectEntities('*', projectName)
            projectTypes.forEach((type) => {
              if (type.associatedDomainName) allProjectGroups.add(type.associatedDomainName)
            })
          } catch {
            // Project-specific type access may be restricted. Keep the information we can see.
          }
        })
      )
    } catch {
      // Project listing may be restricted. The current-project assignment information is still useful.
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
    if (justCreated) setVisible(true)
    setJustCreated(false)
  }, [fetchGroups, justCreated, setJustCreated])

  const selectGroup = useCallback(
    async (groupName: string, mode: ViewMode = 'details') => {
      const node = findNodeByLabel(tree, groupName)
      if (node) {
        setSelectedNodeKey(node.key)
      }
      setSelectedGroupName(groupName)
      setViewMode(mode)
      setGroupOption(mode === 'edit' ? 'edit' : 'default')

      const fallback = groups.find((group) => group.name === groupName) ?? null
      setSelectedGroup(fallback)
      try {
        const complete = await GroupService.getGroup(groupName)
        setSelectedGroup(complete)
      } catch {
        // Keep reduced search result when complete view is not available.
      }
    },
    [groups, setGroupOption, setSelectedNodeKey, tree]
  )

  const handleTreeNodeClick = (nodeKey: string) => {
    const node = findNodeByKey(tree, nodeKey)
    const groupName = node?.label
    if (!groupName) return
    selectGroup(groupName, 'details')
  }

  const handleNewGroup = () => {
    newNode()
    setViewMode('create')
    setGroupOption('registration')
    setSelectedGroup(null)
    setSelectedGroupName('')
  }

  const handleEdit = (groupName: string) => {
    selectGroup(groupName, 'edit')
  }

  const handleDelete = (groupName: string) => {
    setSelectedGroupName(groupName)
    setShowDeleteDialog(true)
  }

  const deleteSelectedGroup = async () => {
    if (!selectedGroupName) return
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
        ? 'bg-green-100 text-green-800'
        : scope === 'unassigned'
          ? 'bg-blue-100 text-blue-800'
          : 'bg-gray-100 text-gray-700'
    return (
      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${className}`}>
        {label}
      </span>
    )
  }

  const renderGroupRows = (items: Domain[]) => {
    if (items.length === 0) {
      return (
        <tr>
          <td className="px-4 py-3 text-sm text-gray-500" colSpan={5}>
            {t('groups:crud.noGroupsInSection')}
          </td>
        </tr>
      )
    }

    return items.map((group) => (
      <tr
        key={group.name}
        className={`border-t hover:bg-gray-50 ${selectedGroupName === group.name ? 'bg-blue-50' : ''}`}
      >
        <td className="px-4 py-3 font-semibold text-blue-900">
          <button
            type="button"
            className="text-left hover:underline"
            onClick={() => selectGroup(group.name, 'details')}
          >
            {group.name}
          </button>
        </td>
        <td className="px-4 py-3">{group.prefix ?? '-'}</td>
        <td className="px-4 py-3">{group.superDomainName ?? '-'}</td>
        <td className="px-4 py-3">{renderScopeBadge(group)}</td>
        <td className="px-4 py-3">
          <div className="flex gap-2 justify-end">
            <PrimaryOutlinedButton
              label={t('groups:buttons.view')}
              onClick={() => selectGroup(group.name, 'details')}
            />
            <PrimaryOutlinedButton
              label={t('groups:buttons.edit')}
              onClick={() => handleEdit(group.name)}
            />
            <SecondaryOutlinedButton
              label={t('groups:buttons.delete')}
              onClick={() => handleDelete(group.name)}
            />
          </div>
        </td>
      </tr>
    ))
  }

  const renderGroupTable = (title: string, items: Domain[]) => (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-blue-900">{title}</h3>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3">{t('groups:crud.table.name')}</th>
              <th className="px-4 py-3">{t('groups:crud.table.prefix')}</th>
              <th className="px-4 py-3">{t('groups:crud.table.parent')}</th>
              <th className="px-4 py-3">{t('groups:crud.table.assignment')}</th>
              <th className="px-4 py-3 text-right">{t('groups:crud.table.actions')}</th>
            </tr>
          </thead>
          <tbody>{renderGroupRows(items)}</tbody>
        </table>
      </div>
    </div>
  )

  const renderDetails = () => {
    if (!selectedGroup) {
      return <p className="text-gray-500">{t('groups:crud.selectGroupHint')}</p>
    }

    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2>{selectedGroup.name}</h2>
            <p className="text-sm text-gray-600">
              {t('groups:crud.detailSubtitle')}
            </p>
          </div>
          {renderScopeBadge(selectedGroup)}
        </div>
        <Divider />
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <tbody>
              {DOMAIN_DETAIL_FIELDS.map((field) => (
                <tr key={field} className="border-b last:border-b-0">
                  <th className="w-1/3 bg-gray-50 px-4 py-2 text-left font-semibold text-gray-700">
                    {t(`groups:details.${field}`)}
                  </th>
                  <td className="px-4 py-2 break-all">
                    {formatValue(selectedGroup[field])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-2">
          <PrimaryOutlinedButton
            label={t('groups:buttons.edit')}
            onClick={() => selectedGroup.name && handleEdit(selectedGroup.name)}
          />
          <SecondaryOutlinedButton
            label={t('groups:buttons.delete')}
            onClick={() => selectedGroup.name && handleDelete(selectedGroup.name)}
          />
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
          <Panel className="w-full">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center">
                <h2 className="mr-3">{t('groups:headers.left')}</h2>
                <QuestionMarkCircleIcon
                  className="h-5 w-5 mr-1 cursor-pointer"
                  onClick={() => setVisible(true)}
                />
              </div>
              <div className="flex gap-2">
                <PrimaryOutlinedButton
                  label={t('groups:buttons.refresh')}
                  onClick={() => fetchGroups()}
                />
                <PrimaryButton
                  label={t('groups:buttons.newGroup')}
                  onClick={() => handleNewGroup()}
                />
              </div>
            </div>
            <Divider />
            {isLoading ? (
              <div className="flex justify-center py-10">
                <ProgressSpinner style={{ width: '60px', height: '60px' }} />
              </div>
            ) : (
              <div className="space-y-8">
                {renderGroupTable(
                  t('groups:crud.assignedToCurrentProject'),
                  groupedDomains.currentProject
                )}
                {renderGroupTable(
                  t('groups:crud.notAssignedToAnyProject'),
                  groupedDomains.unassigned
                )}
                {groupedDomains.otherProject.length > 0 &&
                  renderGroupTable(
                    t('groups:crud.assignedElsewhere'),
                    groupedDomains.otherProject
                  )}
              </div>
            )}
          </Panel>

          <div className="space-y-8 lg:space-y-0 lg:w-full lg:flex lg:space-x-4">
            <Panel className="w-full basis-2/5">
              <h2>{t('groups:crud.hierarchyTitle')}</h2>
              <p className="mb-4 text-sm text-gray-600">
                {t('groups:crud.hierarchySubtitle')}
              </p>
              <Divider />
              <Tree
                value={tree}
                dragdropScope="groupManagerTree"
                nodeTemplate={nodeTemplate}
                expandedKeys={expandedKeys}
                onToggle={(e) => setExpandedKeys(e.value)}
                onNodeClick={(e) => handleTreeNodeClick(String(e.node.key))}
              />
            </Panel>

            <Panel className="w-full basis-3/5 relative">
              {isDeleting ? (
                <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
                  <ProgressSpinner style={{ width: '60px', height: '60px' }} />
                </div>
              ) : null}
              {viewMode === 'details' ? (
                renderDetails()
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2>
                      {viewMode === 'create'
                        ? t('groups:crud.createTitle')
                        : t('groups:crud.editTitle')}
                    </h2>
                    <PrimaryOutlinedButton
                      label={t('groups:buttons.backToDetails')}
                      onClick={() => {
                        if (selectedGroupName) {
                          selectGroup(selectedGroupName, 'details')
                        } else {
                          setViewMode('details')
                          setGroupOption('default')
                        }
                      }}
                    />
                  </div>
                  <Divider />
                  <GroupOption />
                </div>
              )}
            </Panel>
          </div>
        </div>
      </div>

      <Dialog
        header={t('groups:headers.modalHeader')}
        visible={visible}
        style={{ width: '50vw' }}
        onHide={() => setVisible(false)}
        footer={
          <div className="flex justify-end">
            <PrimaryButton
              label={t('groups:buttons.okay')}
              onClick={() => setVisible(false)}
            />
          </div>
        }
      >
        <p className="m-0">{t('groups:modal')}</p>
      </Dialog>
    </>
  )
}
