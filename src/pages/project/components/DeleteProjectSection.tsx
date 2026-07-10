import { ConfirmDialog } from 'primereact/confirmdialog'
import PrimaryButton from '@component/form/buttons/PrimaryButton.tsx'
import SecondaryOutlinedButton from '@component/form/buttons/SecondaryOutlinedButton.tsx'
import { useTranslation } from 'react-i18next'

type Props = {
  confirmVisible: boolean
  loadingDelete: boolean
  onOpenConfirm: () => void
  onCloseConfirm: () => void
  onConfirmDelete: () => void
  deleteDisabled?: boolean
  deleteDisabledReason?: string
}

export default function DeleteProjectSection({
  confirmVisible,
  loadingDelete,
  onCloseConfirm,
  onConfirmDelete
}: Props) {
  const { t } = useTranslation(['settings', 'common'])
  return (
    <ConfirmDialog
      visible={confirmVisible}
      onHide={onCloseConfirm}
      message={t('settings:delete.confirm')}
      header={t('settings:delete.confirmHeader')}
      icon="pi pi-exclamation-triangle"
      closable
      className="trustdeck-confirm-dialog"
      footer={
        <div className="flex justify-end gap-2">
          <SecondaryOutlinedButton
            label={t('settings:delete.yesDelete')}
            loading={loadingDelete}
            onClick={onConfirmDelete}
          />
          <PrimaryButton label={t('common:cancel')} onClick={onCloseConfirm} />
        </div>
      }
    />
  )
}
