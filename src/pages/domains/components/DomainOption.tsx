import DefaultDomainOption from './DefaultDomainOption'
import EditDomainOption from './EditDomainOption'
import RegistrationDomainOption from './RegistrationDomainOption'
import { useTreeStateStore } from '../stores/TreeStateStore'
import { DomainOptionType } from '../types/DomainOptionType'

type DomainOptionProps = {
  onClose?: () => void
  useCompleteEndpoint?: boolean
  accessToken?: string
}

export default function DomainOption({
  onClose,
  useCompleteEndpoint = true,
  accessToken
}: DomainOptionProps) {
  const { groupOption } = useTreeStateStore()

  function renderDomainOption(type: DomainOptionType) {
    switch (type) {
      case 'registration':
        return (
          <RegistrationDomainOption
            useCompleteEndpoint={useCompleteEndpoint}
            accessToken={accessToken}
          />
        )
      case 'edit':
        return (
          <EditDomainOption
            onCancel={onClose}
            useCompleteEndpoint={useCompleteEndpoint}
            accessToken={accessToken}
          />
        )
      default:
        return <DefaultDomainOption />
    }
  }

  return <div className="w-full">{renderDomainOption(groupOption)}</div>
}
