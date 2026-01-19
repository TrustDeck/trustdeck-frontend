import { useState } from "react"
import useProjectStore from "../../../core/stores/ProjectStore"
import { parseAttributes } from "./FormParser"
import Panel from "@component/common/Panel"

export default function DynamicForm({ entityName }: { entityName: string }) {
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

  return (
    <Panel>
      <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold mb-4">{entityName.charAt(0).toUpperCase() + entityName.slice(1)} registration</h2>
       <p>All fields marked with an * are required and must be filled out.</p>
      {parseAttributes({
        attributes: entity.typeDefinition.attributes,
        values: formValues,
        onChange: handleChange
      })}

      {/* <pre className="bg-gray-100 p-3 rounded">
        {JSON.stringify(formValues, null, 2)}
      </pre> */}
      </div>
    </Panel>
  )
}
