import { useState } from 'react'
import PrimaryButton from '../../../core/components/form/buttons/PrimaryButton'
import { useTranslation } from 'react-i18next'
import Divider from '@component/common/Divider'
import SecondaryOutlinedButton from '@component/form/buttons/SecondaryOutlinedButton'
import PrimaryOutlinedButton from '@component/form/buttons/PrimaryOutlinedButton'
import ConfirmDialog from '../../../core/components/common/ConfirmDialog'
import { useTreeStateStore } from '../stores/TreeStateStore'
import GroupForm from './GroupForm'
import { findNodeByKey } from '../utils/findNodeByKey'
import { ProgressSpinner } from 'primereact/progressspinner'
import GroupService from '../services/GroupService'
import useToastStore from '../../../core/stores/ToastStore'

type EditGroupOptionProps = {
  onCancel?: () => void
}

export default function EditGroupOption({ onCancel }: EditGroupOptionProps) {
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
  const { t } = useTranslation(['groups', 'common'])

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
          summary: t('common:success'),
          detail: t('groups:crud.deleteSuccessDetail'),
          life: 4000
        })
      })
      .catch((error) => {
        console.error(error)
        setIsDeleting(false)
        showToast({
          severity: 'error',
          summary: t('common:error'),
          detail: t('groups:crud.deleteFailedDetail'),
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
            summary: t('common:success'),
            detail: t('groups:crud.updateSuccessDetail'),
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
            summary: t('common:error'),
            detail: t('groups:crud.updateFailedDetail'),
            life: 4000
          })
        })
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="relative w-full space-y-6">
      {isCreating || isDeleting ? (
        <>
          <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
            <ProgressSpinner style={{ width: '60px', height: '60px' }} />
          </div>
          <p>
            {isCreating
              ? t('groups:status.updating')
              : t('groups:status.deleting')}
          </p>
        </>
      ) : (
        <>
          {' '}
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
          <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-slate-800">
            <h3 className="td-section-title !mb-0">
              {findNodeByKey(tree, selectedNodeKey)?.label}
            </h3>
          </div>
          <Divider />
          <GroupForm />
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <PrimaryButton
              label={t('groups:buttons.save')}
              onClick={() => handleSave()}
            />
            <PrimaryOutlinedButton
              label={t('groups:buttons.cancel')}
              onClick={() => onCancel?.()}
            />
            <SecondaryOutlinedButton
              label={t('groups:buttons.delete')}
              onClick={handleDelete}
            />
          </div>
        </>
      )}
    </div>
  )
}
