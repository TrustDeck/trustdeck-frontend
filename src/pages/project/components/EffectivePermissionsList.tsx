import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Checkbox } from 'primereact/checkbox'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
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

type PermissionSubgroup = {
  label: string
  permissions: EffectivePermission[]
}

function scopeTitle(group: string, t: ReturnType<typeof useTranslation>['t']) {
  const [resourceType, resourceName = '*'] = group.split(' / ')
  const translatedType =
    resourceType === 'GLOBAL'
      ? t('permission:scope.global')
      : resourceType === 'PROJECT'
        ? t('permission:scope.project')
        : resourceType === 'DOMAIN'
          ? t('permission:scope.group')
          : resourceType

  if (resourceType === 'GLOBAL') return translatedType
  return `${translatedType}: ${resourceName}`
}

function buildSubgroups(resourceType: string, perms: EffectivePermission[], t: ReturnType<typeof useTranslation>['t']): PermissionSubgroup[] {
  if (resourceType === 'PROJECT') {
    return PROJECT_SUBGROUP_ORDER.map((sub) => ({
      label: t(`permission:subgroup.project.${sub}`, PROJECT_SUBGROUP_LABELS[sub]),
      permissions: perms.filter((p) => projectPermissionSubgroup(p.action) === sub)
    })).filter(({ permissions }) => permissions.length > 0)
  }

  if (resourceType === 'DOMAIN') {
    return DOMAIN_SUBGROUP_ORDER.map((sub) => ({
      label: t(`permission:subgroup.group.${sub}`, DOMAIN_SUBGROUP_LABELS[sub]),
      permissions: perms.filter((p) => domainPermissionSubgroup(p.action) === sub)
    })).filter(({ permissions }) => permissions.length > 0)
  }

  return [{ label: t('permission:scope.permissions'), permissions: perms }]
}

export default function EffectivePermissionsList({
  allPermissionRows,
  permissionState,
  onPermissionChange
}: Props) {
  const { t } = useTranslation(['permission', 'common'])
  const groupedPermissions = useMemo(() => groupPermissionsByScope(allPermissionRows), [allPermissionRows])
  const [openScopes, setOpenScopes] = useState<Record<string, boolean>>({})

  if (allPermissionRows.length === 0) {
    return <div className="text-sm text-gray-500 dark:text-gray-300">{t('permission:empty.noPermissionsForUser')}</div>
  }

  return (
    <div className="space-y-3">
      {Object.entries(groupedPermissions).map(([group, perms], index) => {
        const sepIdx = group.indexOf(' / ')
        const resourceType = sepIdx === -1 ? group : group.slice(0, sepIdx)
        const grantedCount = perms.filter((p) => Boolean(permissionState[permissionKey(p)])).length
        const missingCount = perms.length - grantedCount
        const isOpen = openScopes[group] ?? index === 0
        const subgroups = buildSubgroups(resourceType, perms, t)

        return (
          <section
            key={group}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
              onClick={() => setOpenScopes((current) => ({ ...current, [group]: !isOpen }))}
              aria-expanded={isOpen}
            >
              <div className="min-w-0">
                <h4 className="truncate text-base font-semibold text-gray-900 dark:text-gray-50">
                  {scopeTitle(group, t)}
                </h4>
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">
                    {t('permission:grantedCount', { count: grantedCount })}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 font-semibold text-gray-600 dark:bg-slate-800 dark:text-gray-300">
                    {t('permission:missingCount', { count: missingCount })}
                  </span>
                </div>
              </div>
              {isOpen ? <ChevronDownIcon className="h-5 w-5 shrink-0" /> : <ChevronRightIcon className="h-5 w-5 shrink-0" />}
            </button>

            {isOpen && (
              <div className="border-t border-gray-100 px-4 py-4 dark:border-slate-800">
                <div className="space-y-4">
                  {subgroups.map(({ label, permissions }) => (
                    <div key={label}>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {label}
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {permissions.map((perm) => {
                          const key = permissionKey(perm)
                          const checked = Boolean(permissionState[key])
                          return (
                            <label
                              key={key}
                              className={`flex min-h-[4.5rem] items-start gap-3 rounded-xl border p-3 text-sm transition ${
                                checked
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100'
                                  : 'border-gray-200 bg-gray-50 text-gray-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-gray-300'
                              }`}
                            >
                              <Checkbox
                                inputId={key}
                                checked={checked}
                                onChange={(e) => onPermissionChange(key, e.checked ?? false)}
                                className="mt-0.5 shrink-0"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block break-words font-semibold leading-snug">{perm.action}</span>
                                <span
                                  className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide ${
                                    checked
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100'
                                      : 'bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-gray-300'
                                  }`}
                                >
                                  {checked ? t('permission:status.granted') : t('permission:status.notGranted')}
                                </span>
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
