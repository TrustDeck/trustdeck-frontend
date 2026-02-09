import { useState } from 'react'
import useProjectStore from '../../../core/stores/ProjectStore'
import { parseAttributes } from './FormParser'

type Props = {
  entityName: string
  variant?: 'registration' | 'search'
}

export default function DynamicForm({ entityName, variant = 'registration' }: Props) {
  const entity = useProjectStore((state) =>
    state.entityAttributes.find((e) => e.name === entityName)
  )

  const [formValues, setFormValues] = useState<Record<string, any>>({})
 
  if (!entity) {
    return <div>No entity found for {entityName}</div>
  }

  const handleChange = (key: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [key]: value
    }))
  }

  const title = entityName.charAt(0).toUpperCase() + entityName.slice(1)
  const showRequired = variant === 'registration'

  return (
    <div className={variant === 'registration' ? 'p-4 space-y-4' : 'space-y-4'}>
      {variant === 'registration' && <h2 className="text-xl font-semibold mb-4">{title}</h2>}
      {variant === 'registration' && (
        <p>All fields marked with an * are required and must be filled out.</p>
      )}
      {parseAttributes({
        attributes: entity.typeDefinition.attributes,
        values: formValues,
        onChange: handleChange,
        showRequired
      })}

      {/* <pre className="bg-gray-100 p-3 rounded">
        {JSON.stringify(formValues, null, 2)}
      </pre> */}
    </div>
  )
}
