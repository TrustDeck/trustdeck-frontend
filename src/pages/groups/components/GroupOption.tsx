import DefaultGroupOption from './DefaultGroupOption'
import EditGroupOption from './EditGroupOption'
import RegistrationGroupOption from './RegistrationGroupOption'
import { useTreeStateStore } from '../stores/TreeStateStore'
import { GroupOptionType } from '../types/GroupOptionType'

type GroupOptionProps = {
  onClose?: () => void
}

export default function GroupOption({ onClose }: GroupOptionProps) {
  const { groupOption } = useTreeStateStore()

  function renderGroupOption(type: GroupOptionType) {
    switch (type) {
      case 'registration':
        return <RegistrationGroupOption />
      case 'edit':
        return <EditGroupOption onCancel={onClose} />
      default:
        return <DefaultGroupOption />
    }
  }

  return <div className="w-full">{renderGroupOption(groupOption)}</div>
}
