import { useState } from 'react'
import PrimaryButton from '../../../core/components/form/buttons/PrimaryButton'
import { useTranslation } from 'react-i18next'
import SecondaryOutlinedButton from '@component/form/buttons/SecondaryOutlinedButton'
import { ProgressSpinner } from 'primereact/progressspinner'
import DomainService from '../services/DomainService'
import TrustDeck from '../../../core/services/TrustDeck'
import DomainForm from './DomainForm'
import { useTreeStateStore } from '../stores/TreeStateStore'
import ConfirmDialog from '../../../core/components/common/ConfirmDialog'
import useToastStore from '../../../core/stores/ToastStore'
import useProjectStore from '../../../core/stores/ProjectStore'
import { findNodeByKey, findNodeByLabel } from '../utils/findNodeByKey'

function domainNameExists(
  nodes: any[],
  selectedNodeKey: string,
  name: string
): boolean {
  const normalizedName = name.trim().toLowerCase()
  return nodes.some((node) => {
    if (
      String(node.key) !== String(selectedNodeKey) &&
      String(node.label ?? '').trim().toLowerCase() === normalizedName
    ) {
      return true
    }
    return Array.isArray(node.children)
      ? domainNameExists(node.children, selectedNodeKey, name)
      : false
  })
}

// Helper: findet rekursiv einen Knoten im Baum nach id und gibt dessen label zurück (oder undefined)

export default function RegistrationDomainOption({
  useCompleteEndpoint,
  accessToken
}: {
  useCompleteEndpoint: boolean
  accessToken?: string
}) {
  const { t } = useTranslation(['groups', 'common'])
  const [isCreating, setIsCreating] = useState(false)
  const showToast = useToastStore((state) => state.show)
  const selectedProject = useProjectStore((state) => state.selectedProject)
  const setJustCreated = useProjectStore((state) => state.setJustCreated)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const {
    tree,
    setTree,
    setGroupOption,
    storeNodeChanges,
    selectedNodeKey,
    setSelectedNodeKey,
    deleteNode
  } = useTreeStateStore()
  const [showSaveAllDialog, setShowSaveAllDialog] = useState(false)

  async function handleCreateGroup() {
    //iterate over tree to find if any node has changes
    const hasUnsavedChanges = tree.some((node: any) => {
      const hasChangesRecursive = (n: any): boolean => {
        if (n == null) return false
        if (String(n.key) !== String(selectedNodeKey) && (n as any).hasChanges)
          return true
        if (n.children && n.children.length > 0) {
          return n.children.some((child: any) => hasChangesRecursive(child))
        }
        return false
      }
      return hasChangesRecursive(node)
    })

    if (hasUnsavedChanges) {
      setShowSaveAllDialog(true)
      return
    } else {
      confirmSaveAll()
    }
  }

  function handleDelete() {
    setShowCancelDialog(true)
  }

  const deleteNodes = () => {
    setShowCancelDialog(false)
    deleteNode(selectedNodeKey)
    setGroupOption('default')
  }

  const confirmSaveAll = async () => {
    setIsCreating(true)
    setShowSaveAllDialog(false)

    try {
      if (!accessToken) throw new Error('Your session has expired.')
      TrustDeck.instance().setToken(accessToken)
      const currentDataNode = findNodeByKey(tree, selectedNodeKey)
      const createPayload = currentDataNode?.data?.temporal
      const createdName = String(createPayload?.label ?? '').trim()
      if (!currentDataNode || !createPayload || !createdName) {
        throw new Error('The new domain could not be resolved from the tree.')
      }
      if (!selectedProject?.abbreviation) {
        throw new Error('Select a project before creating a pseudonym domain.')
      }
      if (domainNameExists(tree, String(selectedNodeKey), createdName)) {
        throw new Error('A domain with this name already exists.')
      }
      try {
        await DomainService.getGroup(createdName)
        throw new Error('A domain with this name already exists.')
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === 'A domain with this name already exists.'
        ) {
          throw error
        }
      }

      await DomainService.updateGroups(tree, currentDataNode, useCompleteEndpoint)
      let createdDomain = await DomainService.createGroup(
        createPayload,
        selectedProject.abbreviation,
        useCompleteEndpoint
      )

      try {
        createdDomain = await DomainService.getGroup(createdName)
      } catch {
        // The create response already contains the best available representation.
      }

      let refreshedTree = DomainService.hydrateGroupTree(
        useTreeStateStore.getState().tree,
        createdName,
        createdDomain
      )
      try {
        refreshedTree = DomainService.hydrateGroupTree(
          await DomainService.getGroups(selectedProject.abbreviation),
          createdName,
          createdDomain
        )
      } catch {
        // Keep the locally hydrated tree when hierarchy reloading is unavailable.
      }

      setTree(refreshedTree)
      const createdNode = findNodeByLabel(refreshedTree, createdName)
      if (createdNode) setSelectedNodeKey(createdNode.key)
      else storeNodeChanges()
      setGroupOption('edit')
      setJustCreated(true)

      showToast({
        severity: 'success',
        summary: t('common:success'),
        detail: t('groups:crud.createSuccessDetail'),
        life: 4000
      })
    } catch (error) {
      console.error(error)
      setGroupOption('registration')
      showToast({
        severity: 'error',
        summary: t('common:error'),
        detail: t('groups:crud.createFailedDetail'),
        life: 4000
      })
    } finally {
      setIsCreating(false)
    }
  }
  return (
    <div className="relative w-full space-y-6">
      {isCreating ? (
        <>
          <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
            <ProgressSpinner style={{ width: '60px', height: '60px' }} />
          </div>
          <p>{t('groups:status.creating')}</p>
        </>
      ) : (
        <>
          <ConfirmDialog
            visible={showCancelDialog}
            message={t('groups:messages.cancelCreationConfirmation')}
            header={t('groups:messages.confirmCancel')}
            label={t('groups:buttons.yesCancel')}
            rejectLabel={t('groups:buttons.noKeepEditing')}
            onHide={() => setShowCancelDialog(false)}
            onAccept={() => deleteNodes()}
            destructive
          />
          <ConfirmDialog
            visible={showSaveAllDialog}
            message={t('groups:messages.saveOtherChanges')}
            header={t('groups:messages.saveOtherChangesHeader')}
            label={t('groups:messages.saveOtherChangesAction')}
            onHide={() => setShowSaveAllDialog(false)}
            onAccept={() => confirmSaveAll()}
          />
          <DomainForm />
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <SecondaryOutlinedButton
              label={t('groups:buttons.cancel')}
              onClick={handleDelete}
            />
            <PrimaryButton
              label={t('groups:buttons.createGroup')}
              onClick={() => {
                if (!isCreating) {
                  handleCreateGroup()
                }
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}
