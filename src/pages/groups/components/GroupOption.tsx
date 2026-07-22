import DefaultGroupOption from './DefaultGroupOption'
import EditGroupOption from './EditGroupOption'
import RegistrationGroupOption from './RegistrationGroupOption'
import { useTreeStateStore } from '../stores/TreeStateStore'
import { GroupOptionType } from '../types/GroupOptionType'

type GroupOptionProps = {
  onClose?: () => void
  useCompleteEndpoint?: boolean
}

export default function GroupOption({
  onClose,
  useCompleteEndpoint = true
}: GroupOptionProps) {
  const { groupOption } = useTreeStateStore()

  function renderGroupOption(type: GroupOptionType) {
    switch (type) {
      case 'registration':
        return <RegistrationGroupOption useCompleteEndpoint={useCompleteEndpoint} />
      case 'edit':
        return (
          <EditGroupOption
            onCancel={onClose}
            useCompleteEndpoint={useCompleteEndpoint}
          />
        )
      default:
        return <DefaultGroupOption />
    }
  }

  return <div className="w-full">{renderGroupOption(groupOption)}</div>
}
