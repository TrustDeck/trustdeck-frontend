import React, { useEffect, useState } from 'react'
import Divider from '@component/common/Divider'
import CustomDropdown from '@component/form/CustomDropdown'
import { Area, Permission } from '../../../core/types/Permission.ts'
import { Domain } from '../../../core/types/Domain.ts'
import { PermissionsService } from '../../../core/configs/permission.ts'
import { useTranslation } from 'react-i18next'

interface FieldFormProps {
  userId: string
  area: Area
  userPermissions: Permission[]
  domainTree: Domain[]
  useOnlyRoot: boolean
  onDomainPermissionsChange?: (
    area: Area,
    permissions: Record<string, string>
  ) => void
}

const FieldForm: React.FC<FieldFormProps> = ({
  userId,
  area,
  userPermissions,
  domainTree,
  useOnlyRoot,
  onDomainPermissionsChange
}) => {
  const [domainPermissions, setDomainPermissions] = useState<
    Record<string, string>
  >({})

  const { t } = useTranslation()

  useEffect(() => {
    const initialPermissions: Record<string, string> = {}
    for (const domain of domainTree) {
      let canBeUsed = true
      if (
        useOnlyRoot == true &&
        ((domain.superDomainID != undefined && domain.superDomainID != null) ||
          (domain.superDomainName != undefined &&
            domain.superDomainName != null)) //very important if the user does not have complete view
      ) {
        canBeUsed = false
      }
      if (canBeUsed) {
        const out = PermissionsService.instance().getPermittedArea(
          area,
          userPermissions,
          domain.name
        )
        if (out.keys && out.keys.length > 0) {
          initialPermissions[domain.name] = out.keys[0].key
        }
      }
    }
    setDomainPermissions(initialPermissions)
  }, [userId, JSON.stringify(userPermissions), JSON.stringify(domainTree)])

  useEffect(() => {
    if (onDomainPermissionsChange) {
      onDomainPermissionsChange(area, domainPermissions)
    }
  }, [domainPermissions])

  const setValue = (domainName: string, value: string) => {
    setDomainPermissions((prev) => ({
      ...prev,
      [domainName]: value
    }))
  }

  const getLocalizedDropDownOptionsByArea = (area: Area) => {
    const options = PermissionsService.instance().getDropDownOptionsByArea(area)

    return options.map((option) => ({
      label: t(`permission:option.${option.label}`),
      value: option.value
    }))
  }

  //TODO write some nice text here as discription
  return (
    <div>
      <div>
        <h2>{area}</h2>
        <p>{area} placeholder</p>
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-4">
        {domainTree.map((item: any, idx: number) =>
          Object.prototype.hasOwnProperty.call(domainPermissions, item.name) ? (
            <React.Fragment key={item.id || idx}>
              <CustomDropdown
                id={`dropdown-${idx}`}
                value={domainPermissions[item.name]}
                onChange={(e) => setValue(item.name, e.target.value)}
                options={getLocalizedDropDownOptionsByArea(area)}
              />

              <div className="whitespace-nowrap flex items-center h-full">
                {item.name}
              </div>
            </React.Fragment>
          ) : null
        )}
      </div>

      <Divider />
    </div>
  )
}

export default FieldForm
