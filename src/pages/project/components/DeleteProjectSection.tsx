import Panel from '@component/common/Panel'
import { ConfirmDialog } from 'primereact/confirmdialog'
import SecondaryButton from '@component/form/buttons/SecondaryButton.tsx'
import PrimaryButton from '@component/form/buttons/PrimaryButton.tsx'
import SecondaryOutlinedButton from '@component/form/buttons/SecondaryOutlinedButton.tsx'

type Props = {
  confirmVisible: boolean
  loadingDelete: boolean
  onOpenConfirm: () => void
  onCloseConfirm: () => void
  onConfirmDelete: () => void
}

export default function DeleteProjectSection({
  confirmVisible,
  loadingDelete,
  onOpenConfirm,
  onCloseConfirm,
  onConfirmDelete
}: Props) {
  return (
    <>
      <div className="w-full flex justify-center px-4 pb-20 mb-20">
        <Panel title="Danger zone" className="w-full max-w-4xl border-[6px] border-red-900/80 dark:border-red-700/90">
          <div className="flex justify-center">
            <SecondaryButton label="Delete project permanently" onClick={onOpenConfirm} />
          </div>
        </Panel>
      </div>

      <ConfirmDialog
        visible={confirmVisible}
        onHide={onCloseConfirm}
        message="Are you sure you want to permanently delete this project?"
        header="Confirm Deletion"
        icon="pi pi-exclamation-triangle"
        closable={true}
        className="trustdeck-confirm-dialog"
        footer={
          <div className="flex justify-end gap-2">
            <SecondaryOutlinedButton
              label="Yes, Delete"
              loading={loadingDelete}
              onClick={onConfirmDelete}
            />
            <PrimaryButton label="Cancel" onClick={onCloseConfirm} />
          </div>
        }
      />
    </>
  )
}
