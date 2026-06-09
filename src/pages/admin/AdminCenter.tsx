import React, { useEffect, useMemo, useState } from 'react'
import Panel from '@component/common/Panel'
import PrimaryButton from '@component/form/buttons/PrimaryButton'
import PrimaryOutlinedButton from '@component/form/buttons/PrimaryOutlinedButton'
import SecondaryButton from '@component/form/buttons/SecondaryButton'
import TrustDeck from '@service/TrustDeck'
import useProjectStore from '../../core/stores/ProjectStore'

type SectionKey = 'projects' | 'domains' | 'entityTypes' | 'entities' | 'pseudonyms' | 'permissions' | 'maintenance'

type ActionButtonProps = {
  label: string
  onClick: () => void
  variant?: 'primary' | 'outline' | 'danger'
  disabled?: boolean
}

const sections: { key: SectionKey; label: string; description: string }[] = [
  { key: 'projects', label: 'Projects', description: 'Project CRUD, image and statistics' },
  { key: 'domains', label: 'Domains', description: 'Group/domain tree and configuration' },
  { key: 'entityTypes', label: 'Entity types', description: 'Base types and project entity schemas' },
  { key: 'entities', label: 'Entities', description: 'Entity instances, linkage and pseudonyms' },
  { key: 'pseudonyms', label: 'Pseudonyms', description: 'Single and batch pseudonym workflows' },
  { key: 'permissions', label: 'Permissions', description: 'User, project, domain and global grants' },
  { key: 'maintenance', label: 'Maintenance', description: 'Health and database maintenance endpoints' }
]

const inputClass = 'w-full rounded-lg border border-color-light-gray px-3 py-2 font-font-text text-base'
const labelClass = 'mb-1 block text-sm font-semibold text-gray-700'

function parseJson<T>(value: string, fallback: T): T {
  if (!value.trim()) return fallback
  return JSON.parse(value) as T
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [value as T]
}

function toPrettyJson(value: unknown) {
  if (value === undefined) return ''
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

const TextField: React.FC<{
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}> = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <label className="block">
    <span className={labelClass}>{label}</span>
    <input
      className={inputClass}
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  </label>
)

const CheckField: React.FC<{
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}> = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2 rounded-lg border border-color-light-gray px-3 py-2 text-sm text-gray-700">
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    {label}
  </label>
)

const JsonField: React.FC<{
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
}> = ({ label, value, onChange, rows = 10 }) => (
  <label className="block">
    <span className={labelClass}>{label}</span>
    <textarea
      className={`${inputClass} font-mono text-sm`}
      rows={rows}
      spellCheck={false}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  </label>
)

const ActionButton: React.FC<ActionButtonProps> = ({ label, onClick, variant = 'primary', disabled }) => {
  const props = { label, onClick, disabled, className: 'min-w-[150px] justify-center' }
  if (variant === 'danger') return <SecondaryButton {...props} />
  if (variant === 'outline') return <PrimaryOutlinedButton {...props} />
  return <PrimaryButton {...props} />
}

const ActionRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-wrap gap-3">{children}</div>
)

