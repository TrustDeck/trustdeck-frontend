import Panel from '@component/common/Panel'
import { ConfirmDialog } from 'primereact/confirmdialog'
import SecondaryButton from '@component/form/buttons/SecondaryButton.tsx'
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
  onOpenConfirm,
  onCloseConfirm,
  onConfirmDelete,
  deleteDisabled = false,
  deleteDisabledReason
}: Props) {
  const { t } = useTranslation(['settings', 'common'])
  return (
    <>
      <div className="w-full flex justify-center px-4 pb-20 mb-20 mt-8">
        <Panel title={t('settings:dangerZone')} className="w-full max-w-4xl border-[8px] border-red-900/80 dark:border-red-700/90">
          <div className="flex justify-center">
            <span title={deleteDisabled ? (deleteDisabledReason ?? t('settings:delete.notAllowed')) : undefined}>
              <SecondaryButton
                label={t('settings:deleteProjectPermanently')}
                disabled={deleteDisabled}
                onClick={deleteDisabled ? undefined : onOpenConfirm}
              />
            </span>
          </div>
        </Panel>
      </div>

      <ConfirmDialog
        visible={confirmVisible}
        onHide={onCloseConfirm}
        message={t('settings:delete.confirm')}
        header={t('settings:delete.confirmHeader')}
        icon="pi pi-exclamation-triangle"
        closable={true}
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
    </>
  )
}
