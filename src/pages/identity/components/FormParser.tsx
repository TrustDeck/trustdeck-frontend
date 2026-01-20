import CustomFloatLabel from "@component/form/CustomFloatLabel"
import CustomCalendar from "@component/form/CustomCalendar"
import { Dropdown } from "primereact/dropdown"
// import IntelligentGroup from "./IntelligentGroup"
// import IntelligentGroupList from "./IntelligentGroupList"
import { Attribute } from "../../../core/stores/ProjectStore"

interface ParserProps {
  attributes: Attribute[]
  values: Record<string, any>
  onChange: (key: string, value: any) => void
  showRequired?: boolean
  path?: string
}

export const parseAttributes = ({
  attributes,
  values,
  onChange,
  showRequired = true,
  path = ""
}: ParserProps) => {
  return attributes.map((attr) => {
    const key = path ? `${path}.${attr.name}` : attr.name
    const value = values[attr.name]

    // ENUM
    if (attr.type === "enum" && attr.enum) {
      return (
        <div key={key} className="mb-3">
          <label className="block mb-1">{attr.name}</label>
          <Dropdown
            value={value}
            options={attr.enum}
            onChange={(e) => onChange(attr.name, e.value)}
            placeholder={`Select ${attr.name}`}
            className="w-full"
          />
        </div>
      )
    }

    // STRING / INTEGER
    if (attr.type === "string" || attr.type === "integer") {
      return (
        <CustomFloatLabel
          key={key}
          id={key}
          value={value ?? ""}
          onChange={(e) => onChange(attr.name, e.target.value)}
          placeholder={attr.name}
          required={showRequired ? attr.required : false}
        />
      )
    }

    // DATE
    if (attr.type === "date") {
      return (
        <CustomCalendar
          key={key}
          id={key}
          value={value}
          onChange={(e) => onChange(attr.name, e.value)}
          placeholder={attr.name}
          className="w-full"
          required={showRequired ? true : false}
        />
      )
    }

    // // GROUP
    // if (attr.children) {
    //   // repeatable group
    //   if (attr.repeatable) {
    //     return (
    //       <IntelligentGroupList
    //         key={key}
    //         label={attr.name}
    //         values={value ?? []}
    //         renderItem={(item: any, index: number) =>
    //           parseAttributes({
    //             attributes: attr.children!,
    //             values: item,
    //             path: `${key}[${index}]`,
    //             onChange: (childKey, childValue) => {
    //               const updated = [...(value ?? [])]
    //               updated[index] = { ...updated[index], [childKey]: childValue }
    //               onChange(attr.name, updated)
    //             }
    //           })
    //         }
    //         onAdd={() => onChange(attr.name, [...(value ?? []), {}])}
    //         onRemove={(i) => {
    //           const updated = [...(value ?? [])]
    //           updated.splice(i, 1)
    //           onChange(attr.name, updated)
    //         }}
    //       />
    //     )
    //   }

    //   // single group
    //   return (
    //     <IntelligentGroup key={key} label={attr.name}>
    //       {parseAttributes({
    //         attributes: attr.children,
    //         values: value ?? {},
    //         path: key,
    //         onChange: (childKey, childValue) =>
    //           onChange(attr.name, { ...(value ?? {}), [childKey]: childValue })
    //       })}
    //     </IntelligentGroup>
    //   )
    // }

    return null
  })
}
