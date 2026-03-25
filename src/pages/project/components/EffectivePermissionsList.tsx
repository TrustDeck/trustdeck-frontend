import { Checkbox } from 'primereact/checkbox'
import type { EffectivePermission } from '../types'
import { groupPermissionsByScope, permissionKey } from '../utils/permissionRows'
import {
  DOMAIN_SUBGROUP_LABELS,
  DOMAIN_SUBGROUP_ORDER,
  PROJECT_SUBGROUP_LABELS,
  PROJECT_SUBGROUP_ORDER,
  domainPermissionSubgroup,
  projectPermissionSubgroup
} from '../utils/permissionSubgroups'

type Props = {
  allPermissionRows: EffectivePermission[]
  permissionState: Record<string, boolean>
  onPermissionChange: (key: string, checked: boolean) => void
}

export default function EffectivePermissionsList({
  allPermissionRows,
  permissionState,
  onPermissionChange
}: Props) {
  if (allPermissionRows.length === 0) {
    return <div className="text-sm text-gray-500">No permissions found for this user.</div>
  }

  const renderCheckbox = (perm: EffectivePermission) => {
    const key = permissionKey(perm)
    return (
      <label key={key} className="inline-flex items-center gap-2 text-sm">
        <Checkbox
          inputId={key}
          checked={Boolean(permissionState[key])}
          onChange={(e) => onPermissionChange(key, e.checked ?? false)}
        />
        <span>{perm.action}</span>
      </label>
    )
  }

  return (
    <div className="space-y-4">
      {Object.entries(groupPermissionsByScope(allPermissionRows)).map(([group, perms]) => {
        const sepIdx = group.indexOf(' / ')
        const resourceType = sepIdx === -1 ? group : group.slice(0, sepIdx)

        return (
          <div key={group} className="border border-gray-200 rounded p-3">
            <h4 className="font-medium mb-3">{group}</h4>
            {resourceType === 'GLOBAL' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {perms.map(renderCheckbox)}
              </div>
            )}
            {resourceType === 'PROJECT' && (
              <div className="flex flex-col gap-4 md:flex-row md:gap-0">
                {PROJECT_SUBGROUP_ORDER.map((sub) => ({
                  sub,
                  subset: perms.filter((p) => projectPermissionSubgroup(p.action) === sub)
                }))
                  .filter(({ subset }) => subset.length > 0)
                  .map(({ sub, subset }, idx) => (
                    <div
                      key={sub}
                      className={[
                        'min-w-0 flex-1 space-y-2',
                        idx > 0 ? 'md:border-l md:border-gray-200 md:pl-4' : ''
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {PROJECT_SUBGROUP_LABELS[sub]}
                      </div>
                      <div className="grid grid-cols-1 gap-2">{subset.map(renderCheckbox)}</div>
                    </div>
                  ))}
              </div>
            )}
            {resourceType === 'DOMAIN' && (
              <div className="flex flex-col gap-4 md:flex-row md:gap-0">
                {DOMAIN_SUBGROUP_ORDER.map((sub, idx) => {
                  const subset = perms.filter((p) => domainPermissionSubgroup(p.action) === sub)
                  return (
                    <div
                      key={sub}
                      className={[
                        'min-w-0 flex-1 space-y-2',
                        idx > 0 ? 'md:border-l md:border-gray-200 md:pl-4' : ''
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {DOMAIN_SUBGROUP_LABELS[sub]}
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {subset.length > 0 ? subset.map(renderCheckbox) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {resourceType !== 'GLOBAL' &&
              resourceType !== 'PROJECT' &&
              resourceType !== 'DOMAIN' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {perms.map(renderCheckbox)}
                </div>
              )}
          </div>
        )
      })}
    </div>
  )
}
