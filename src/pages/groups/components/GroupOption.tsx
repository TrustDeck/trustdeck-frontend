import DefaultGroupOption from './DefaultGroupOption'
import EditGroupOption from './EditGroupOption'
import RegistrationGroupOption from './RegistrationGroupOption'
import { useTreeStateStore } from '../stores/TreeStateStore'
import { GroupOptionType } from '../types/GroupOptionType'

export default function GroupOption() {
  const { groupOption } = useTreeStateStore()

  function renderGroupOption(type: GroupOptionType) {
    switch (type) {
      case 'registration':
        return <RegistrationGroupOption />
      case 'edit':
        return <EditGroupOption />
      default:
        return <DefaultGroupOption />
    }
  }

  return <div className="w-full">{renderGroupOption(groupOption)}</div>
}
