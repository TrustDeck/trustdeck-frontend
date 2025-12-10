import { Dialog } from 'primereact/dialog'
import PrimaryButton from '@component/form/buttons/PrimaryButton'
import SecondaryOutlinedButton from '@component/form/buttons/SecondaryOutlinedButton'

type Props = {
  visible: boolean
  onHide: () => void
  onAccept: () => void
  onReject?: () => void
  message: string
  label: string
  header: string
}

export default function ConfirmDialog({
  visible,
  onHide,
  onAccept,
  onReject,
  label,
  message,
  header
}: Props) {
  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={header}
      footer={
        <div className="flex justify-end gap-2">
          <SecondaryOutlinedButton label={label} onClick={onAccept} />
          <PrimaryButton label="Cancel" onClick={onReject ?? onHide} />
        </div>
      }
      style={{ width: '32rem' }}
      closable={false}
      modal
    >
      <p className="mt-2">{message}</p>
    </Dialog>
  )
}
