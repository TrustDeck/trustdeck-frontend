import { useMemo, useState } from 'react'
import useProjectStore from '../../../core/stores/ProjectStore'
import { parseAttributes } from './FormParser'
import Panel from '@component/common/Panel'
import { useTranslation } from 'react-i18next'

export default function DynamicForm({ entityName }: { entityName: string }) {
  const entity = useProjectStore((state) =>
    state.entityAttributes.find((e) => e.name === entityName)
  )
  const { t } = useTranslation()

  const [formValues, setFormValues] = useState<Record<string, any>>({})
  const translateLabel = useMemo(() => {
    const formatFallback = (key: string) =>
      key
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
        .trim()

    return (attributeKey: string) => {
      const translationKey = `identity:entityAttributes.${entityName}.${attributeKey}`
      const translated = t(translationKey)
      return translated === translationKey ? formatFallback(attributeKey) : translated
    }
  }, [entityName, t])

  if (!entity) {
    return <div>No entity found for {entityName}</div>
  }

  const handleChange = (key: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [key]: value
    }))
  }

  return (
    <Panel>
      <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold mb-4">{entityName.charAt(0).toUpperCase() + entityName.slice(1)} registration</h2>
       <p>All fields marked with an * are required and must be filled out.</p>
      {parseAttributes({
        attributes: entity.typeDefinition.attributes,
        values: formValues,
        onChange: handleChange,
        translateLabel
      })}

      {/* <pre className="bg-gray-100 p-3 rounded">
        {JSON.stringify(formValues, null, 2)}
      </pre> */}
      </div>
    </Panel>
  )
}
