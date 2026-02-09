import { useState } from 'react'
import SecondaryButton from '../../../core/components/form/buttons/SecondaryButton'
import { useTranslation } from 'react-i18next'
import Divider from '@component/common/Divider.tsx'
import SecondaryOutlinedButton from '@component/form/buttons/SecondaryOutlinedButton.tsx'
import ConfirmDialog from '../../../core/components/common/ConfirmDialog.tsx'
import { useTreeStateStore } from '../stores/TreeStateStore'
import GroupForm from './GroupForm.tsx'
import { findNodeByKey } from '../utils/findNodeByKey.ts'
import { ProgressSpinner } from 'primereact/progressspinner'
import GroupService from '../service/GroupService.tsx'
import useToastStore from '../../../core/stores/ToastStore.ts'

export default function EditGroupOption() {
  const {
    tree,
    selectedNodeKey,
    setGroupOption,
    storeNodeChanges,
    deleteNode
  } = useTreeStateStore()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showSaveAllDialog, setShowSaveAllDialog] = useState(false)
  const showToast = useToastStore((state) => state.show)
  const { t } = useTranslation()

  async function handleSave() {
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
    setIsDeleting(true)
    setShowDeleteDialog(false)
    GroupService.deleteGroup(findNodeByKey(tree, selectedNodeKey)?.label || '')
      .then(() => {
        deleteNode(selectedNodeKey)
        setGroupOption('default')
        setIsDeleting(false)
        showToast({
          severity: 'success',
          summary: 'Success',
          detail: 'Group deleted successfully',
          life: 4000
        })
      })
      .catch((error) => {
        console.error(error)
        setIsDeleting(false)
        showToast({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete group',
          life: 4000
        })
      })
  }

  const confirmSaveAll = () => {
    try {
      setIsCreating(true)
      GroupService.updateGroups(tree, undefined)
        .then(() => {
          setIsCreating(false)
          setShowSaveAllDialog(false)
          storeNodeChanges()
          showToast({
            severity: 'success',
            summary: 'Success',
            detail: 'Group created successfully',
            life: 4000
          })
          setGroupOption('edit')
        })
        .catch((error) => {
          console.error(error)
          setIsCreating(false)
          setShowSaveAllDialog(false)
          showToast({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to create groups updates',
            life: 4000
          })
        })
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="w-full space-y-4 pr-4">
      {isCreating || isDeleting ? (
        <>
          <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
            <ProgressSpinner style={{ width: '60px', height: '60px' }} />
          </div>
          <p>
            {isCreating
              ? 'Group is being updated...'
              : 'Group is being deleted...'}
          </p>
        </>
      ) : (
        <>
          {' '}
          <ConfirmDialog
            visible={showDeleteDialog}
            message={t('groups:messages.deleteConfirmation')}
            header={t('groups:messages.confirmDelete')}
            label="Delete"
            onHide={() => setShowDeleteDialog(false)}
            onAccept={() => deleteNodes()}
          />
          <ConfirmDialog
            visible={showSaveAllDialog}
            message="Es gibt weitere Änderungen. Diesen müssen ebenanfalls gespeichert werden, bevor eine neue Gruppe angelegt werden kann."
            header="Weitere Änderungen speichern?"
            label="Ja, Änderungen speichern"
            onHide={() => setShowSaveAllDialog(false)}
            onAccept={() => confirmSaveAll()}
          />
          <div className="flex justify-between items-center">
            <h2 className="w-full">
              {findNodeByKey(tree, selectedNodeKey)?.label}
            </h2>
          </div>
          <Divider />
          <GroupForm />
          <SecondaryOutlinedButton
            label={t('groups:buttons.delete')}
            className="w-full"
            onClick={handleDelete}
          />
          <SecondaryButton
            label={t('groups:buttons.save')}
            className="w-full"
            onClick={() => handleSave()}
          />
        </>
      )}
    </div>
  )
}
