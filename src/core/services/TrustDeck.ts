import { Operator, Permission } from 'core/types/Permission'
import { Domain } from '../types/Domain'
import { ProjectType } from '../../pages/projects/types/ProjectType'
import useProjectStore from '../stores/ProjectStore.ts'
import { PersonType } from '../types/PersonEntity.ts'
import { BioSampleEntity } from 'core/types/BioSampleEntity.ts'
import { Pseudonym } from '../../core/types/Pseudonym.ts'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'
export type QueryParams = Record<string, string | number | boolean | null | undefined>

export type IdentifierItem = {
  identifier: string
  idType: string
}

export type PseudonymCreatePayload = {
  identifierItem: IdentifierItem
  psn?: string
  validFrom?: string
  validTo?: string
  validityTime?: string
  omitPrefix?: boolean
}

export type PseudonymUpdatePayload = {
  oldIdentifierItem?: IdentifierItem
  oldPsn?: string
  newIdentifierItem?: IdentifierItem
  newPsn?: string
  validFrom?: string
  validFromInherited?: boolean
  validTo?: string
  validToInherited?: boolean
  validityTime?: string
  newDomainName?: string
}

export type EntityTypePayload = {
  name: string
  version: string
  isDeprecated?: boolean
  isBaseType?: boolean
  typeDefinition: unknown
  baseTypeName?: string
  associatedDomainName?: string
  projectName?: string
}

export type EntityInstancePayload = {
  data: unknown
}

export type PermissionGrant = {
  subjectId: string
  resourceType: 'DOMAIN' | 'PROJECT' | 'GLOBAL' | string
  domainName?: string
  projectAbbreviation?: string
  action: string
  decision: 'ALLOW' | 'DENY' | string
  validFrom?: string
  validTo?: string
}

export type PermissionUpdate = {
  oldSubjectId?: string
  oldResourceType?: string
  oldAction?: string
  oldDomainName?: string
  oldProjectName?: string
  newSubjectId?: string
  newResourceType?: string
  newAction?: string
  decision?: 'ALLOW' | 'DENY' | string
  validFrom?: string
  validTo?: string
  domainName?: string
  projectName?: string
}

export type TableStorageInfo = {
  tableName?: string
  totalSize?: string
  tableSize?: string
  indexSize?: string
  [key: string]: unknown
}

class TrustDeck {
  private static thisInstance: TrustDeck
  private token = ''
  private baseUrl: string

  private constructor() {
    const baseUrl = window.__ENV__?.API_BASE_URL ?? import.meta.env.VITE_API_BASE_URL
    if (!baseUrl) {
      throw new Error('API_BASE_URL is not configured')
    }
    this.baseUrl = baseUrl.replace(/\/+$/, '')
  }

  public static instance(): TrustDeck {
    if (!TrustDeck.thisInstance) {
      TrustDeck.thisInstance = new TrustDeck()
    }
    return TrustDeck.thisInstance
  }

  public setToken(token: string) {
    this.token = token
  }

  public clearToken() {
    this.token = ''
  }

  public hasAccessToken() {
    return Boolean(this.token)
  }

  public getAccessToken() {
    return this.token
  }

  private requireAccessToken() {
    if (!this.token) {
      throw new Error('No access token available; backend request was not sent')
    }
  }

  private getSelectedProjectName(): string {
    const selectedProject = useProjectStore.getState().selectedProject
    if (!selectedProject) throw new Error('No project selected')
    return selectedProject.abbreviation
  }

  private buildUrl(path: string, params?: QueryParams): URL {
    const url = new URL(`${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, String(value))
        }
      })
    }
    return url
  }

  private async parseResponse<T>(res: Response): Promise<T> {
    if (res.status === 204) return {} as T

    const contentType = res.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      return res.json() as Promise<T>
    }

    const text = await res.text()
    if (!text) return {} as T
    return text as T
  }

  private async request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    params?: QueryParams
  ): Promise<T> {
    this.requireAccessToken()
    const url = this.buildUrl(path, params)
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }
    if (this.token) headers.Authorization = `Bearer ${this.token}`

    const res = await fetch(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Request failed: ${res.status} ${errorText}`)
    }