const AdminCenter: React.FC = () => {
  const selectedProject = useProjectStore((state) => state.selectedProject)
  const [activeSection, setActiveSection] = useState<SectionKey>('projects')
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<unknown>(undefined)
  const [lastError, setLastError] = useState<string | null>(null)

  const [projectName, setProjectName] = useState(selectedProject?.abbreviation ?? '')
  const [domainName, setDomainName] = useState(selectedProject?.abbreviation ?? '')
  const [attributeName, setAttributeName] = useState('algorithm')
  const [entityTypeName, setEntityTypeName] = useState('person')
  const [trustdeckId, setTrustdeckId] = useState('')
  const [query, setQuery] = useState('*')
  const [psn, setPsn] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [idType, setIdType] = useState('id')
  const [targetDomain, setTargetDomain] = useState('')
  const [userId, setUserId] = useState('')
  const [permissionScope, setPermissionScope] = useState<'DOMAIN' | 'PROJECT' | 'GLOBAL'>('PROJECT')
  const [tableName, setTableName] = useState('')
  const [salt, setSalt] = useState('')
  const [recursive, setRecursive] = useState(false)
  const [allowEmptySalt, setAllowEmptySalt] = useState(false)
  const [jsonPayload, setJsonPayload] = useState('{\n  \n}')

  useEffect(() => {
    const abbreviation = selectedProject?.abbreviation
    if (!abbreviation) return
    setProjectName((current) => current || abbreviation)
    setDomainName((current) => current || abbreviation)
  }, [selectedProject?.abbreviation])

  const activeDescription = useMemo(
    () => sections.find((section) => section.key === activeSection)?.description ?? '',
    [activeSection]
  )

  const run = async (label: string, operation: () => Promise<unknown>) => {
    setLoadingLabel(label)
    setLastError(null)
    try {
      const result = await operation()
      setLastResult(result ?? { ok: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setLastError(message)
      setLastResult(undefined)
    } finally {
      setLoadingLabel(null)
    }
  }

  const payload = <T,>(fallback: T) => parseJson<T>(jsonPayload, fallback)
  const selectedResourceName = permissionScope === 'PROJECT' ? projectName : domainName

  return (
    <div className="flex w-full flex-col items-center">
      <div className="w-full max-w-7xl space-y-6">
        <div className="text-center">
          <h1>Backend administration</h1>
          <p className="mt-2 text-gray-500">
            Advanced UI for backend functionality that is not covered by the workflow pages yet.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {sections.map((section) => (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveSection(section.key)}
              className={`rounded-2xl border p-4 text-left transition ${
                activeSection === section.key
                  ? 'border-color-blue bg-color-blue text-white shadow-md'
                  : 'border-gray-200 bg-white hover:border-color-blue hover:bg-blue-50'
              }`}
            >
              <div className="font-semibold">{section.label}</div>
              <div className={`mt-1 text-sm ${activeSection === section.key ? 'text-white/80' : 'text-gray-500'}`}>
                {section.description}
              </div>
            </button>
          ))}
        </div>

        <Panel title={sections.find((section) => section.key === activeSection)?.label} className="w-full">
          <p className="mb-6 text-sm text-gray-500">{activeDescription}</p>

          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <TextField label="Project abbreviation" value={projectName} onChange={setProjectName} />
            <TextField label="Domain/group name" value={domainName} onChange={setDomainName} />
            <TextField label="Entity type" value={entityTypeName} onChange={setEntityTypeName} />
            <TextField label="Query" value={query} onChange={setQuery} />
          </div>

          {activeSection === 'projects' && (
            <div className="space-y-6">
              <JsonField
                label="Project payload"
                value={jsonPayload}
                onChange={setJsonPayload}
                rows={8}
              />
              <ActionRow>
                <ActionButton label="List projects" onClick={() => run('List projects', () => TrustDeck.instance().getProjects())} />
                <ActionButton label="Create project" onClick={() => run('Create project', () => TrustDeck.instance().createProject(payload({}) as never))} />
                <ActionButton label="Read project" onClick={() => run('Read project', () => TrustDeck.instance().getProject(projectName))} />
                <ActionButton label="Update project" onClick={() => run('Update project', () => TrustDeck.instance().updateProject(payload({}) as never, projectName))} />
                <ActionButton label="Statistics" onClick={() => run('Statistics', () => TrustDeck.instance().getProjectStatistics(projectName))} variant="outline" />
                <ActionButton label="Delete image" onClick={() => run('Delete image', () => TrustDeck.instance().deleteImage(projectName))} variant="outline" />
                <ActionButton label="Delete project" onClick={() => run('Delete project', () => TrustDeck.instance().deleteProject(projectName))} variant="danger" />
              </ActionRow>
            </div>
          )}

          {activeSection === 'domains' && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <TextField label="Attribute" value={attributeName} onChange={setAttributeName} />
                <TextField label="Salt" value={salt} onChange={setSalt} />
                <div className="space-y-2 pt-6">
                  <CheckField label="Recursive" checked={recursive} onChange={setRecursive} />
                  <CheckField label="Allow empty salt" checked={allowEmptySalt} onChange={setAllowEmptySalt} />
                </div>
              </div>
              <JsonField label="Domain payload" value={jsonPayload} onChange={setJsonPayload} />
              <ActionRow>
                <ActionButton label="Hierarchy" onClick={() => run('Hierarchy', () => TrustDeck.instance().getDomainsHierarchy())} />
                <ActionButton label="Subtree" onClick={() => run('Subtree', () => TrustDeck.instance().getGroups(domainName))} />
                <ActionButton label="Read domain" onClick={() => run('Read domain', () => TrustDeck.instance().getDomain(domainName))} />
                <ActionButton label="Read attribute" onClick={() => run('Read attribute', () => TrustDeck.instance().getDomainAttribute(domainName, attributeName))} variant="outline" />
                <ActionButton label="Create" onClick={() => run('Create domain', () => TrustDeck.instance().createGroup(payload({})))} />
                <ActionButton label="Create complete" onClick={() => run('Create complete domain', () => TrustDeck.instance().createGroupComplete(payload({})))} />
                <ActionButton label="Update" onClick={() => run('Update domain', () => TrustDeck.instance().updateGroup(domainName, payload({})))} />
                <ActionButton label="Update complete" onClick={() => run('Update complete domain', () => TrustDeck.instance().updateGroupComplete(domainName, recursive, payload({})))} />
                <ActionButton label="Update salt" onClick={() => run('Update salt', () => TrustDeck.instance().updateDomainSalt(domainName, salt, allowEmptySalt))} variant="outline" />
                <ActionButton label="Delete" onClick={() => run('Delete domain', () => TrustDeck.instance().deleteGroup(domainName, recursive))} variant="danger" />
              </ActionRow>
            </div>
          )}

          {activeSection === 'entityTypes' && (
            <div className="space-y-6">
              <JsonField label="Entity type payload" value={jsonPayload} onChange={setJsonPayload} />
              <ActionRow>
                <ActionButton label="Search base types" onClick={() => run('Search base types', () => TrustDeck.instance().getBaseTypes(query))} />
                <ActionButton label="Create base type" onClick={() => run('Create base type', () => TrustDeck.instance().createBaseType(payload({}) as never))} />
                <ActionButton label="Read base type" onClick={() => run('Read base type', () => TrustDeck.instance().getBaseType(entityTypeName))} variant="outline" />
                <ActionButton label="List project types" onClick={() => run('List project types', () => TrustDeck.instance().getProjectEntities(query, projectName))} />
                <ActionButton label="Create project type" onClick={() => run('Create project type', () => TrustDeck.instance().createEntityConfig(payload({}) as never))} />
                <ActionButton label="Read project type" onClick={() => run('Read project type', () => TrustDeck.instance().getType(entityTypeName, projectName))} variant="outline" />
                <ActionButton label="Update project type" onClick={() => run('Update project type', () => TrustDeck.instance().updateEntityConfig(entityTypeName, payload({}) as never, projectName))} />
                <ActionButton label="Deprecate type" onClick={() => run('Deprecate type', () => TrustDeck.instance().deleteEntityConfig(entityTypeName, projectName))} variant="danger" />
              </ActionRow>
            </div>
          )}

          {activeSection === 'entities' && (
            <div className="space-y-6">
              <TextField label="TrustDeck ID" value={trustdeckId} onChange={setTrustdeckId} />
              <JsonField label="Entity payload / linkage payload" value={jsonPayload} onChange={setJsonPayload} />
              <ActionRow>
                <ActionButton label="Search entities" onClick={() => run('Search entities', () => TrustDeck.instance().searchEntities(entityTypeName, query, projectName))} />
                <ActionButton label="Create entity" onClick={() => run('Create entity', () => TrustDeck.instance().postEntity(entityTypeName, payload({})))} />
                <ActionButton label="Read entity" onClick={() => run('Read entity', () => TrustDeck.instance().getEntity(entityTypeName, trustdeckId, projectName))} variant="outline" />
                <ActionButton label="Update entity" onClick={() => run('Update entity', () => TrustDeck.instance().putEntity(entityTypeName, payload({}), trustdeckId))} />
                <ActionButton label="Pseudonyms" onClick={() => run('Entity pseudonyms', () => TrustDeck.instance().getEntityPseudonyms(entityTypeName, trustdeckId, projectName))} variant="outline" />
                <ActionButton label="Record linkage" onClick={() => run('Record linkage', () => TrustDeck.instance().recordLinkage(entityTypeName, payload({}), projectName))} />
                <ActionButton label="Delete entity" onClick={() => run('Delete entity', () => TrustDeck.instance().deleteEntity(entityTypeName, trustdeckId, projectName))} variant="danger" />
              </ActionRow>
            </div>
          )}

          {activeSection === 'pseudonyms' && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <TextField label="PSN" value={psn} onChange={setPsn} />
                <TextField label="Identifier" value={identifier} onChange={setIdentifier} />
                <TextField label="ID type" value={idType} onChange={setIdType} />
                <TextField label="Target domain" value={targetDomain} onChange={setTargetDomain} />
              </div>
              <JsonField label="Pseudonym payload / batch array" value={jsonPayload} onChange={setJsonPayload} />
              <ActionRow>
                <ActionButton label="Create" onClick={() => run('Create pseudonym', () => TrustDeck.instance().createPseudonym(payload({ identifierItem: { identifier, idType } }), domainName))} />
                <ActionButton label="Create batch" onClick={() => run('Create pseudonym batch', () => TrustDeck.instance().createPseudonymsBatch(asArray(payload({ identifierItem: { identifier, idType } })), domainName))} />
                <ActionButton label="Read by PSN" onClick={() => run('Read by PSN', () => TrustDeck.instance().searchPseudonym(psn, domainName))} />
                <ActionButton label="Read by ID" onClick={() => run('Read by identifier', () => TrustDeck.instance().getPseudonymByIdentifier(domainName, identifier, idType))} />
                <ActionButton label="Search" onClick={() => run('Search pseudonyms', () => TrustDeck.instance().searchPseudonyms(domainName, query))} />
                <ActionButton label="Batch read" onClick={() => run('Batch read', () => TrustDeck.instance().getPseudonymsBatch(domainName))} variant="outline" />
                <ActionButton label="Validate" onClick={() => run('Validate pseudonym', () => TrustDeck.instance().validatePseudonym(domainName, psn))} variant="outline" />
                <ActionButton label="Linked" onClick={() => run('Linked pseudonyms', () => TrustDeck.instance().getLinkedPseudonyms(domainName, targetDomain))} variant="outline" />
                <ActionButton label="Update" onClick={() => run('Update pseudonym', () => TrustDeck.instance().updatePseudonym(domainName, payload({})))} />
                <ActionButton label="Update complete" onClick={() => run('Complete update', () => TrustDeck.instance().updatePseudonymComplete(domainName, payload({})))} />
                <ActionButton label="Update batch" onClick={() => run('Update batch', () => TrustDeck.instance().updatePseudonymsBatch(domainName, asArray(payload({}))))} />
                <ActionButton label="Delete" onClick={() => run('Delete pseudonym', () => TrustDeck.instance().deletePseudonym(domainName, payload({ psn })))} variant="danger" />
                <ActionButton label="Delete batch" onClick={() => run('Delete batch', () => TrustDeck.instance().deletePseudonymsBatch(domainName, asArray(payload({ psn }))))} variant="danger" />
              </ActionRow>
            </div>
          )}

          {activeSection === 'permissions' && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <TextField label="User ID" value={userId} onChange={setUserId} />
                <label className="block">
                  <span className={labelClass}>Scope</span>
                  <select
                    className={inputClass}
                    value={permissionScope}
                    onChange={(event) => setPermissionScope(event.target.value as 'DOMAIN' | 'PROJECT' | 'GLOBAL')}
                  >
                    <option value="DOMAIN">Domain</option>
                    <option value="PROJECT">Project</option>
                    <option value="GLOBAL">Global</option>
                  </select>
                </label>
                <TextField label="User search query" value={query} onChange={setQuery} />
              </div>
              <JsonField label="Permission grant/update array" value={jsonPayload} onChange={setJsonPayload} />
              <ActionRow>
                <ActionButton label="Search users" onClick={() => run('Search users', () => TrustDeck.instance().searchOperators(query))} />
                <ActionButton label="Defined actions" onClick={() => run('Defined actions', () => TrustDeck.instance().getDefinedPermissions())} variant="outline" />
                <ActionButton
                  label="Create grants"
                  onClick={() => run('Create grants', () => {
                    const grants = asArray(payload({ subjectId: userId, resourceType: permissionScope, action: '', decision: 'ALLOW' }))
                    if (permissionScope === 'DOMAIN') return TrustDeck.instance().createDomainPermissions(domainName, grants as never)
                    if (permissionScope === 'PROJECT') return TrustDeck.instance().createProjectPermissions(projectName, grants as never)
                    return TrustDeck.instance().createGlobalPermissions(grants as never)
                  })}
                />
                <ActionButton
                  label="Read grants"
                  onClick={() => run('Read grants', () => {
                    if (permissionScope === 'DOMAIN') return TrustDeck.instance().getDomainPermissions(domainName, userId)
                    if (permissionScope === 'PROJECT') return TrustDeck.instance().getProjectPermissions(projectName, userId)
                    return TrustDeck.instance().getGlobalPermissions(userId)
                  })}
                />
                <ActionButton
                  label="Update grants"
                  onClick={() => run('Update grants', () => {
                    const updates = asArray(payload({ subjectId: userId, resourceType: permissionScope, action: '', decision: 'ALLOW' }))
                    if (permissionScope === 'DOMAIN') return TrustDeck.instance().updateDomainPermissionGrants(domainName, userId, updates as never)
                    if (permissionScope === 'PROJECT') return TrustDeck.instance().updateProjectPermissionGrants(projectName, userId, updates as never)
                    return TrustDeck.instance().updateGlobalPermissions(userId, updates as never)
                  })}
                />
                <ActionButton
                  label="Delete grants"
                  onClick={() => run('Delete grants', () => {
                    const grants = asArray(payload({ subjectId: userId, resourceType: permissionScope, action: '', decision: 'ALLOW' }))
                    if (permissionScope === 'DOMAIN') return TrustDeck.instance().deleteDomainPermissions(domainName, userId, grants as never)
                    if (permissionScope === 'PROJECT') return TrustDeck.instance().deleteProjectPermissions(projectName, userId, grants as never)
                    return TrustDeck.instance().deleteGlobalPermissions(userId, grants as never)
                  })}
                  variant="danger"
                />
              </ActionRow>
              <p className="text-xs text-gray-400">Current resource for this scope: {selectedResourceName || 'none'}</p>
            </div>
          )}

          {activeSection === 'maintenance' && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="Table name" value={tableName} onChange={setTableName} />
                <TextField label="Role/domain name" value={domainName} onChange={setDomainName} />
              </div>
              <ActionRow>
                <ActionButton label="Ping backend" onClick={() => run('Ping backend', () => TrustDeck.instance().ping())} />
                <ActionButton label="Table storage" onClick={() => run('Table storage', () => TrustDeck.instance().getTableStorage(tableName))} variant="outline" />
                <ActionButton label="Delete table" onClick={() => run('Delete table', () => TrustDeck.instance().deleteTable(tableName))} variant="danger" />
                <ActionButton label="Delete role" onClick={() => run('Delete role', () => TrustDeck.instance().deleteRole(domainName))} variant="danger" />
              </ActionRow>
            </div>
          )}
        </Panel>

        <Panel title={loadingLabel ? `Running: ${loadingLabel}` : 'Last backend response'} className="w-full">
          {lastError && (
            <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {lastError}
            </pre>
          )}
          {!lastError && (
            <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-sm text-slate-50">
              {toPrettyJson(lastResult) || 'Run an operation to see the backend response here.'}
            </pre>
          )}
        </Panel>
      </div>
    </div>
  )
}

export default AdminCenter
