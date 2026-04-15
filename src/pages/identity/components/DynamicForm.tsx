import { useState } from 'react'
import useProjectStore from '../../../core/stores/ProjectStore'
import Panel from '@component/common/Panel'
import { parseAttributes } from './FormParser'
import { setValue } from '../util/value'
import { useTranslation } from 'react-i18next'

type Props = {
  entityName: string
  variant?: 'registration' | 'search'
}

export default function DynamicForm({ entityName, variant = 'registration' }: Props) {
  const { i18n } = useTranslation()
  const entity = useProjectStore((state) =>
    state.entityAttributes.find((e) => e.name === entityName)
  )

  const [formValues, setFormValues] = useState<Record<string, any>>({})
 
  if (!entity) {
    return <div>No entity found for {entityName}</div>
  }

  const handleChange = (key: string, value: any) => {
    setFormValues((prev) => {
      const next = structuredClone(prev)
      setValue(next, key, value)
      return next
    })
  }

  const title = entityName.charAt(0).toUpperCase() + entityName.slice(1)
  const showRequired = variant === 'registration'
  const panelClassName = variant === 'search' ? 'w-full lg:w-full' : 'w-full'

  return (
    <Panel
      title={variant === 'registration' ? title : undefined}
      className={panelClassName}
      noBasePanel={variant === 'search'}
    >
      <div className={variant === 'registration' ? 'p-4 space-y-4' : 'space-y-4'}>
        {variant === 'registration' && (
          <p className="mb-4">All fields marked with an * are required and must be filled out.</p>
        )}
        {parseAttributes({
          attributes: entity.typeDefinition.attributes,
          values: formValues,
          onChange: handleChange,
          showRequired,
          language: i18n.language
        })}
      </div>
    </Panel>
  )
}