    return this.parseResponse<T>(res)
  }

  private async multipartRequest<T>(
    method: 'POST' | 'PUT',
    path: string,
    formData: FormData
  ): Promise<T> {
    this.requireAccessToken()
    const headers: HeadersInit = {}
    if (this.token) headers.Authorization = `Bearer ${this.token}`

    const res = await fetch(this.buildUrl(path).toString(), {
      method,
      headers,
      body: formData
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Upload failed: ${res.status} ${errorText}`)
    }

    return this.parseResponse<T>(res)
  }

  // API health and maintenance
  public async ping() {
    return this.request<string>('GET', '/ping')
  }

  public async getTableStorage(tableName: string) {
    return this.request<TableStorageInfo>('GET', `/tables/${encodeURIComponent(tableName)}/storage`)
  }

  public async deleteTable(tableName: string) {
    return this.request<unknown>('DELETE', `/tables/${encodeURIComponent(tableName)}`)
  }

  public async deleteRole(domainName: string) {
    return this.request<unknown>('DELETE', `/roles/${encodeURIComponent(domainName)}`)
  }

  // Projects
  public async postProject(project: ProjectType) {
    return this.request<ProjectType>('POST', '/projects', project)
  }

  public async createProject(project: ProjectType) {
    return this.postProject(project)
  }

  public async getProjects() {
    return this.request<ProjectType[]>('GET', '/projects')
  }

  public async getProject(projectAbbreviation?: string) {
    const projectName = projectAbbreviation ?? this.getSelectedProjectName()
    return this.request<ProjectType>('GET', `/projects/${encodeURIComponent(projectName)}`)
  }

  public async getProjectStatistics(projectAbbreviation?: string) {
    const projectName = projectAbbreviation ?? this.getSelectedProjectName()
    return this.request<Record<string, unknown>>(
      'GET',
      `/projects/${encodeURIComponent(projectName)}/statistics`
    )
  }

  public async updateProject(project: ProjectType, projectAbbreviation?: string) {
    const projectName = projectAbbreviation ?? this.getSelectedProjectName()
    return this.request<ProjectType>(
      'PUT',
      `/projects/${encodeURIComponent(projectName)}`,
      project
    )
  }

  public async deleteProject(projectAbbreviation?: string) {
    const projectName = projectAbbreviation ?? this.getSelectedProjectName()
    return this.request<ProjectType>('DELETE', `/projects/${encodeURIComponent(projectName)}`)
  }

  // Project image
  public async createImage(file: File) {
    const projectName = this.getSelectedProjectName()
    let method: 'POST' | 'PUT' = 'POST'
    try {
      await this.getImage()
      method = 'PUT'
    } catch {
      method = 'POST'
    }

    const formData = new FormData()
    formData.append('image', file)
    return this.multipartRequest<unknown>(method, `/projects/${encodeURIComponent(projectName)}/image`, formData)
  }

  public async getImage(projectAbbreviation?: string): Promise<Blob> {
    this.requireAccessToken()
    const projectName = projectAbbreviation ?? this.getSelectedProjectName()
    const headers: HeadersInit = {}
    if (this.token) headers.Authorization = `Bearer ${this.token}`

    const res = await fetch(
      this.buildUrl(`/projects/${encodeURIComponent(projectName)}/image`).toString(),
      { method: 'GET', headers }
    )

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Failed to fetch image: ${res.status} ${errorText}`)
    }

    return res.blob()
  }

  public async deleteImage(projectAbbreviation?: string) {
    const projectName = projectAbbreviation ?? this.getSelectedProjectName()
    return this.request<unknown>('DELETE', `/projects/${encodeURIComponent(projectName)}/image`)
  }

  // Domains/groups
  public async getDomain(name?: string) {
    const domainName = name ?? this.getSelectedProjectName()
    return this.request<Domain[]>('GET', '/domains', undefined, { name: domainName })
  }

  public async getDomainAttribute(domainName: string, attribute: string) {
    return this.request<unknown>(
      'GET',
      `/domains/${encodeURIComponent(domainName)}/${encodeURIComponent(attribute)}`
    )
  }

  public async getDomainsHierarchy() {
    return this.request<Domain[]>('GET', '/domains/hierarchy')
  }

  public async createGroup(payload: unknown) {
    return this.request<any>('POST', '/domains', payload)
  }

  public async createGroupComplete(payload: unknown) {
    return this.request<any>('POST', '/domains/complete', payload)
  }

  public async updateGroup(groupName: string, payload: unknown) {
    return this.request<any>('PUT', '/domains', payload, { name: groupName })
  }

  public async updateGroupComplete(groupName: string, recursive: boolean, payload: unknown): Promise<any> {
    return this.request<any>('PUT', '/domains/complete', payload, {
      name: groupName,
      recursive
    })
  }

  public async updateDomainSalt(domainName: string, salt: string, allowEmpty = false) {
    return this.request<any>(
      'PUT',
      `/domains/${encodeURIComponent(domainName)}/salt`,
      undefined,
      { salt, allowEmpty }
    )
  }

  public async deleteGroup(groupName: string, recursive: boolean) {
    return this.request<any>('DELETE', '/domains', undefined, {
      name: groupName,
      recursive
    })
  }

  public async getGroups(domainName?: string) {
    const projectName = domainName ?? this.getSelectedProjectName()
    return this.request<any>('GET', `/domains/${encodeURIComponent(projectName)}/subtree`)
  }

  // Entity types
  public async getBaseTypes(query = '*') {
    return this.request<EntityTypePayload[]>('GET', '/entities/base-types', undefined, { query })
  }

  public async createBaseType(payload: EntityTypePayload) {
    return this.request<EntityTypePayload>('POST', '/entities/base-types', payload)
  }

  public async getBaseType(entityTypeName: string) {
    return this.request<EntityTypePayload>(
      'GET',
      `/entities/base-types/${encodeURIComponent(entityTypeName)}`
    )
  }

  public async getProjectEntities(query = '*', projectAbbreviation?: string) {
    const projectName = projectAbbreviation ?? this.getSelectedProjectName()
    return this.request<EntityTypePayload[]>(
      'GET',
      `/projects/${encodeURIComponent(projectName)}/entities`,
      undefined,
      { query }
    )
  }

  public async createEntityConfig(payload: EntityTypePayload) {
    const projectName = this.getSelectedProjectName()
    return this.request<EntityTypePayload>(
      'POST',
      `/projects/${encodeURIComponent(projectName)}/entities/config`,
      payload
    )
  }

  public async getType(type: string, projectAbbreviation?: string) {
    const projectName = projectAbbreviation ?? this.getSelectedProjectName()
    return this.request<EntityTypePayload>(
      'GET',
      `/projects/${encodeURIComponent(projectName)}/entities/config/${encodeURIComponent(type)}`
    )
  }

  public async updateEntityConfig(entityTypeName: string, payload: EntityTypePayload, projectAbbreviation?: string) {
    const projectName = projectAbbreviation ?? this.getSelectedProjectName()
    return this.request<EntityTypePayload>(
      'PUT',
      `/projects/${encodeURIComponent(projectName)}/entities/config/${encodeURIComponent(entityTypeName)}`,
      payload
    )
  }

  public async deleteEntityConfig(entityTypeName: string, projectAbbreviation?: string) {
    const projectName = projectAbbreviation ?? this.getSelectedProjectName()
    return this.request<unknown>(
      'DELETE',
      `/projects/${encodeURIComponent(projectName)}/entities/config/${encodeURIComponent(entityTypeName)}`
    )
  }

  // Entity instances
  public async fuzzySearch(entity: string, query: string) {
    const projectName = this.getSelectedProjectName()
    return this.request<PersonType[]>(
      'GET',
      `/projects/${encodeURIComponent(projectName)}/entities/${encodeURIComponent(entity)}`,
      undefined,
      { query }
    )
  }

  public async searchEntities(entityTypeName: string, query = '*', projectAbbreviation?: string) {
    const projectName = projectAbbreviation ?? this.getSelectedProjectName()
    return this.request<unknown[]>(
      'GET',
      `/projects/${encodeURIComponent(projectName)}/entities/${encodeURIComponent(entityTypeName)}`,
      undefined,
      { query }
    )
  }

  public async getEntity(entityTypeName: string, trustdeckID: string, projectAbbreviation?: string) {
    const projectName = projectAbbreviation ?? this.getSelectedProjectName()
    return this.request<any>(
      'GET',
      `/projects/${encodeURIComponent(projectName)}/entities/${encodeURIComponent(entityTypeName)}/${encodeURIComponent(trustdeckID)}`
    )
  }

  public async postEntity(entityType: string, payload: unknown) {
    const projectName = this.getSelectedProjectName()
    return this.request<any>(
      'POST',
      `/projects/${encodeURIComponent(projectName)}/entities/${encodeURIComponent(entityType)}`,
      payload
    )
  }

  public async putEntity(entityType: string, payload: unknown, trustdeckID: string) {
    const projectName = this.getSelectedProjectName()
    return this.request<any>(
      'PUT',
      `/projects/${encodeURIComponent(projectName)}/entities/${encodeURIComponent(entityType)}/${encodeURIComponent(trustdeckID)}`,
      payload
    )
  }

  public async deleteEntity(entityTypeName: string, trustdeckID: string, projectAbbreviation?: string) {
    const projectName = projectAbbreviation ?? this.getSelectedProjectName()
    return this.request<unknown>(
      'DELETE',
      `/projects/${encodeURIComponent(projectName)}/entities/${encodeURIComponent(entityTypeName)}/${encodeURIComponent(trustdeckID)}`
    )
  }

  public async getEntityPseudonyms(entityTypeName: string, trustdeckID: string, projectAbbreviation?: string) {
    const projectName = projectAbbreviation ?? this.getSelectedProjectName()
    return this.request<Pseudonym[]>(
      'GET',
      `/projects/${encodeURIComponent(projectName)}/entities/${encodeURIComponent(entityTypeName)}/${encodeURIComponent(trustdeckID)}/pseudonyms`
    )
  }

  public async recordLinkage(entityTypeName: string, payload: unknown, projectAbbreviation?: string) {
    const projectName = projectAbbreviation ?? this.getSelectedProjectName()
    return this.request<any>(
      'POST',
      `/projects/${encodeURIComponent(projectName)}/entities/${encodeURIComponent(entityTypeName)}/record-linkage`,
      payload
    )
  }

  public async postPerson(person: unknown) {
    return this.postEntity('person', person)
  }

  public async getPerson(trustdeckID: string) {
    return this.getEntity('person', trustdeckID)
  }

  public async putPerson(updatedPerson: unknown, trustdeckID: string) {
    return this.putEntity('person', updatedPerson, trustdeckID)
  }

  public async postBiosample(biosample: BioSampleEntity) {
    return this.postEntity('biosample', biosample) as Promise<BioSampleEntity>
  }

  public async recordLinkagePerson(person: unknown) {
    return this.recordLinkage('person', person)
  }

  // Pseudonyms
  public async createPseudonym(payload: PseudonymCreatePayload, selectedGroup: string) {
    return this.request<Pseudonym>('POST', `/domains/${encodeURIComponent(selectedGroup)}/pseudonyms`, payload)
  }

  public async createPseudonymsBatch(payload: PseudonymCreatePayload[], domainName: string) {
    return this.request<Pseudonym[]>('POST', `/domains/${encodeURIComponent(domainName)}/pseudonyms/batch`, payload)
  }

  public async searchPseudonym(query: string, domain?: string): Promise<Pseudonym> {
    const domainName = domain ?? this.getSelectedProjectName()
    return this.request<Pseudonym>('GET', `/domains/${encodeURIComponent(domainName)}/pseudonyms`, undefined, {
      psn: query
    })
  }

  public async getPseudonymByIdentifier(domainName: string, identifier: string, idType: string) {
    return this.request<Pseudonym>('GET', `/domains/${encodeURIComponent(domainName)}/pseudonyms`, undefined, {
      id: identifier,
      idType
    })
  }

  public async searchPseudonyms(domainName: string, query = '*') {
    return this.request<Pseudonym[]>('GET', `/domains/${encodeURIComponent(domainName)}/pseudonyms`, undefined, {
      query
    })
  }

  public async getPseudonymsBatch(domainName: string) {
    return this.request<Pseudonym[]>('GET', `/domains/${encodeURIComponent(domainName)}/pseudonyms/batch`)
  }

  public async updatePseudonym(domainName: string, payload: PseudonymUpdatePayload) {
    return this.request<Pseudonym>('PUT', `/domains/${encodeURIComponent(domainName)}/pseudonyms`, payload)
  }

  public async updatePseudonymComplete(domainName: string, payload: PseudonymUpdatePayload) {
    return this.request<Pseudonym>('PUT', `/domains/${encodeURIComponent(domainName)}/pseudonyms/complete`, payload)
  }

  public async updatePseudonymsBatch(domainName: string, payload: PseudonymUpdatePayload[]) {
    return this.request<Pseudonym[]>('PUT', `/domains/${encodeURIComponent(domainName)}/pseudonyms/batch`, payload)
  }

  public async deletePseudonym(domainName: string, payload: { identifierItem?: IdentifierItem; psn?: string }) {
    return this.request<unknown>('DELETE', `/domains/${encodeURIComponent(domainName)}/pseudonyms`, payload)
  }

  public async deletePseudonymsBatch(domainName: string, payload: { identifierItem?: IdentifierItem; psn?: string }[]) {
    return this.request<unknown>('DELETE', `/domains/${encodeURIComponent(domainName)}/pseudonyms/batch`, payload)
  }

  public async validatePseudonym(domainName: string, psn: string) {
    return this.request<unknown>('GET', `/domains/${encodeURIComponent(domainName)}/pseudonyms/validation`, undefined, {
      psn
    })
  }

  public async getLinkedPseudonyms(sourceDomain: string, targetDomain: string) {
    return this.request<Pseudonym[]>('GET', '/domains/linked-pseudonyms', undefined, {
      sourceDomain,
      targetDomain
    })
  }

  // Permissions/users
  public async searchOperators(q: string) {
    return this.request<Operator[]>('GET', '/permissions/users', undefined, { query: q })
  }

  public async getDefinedPermissions() {
    return this.request<{ resourceType: string; action: string }[]>('GET', '/permissions')
  }

  public async createDomainPermissions(domainName: string, permissions: PermissionGrant[]) {
    return this.request<PermissionGrant[]>('POST', `/permissions/domains/${encodeURIComponent(domainName)}`, permissions)
  }

  public async createProjectPermissions(projectAbbreviation: string, permissions: PermissionGrant[]) {
    return this.request<PermissionGrant[]>('POST', `/permissions/projects/${encodeURIComponent(projectAbbreviation)}`, permissions)
  }

  public async createGlobalPermissions(permissions: PermissionGrant[]) {
    return this.request<PermissionGrant[]>('POST', '/permissions/global', permissions)
  }

  public async getDomainPermissions(domainName: string, userId?: string) {
    return this.request<Permission[]>('GET', `/permissions/domains/${encodeURIComponent(domainName)}`, undefined, {
      userId
    })
  }

  public async getProjectPermissions(projectAbbreviation?: string, userId?: string) {
    const projectName = projectAbbreviation ?? this.getSelectedProjectName()
    return this.request<Permission[]>('GET', `/permissions/projects/${encodeURIComponent(projectName)}`, undefined, {
      userId
    })
  }

  public async getGlobalPermissions(userId?: string) {
    return this.request<Permission[]>('GET', '/permissions/global', undefined, { userId })
  }

  public async updateDomainPermissions(userId: string, permissions: PermissionUpdate[] | PermissionGrant[]) {
    const projectName = this.getSelectedProjectName()
    return this.request<unknown>('PUT', `/permissions/domains/${encodeURIComponent(projectName)}`, permissions, {
      userId
    })
  }

  public async updateProjectPermissions(userId: string, permissions: PermissionUpdate[] | PermissionGrant[]) {
    const projectName = this.getSelectedProjectName()
    return this.request<unknown>('PUT', `/permissions/projects/${encodeURIComponent(projectName)}`, permissions, {
      userId
    })
  }

  public async updateGlobalPermissions(userId: string, permissions: PermissionUpdate[] | PermissionGrant[]) {
    return this.request<unknown>('PUT', '/permissions/global', permissions, { userId })
  }

  public async updateDomainPermissionGrants(domainName: string, userId: string, permissions: PermissionUpdate[]) {
    return this.request<unknown>('PUT', `/permissions/domains/${encodeURIComponent(domainName)}`, permissions, {
      userId
    })
  }

  public async updateProjectPermissionGrants(projectAbbreviation: string, userId: string, permissions: PermissionUpdate[]) {
    return this.request<unknown>('PUT', `/permissions/projects/${encodeURIComponent(projectAbbreviation)}`, permissions, {
      userId
    })
  }

  public async deleteDomainPermissions(domainName: string, userId: string, permissions: PermissionGrant[]) {
    return this.request<unknown>('DELETE', `/permissions/domains/${encodeURIComponent(domainName)}`, permissions, {
      userId
    })
  }

  public async deleteProjectPermissions(projectAbbreviation: string, userId: string, permissions: PermissionGrant[]) {
    return this.request<unknown>('DELETE', `/permissions/projects/${encodeURIComponent(projectAbbreviation)}`, permissions, {
      userId
    })
  }

  public async deleteGlobalPermissions(userId: string, permissions: PermissionGrant[]) {
    return this.request<unknown>('DELETE', '/permissions/global', permissions, { userId })
  }

  public async getUserPermissions(userId: string) {
    return this.getProjectPermissions(undefined, userId)
  }

  public async getFlatRootDomainTree(rootDomainName: string) {
    const domainHierarchy = await this.getDomainsHierarchy()
    const root = domainHierarchy.find((d) => d.name === rootDomainName)
    if (!root) return []

    function collect(node: Domain): Domain[] {
      const children = domainHierarchy.filter((d) => d.superDomainName === node.name)
      return [node, ...children.flatMap(collect)]
    }

    const allDomainsUnderRoot = collect(root)
    const domainMap = new Map<string | undefined, Domain[]>()
    allDomainsUnderRoot.forEach((domain) => {
      const key = domain.superDomainName
      if (!domainMap.has(key)) domainMap.set(key, [])
      domainMap.get(key)!.push(domain)
    })

    const result: Domain[] = []
    const queue: Domain[] = []
    const rootDomain = allDomainsUnderRoot.find(
      (d) => !d.superDomainName || d.superDomainName === null || d.name === rootDomainName
    )
    if (rootDomain) queue.push(rootDomain)

    while (queue.length > 0) {
      const current = queue.shift()
      if (!current) continue
      result.push(current)
      const children = domainMap.get(current.name) || []
      queue.push(...children)
    }
    return result
  }
}

export default TrustDeck
