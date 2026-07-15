import { useState } from 'react'
import PrimaryButton from '../../../core/components/form/buttons/PrimaryButton'
import { useTranslation } from 'react-i18next'
import SecondaryOutlinedButton from '@component/form/buttons/SecondaryOutlinedButton.tsx'
import { ProgressSpinner } from 'primereact/progressspinner'
import GroupService from '../service/GroupService.tsx'
import GroupForm from './GroupForm.tsx'
import { useTreeStateStore } from '../stores/TreeStateStore'
import ConfirmDialog from '../../../core/components/common/ConfirmDialog.tsx'
import useToastStore from '../../../core/stores/ToastStore.ts'
import { findNodeByKey } from '../utils/findNodeByKey.ts'

// Helper: findet rekursiv einen Knoten im Baum nach id und gibt dessen label zurück (oder undefined)

export default function RegistrationGroupOption() {
  const { t } = useTranslation(['groups', 'common'])
  const [isCreating, setIsCreating] = useState(false)
  const showToast = useToastStore((state) => state.show)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const {
    tree,
    setGroupOption,
    storeNodeChanges,
    selectedNodeKey,
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
    setShowDeleteDialog(true)
  }

  const deleteNodes = () => {
    setShowDeleteDialog(false)
    deleteNode(selectedNodeKey)
    setGroupOption('default')
  }

  const confirmSaveAll = () => {
    try {
      setIsCreating(true)
      setShowSaveAllDialog(false)

      //get the selectednode and try to find out if it is the newly created node
      const currentDataNode = findNodeByKey(tree, selectedNodeKey)

      GroupService.updateGroups(tree, currentDataNode)
        .then(() => {
          GroupService.createGroup(currentDataNode?.data?.temporal)
            .then(() => {
              setGroupOption('edit')
              setIsCreating(false)
              storeNodeChanges()
              showToast({
                severity: 'success',
                summary: t('common:success'),
                detail: t('groups:crud.createSuccessDetail'),
                life: 4000
              })
              setGroupOption('edit')
            })
            .catch((error) => {
              console.error(error)
              setIsCreating(false)
              setGroupOption('registration')
              showToast({
                severity: 'error',
                summary: t('common:error'),
                detail: t('groups:crud.createFailedDetail'),
                life: 4000
              })
            })
        })
        .catch((error) => {
          console.error(error)
          setIsCreating(false)
          setShowSaveAllDialog(false)
          showToast({
            severity: 'error',
            summary: t('common:error'),
            detail: t('groups:crud.updateFailedDetail'),
            life: 4000
          })
        })

      //then call createGroup
    } catch (error) {
      console.error(error)
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
            visible={showDeleteDialog}
            message={t('groups:messages.deleteConfirmation')}
            header={t('groups:messages.confirmDelete')}
            label={t('groups:buttons.yesDelete')}
            onHide={() => setShowDeleteDialog(false)}
            onAccept={() => deleteNodes()}
          />
          <ConfirmDialog
            visible={showSaveAllDialog}
            message={t('groups:messages.saveOtherChanges')}
            header={t('groups:messages.saveOtherChangesHeader')}
            label={t('groups:messages.saveOtherChangesAction')}
            onHide={() => setShowSaveAllDialog(false)}
            onAccept={() => confirmSaveAll()}
          />
          <GroupForm />
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <SecondaryOutlinedButton
              label={t('groups:buttons.discardChanges')}
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
