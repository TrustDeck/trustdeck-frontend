import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Checkbox } from 'primereact/checkbox'
import { CheckCircleIcon, ChevronDownIcon, ChevronRightIcon, XCircleIcon } from '@heroicons/react/24/outline'
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
      ? t('scope.global')
      : resourceType === 'PROJECT'
        ? t('scope.project')
        : resourceType === 'DOMAIN'
          ? t('scope.group')
          : resourceType

  if (resourceType === 'GLOBAL') return translatedType
  return `${translatedType}: ${resourceName}`
}

function buildSubgroups(resourceType: string, perms: EffectivePermission[], t: ReturnType<typeof useTranslation>['t']): PermissionSubgroup[] {
  if (resourceType === 'PROJECT') {
    return PROJECT_SUBGROUP_ORDER.map((sub) => ({
      label: t(`subgroup.project.${sub}`, PROJECT_SUBGROUP_LABELS[sub]),
      permissions: perms.filter((p) => projectPermissionSubgroup(p.action) === sub)
    })).filter(({ permissions }) => permissions.length > 0)
  }

  if (resourceType === 'DOMAIN') {
    return DOMAIN_SUBGROUP_ORDER.map((sub) => ({
      label: t(`subgroup.group.${sub}`, DOMAIN_SUBGROUP_LABELS[sub]),
      permissions: perms.filter((p) => domainPermissionSubgroup(p.action) === sub)
    })).filter(({ permissions }) => permissions.length > 0)
  }

  return [{ label: t('scope.permissions'), permissions: perms }]
}

function readablePermission(action: string) {
  return action
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^./, (char) => char.toUpperCase())
}

function PermissionRows({
  permissions,
  permissionState,
  onPermissionChange,
  granted,
  emptyLabel,
  grantedLabel,
  notGrantedLabel
}: {
  permissions: EffectivePermission[]
  permissionState: Record<string, boolean>
  onPermissionChange: (key: string, checked: boolean) => void
  granted: boolean
  emptyLabel: string
  grantedLabel: string
  notGrantedLabel: string
}) {
  if (!permissions.length) {
    return <div className="rounded-lg border border-dashed border-gray-200 px-3 py-2 text-sm text-gray-500 dark:border-slate-700 dark:text-gray-400">{emptyLabel}</div>
  }

  return (
    <div className="space-y-2">
      {permissions.map((perm) => {
        const key = permissionKey(perm)
        const checked = Boolean(permissionState[key])
        return (
          <label
            key={key}
            className={`flex w-full cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-sm transition ${
              checked
                ? 'border-emerald-200 bg-emerald-50 text-emerald-950 hover:border-emerald-300 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100'
                : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 dark:border-slate-700 dark:bg-slate-800/70 dark:text-gray-200 dark:hover:border-slate-600'
            }`}
            title={perm.action}
          >
            <Checkbox
              inputId={key}
              checked={checked}
              onChange={(e) => onPermissionChange(key, e.checked ?? false)}
              className="mt-0.5 shrink-0"
            />
            <span className="min-w-0 flex-1">
              <span className="block break-words font-semibold leading-snug">{readablePermission(perm.action)}</span>
              <span className="mt-1 block break-all font-mono text-[0.68rem] text-gray-500 dark:text-gray-400">{perm.action}</span>
            </span>
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wide ${
                granted
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100'
                  : 'bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-gray-200'
              }`}
            >
              {granted ? <CheckCircleIcon className="h-3.5 w-3.5" /> : <XCircleIcon className="h-3.5 w-3.5" />}
              {granted ? grantedLabel : notGrantedLabel}
            </span>
          </label>
        )
      })}
    </div>
  )
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
    return <div className="text-sm text-gray-500 dark:text-gray-300">{t('empty.noPermissionsForUser')}</div>
  }

  return (
    <div className="space-y-4">
      {Object.entries(groupedPermissions).map(([group, perms], index) => {
        const sepIdx = group.indexOf(' / ')
        const resourceType = sepIdx === -1 ? group : group.slice(0, sepIdx)
        const grantedPermissions = perms.filter((p) => Boolean(permissionState[permissionKey(p)]))
        const missingPermissions = perms.filter((p) => !permissionState[permissionKey(p)])
        const grantedCount = grantedPermissions.length
        const missingCount = missingPermissions.length
        const isOpen = openScopes[group] ?? index === 0
        const subgroups = buildSubgroups(resourceType, perms, t)

        return (
          <section
            key={group}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
              onClick={() => setOpenScopes((current) => ({ ...current, [group]: !isOpen }))}
              aria-expanded={isOpen}
            >
              <div className="min-w-0">
                <h4 className="truncate text-lg font-semibold text-gray-900 dark:text-gray-50">
                  {scopeTitle(group, t)}
                </h4>
                <div className="mt-2 flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">
                    {t('grantedCount', { count: grantedCount })}
                  </span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700 dark:bg-slate-800 dark:text-gray-200">
                    {t('missingCount', { count: missingCount })}
                  </span>
                </div>
              </div>
              {isOpen ? <ChevronDownIcon className="h-5 w-5 shrink-0" /> : <ChevronRightIcon className="h-5 w-5 shrink-0" />}
            </button>

            {isOpen && (
              <div className="border-t border-gray-100 px-5 py-5 dark:border-slate-800">
                <div className="space-y-6">
                  {subgroups.map(({ label, permissions }) => {
                    const granted = permissions.filter((p) => Boolean(permissionState[permissionKey(p)]))
                    const missing = permissions.filter((p) => !permissionState[permissionKey(p)])
                    return (
                      <div key={label}>
                        <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          {label}
                        </div>
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/10">
                            <div className="mb-2 flex items-center justify-between gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-100">
                              <span>{t('sections.grantedRights')}</span>
                              <span>{granted.length}</span>
                            </div>
                            <PermissionRows
                              permissions={granted}
                              permissionState={permissionState}
                              onPermissionChange={onPermissionChange}
                              granted
                              emptyLabel={t('empty.noGrantedInScope')}
                              grantedLabel={t('status.granted')}
                              notGrantedLabel={t('status.notGranted')}
                            />
                          </div>
                          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                            <div className="mb-2 flex items-center justify-between gap-2 text-sm font-semibold text-gray-700 dark:text-gray-100">
                              <span>{t('sections.missingRights')}</span>
                              <span>{missing.length}</span>
                            </div>
                            <PermissionRows
                              permissions={missing}
                              permissionState={permissionState}
                              onPermissionChange={onPermissionChange}
                              granted={false}
                              emptyLabel={t('empty.noMissingInScope')}
                              grantedLabel={t('status.granted')}
                              notGrantedLabel={t('status.notGranted')}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
