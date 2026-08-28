/*
 * Trust Deck Services
 * Copyright 2024-2026 Armin Müller and Loic Khodarkovsky
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Operator, Permission } from 'core/types/Permission'
import { Domain } from '../types/Domain'
import { ProjectType } from '../../pages/projects/types/ProjectType'
import useProjectStore from '../stores/ProjectStore'
import { PersonType } from '../types/PersonEntity'
import { BioSampleEntity } from 'core/types/BioSampleEntity'
import { Pseudonym } from '../../core/types/Pseudonym'

/** Identifies an HTTP method supported by the API client. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

/** Represents a failed API response, including its status and body. */
export class TrustDeckHttpError extends Error {
  status: number
  body: string

  constructor(message: string, status: number, body: string) {
    super(message)
    this.name = 'TrustDeckHttpError'
    this.status = status
    this.body = body
  }
}

/** Represents supported URL query parameter values. */
export type QueryParams = Record<
  string,
  string | number | boolean | null | undefined
>

/** Identifies an external identifier and its type. */
export type IdentifierItem = {
  identifier: string
  idType: string
}

/** Defines the request payload for creating a pseudonym. */
export type PseudonymCreatePayload = {
  identifierItem: IdentifierItem
  psn?: string
  validFrom?: string
  validTo?: string
  validityTime?: string
  omitPrefix?: boolean
}

/** Defines the request payload for updating a pseudonym. */
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

/** Defines an entity type configuration sent to the API. */
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

/** Defines an entity payload sent to the API. */
export type EntityPayload = {
  data: unknown
}

/** Contains a created entity and whether the API created a new record. */
export type EntityCreationResult<T = Record<string, any>> = {
  entity: T
  created: boolean
}

export type RecordLinkageCreationResolution = 'CREATE_ORIGINAL'

export type RecordLinkageCandidate = {
  entity: Record<string, any>
  score: number
  normalizedScore: number
  matchedOn?: string[]
  candidateStatus?: 'ACTIVE' | 'DELETED' | string
}

export type ProjectDomain = {
  name: string
  prefix?: string
  projectAbbreviation: string
  superDomainName?: string
}

export type PermissionGrant = {
  subjectId: string
  resourceType: 'DOMAIN' | 'PROJECT' | 'ENTITY_TYPE' | 'GLOBAL' | string
  domainName?: string
  projectAbbreviation?: string
  entityTypeName?: string
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
  oldEntityTypeName?: string
  newSubjectId?: string
  newResourceType?: string
  newAction?: string
  decision?: 'ALLOW' | 'DENY' | string
  validFrom?: string
  validTo?: string
  domainName?: string
  projectName?: string
  entityTypeName?: string
}

export type EntityTypePermissionGrant = PermissionGrant & {
  resourceType: 'ENTITY_TYPE'
  entityTypeName: string
}

export type EntityTypePermissionUpdate = PermissionUpdate & {
  entityTypeName: string
}

export type TableStorageInfo = {
  tableName?: string
  totalSize?: string
  tableSize?: string
  indexSize?: string
  [key: string]: unknown
}

/**
 * Central, authenticated client for the TrustDeck backend API.
 *
 * The client is a singleton because all feature services must share the active token.
 */
class TrustDeck {
  private static thisInstance: TrustDeck
  private token = ''
  private baseUrl: string

  private constructor() {
    const baseUrl =
      window.__ENV__?.API_BASE_URL ?? import.meta.env.VITE_API_BASE_URL
    if (!baseUrl) {
      throw new Error('API_BASE_URL is not configured')
    }
    this.baseUrl = baseUrl.replace(/\/+$/, '')
  }

  /** Returns the shared API client instance. */
  public static instance(): TrustDeck {
    if (!TrustDeck.thisInstance) {
      TrustDeck.thisInstance = new TrustDeck()
    }
    return TrustDeck.thisInstance
  }

  /** Sets the bearer token used by subsequent API requests. */
  public setToken(token: string) {
    this.token = token
  }

  /** Removes the bearer token after logout or session expiry. */
  public clearToken() {
    this.token = ''
  }

  /** Indicates whether an API token is currently available. */
  public hasAccessToken() {
    return Boolean(this.token)
  }

  /** Returns the current bearer token. */
  public getAccessToken() {
    return this.token
  }

  /** Throws before an authenticated request is sent without a token. */
  private requireAccessToken() {
    if (!this.token) {
      throw new Error('No access token available; backend request was not sent')
    }
  }

  /** Returns the abbreviation of the project currently selected in the store. */
  private getSelectedProjectName(): string {
    const selectedProject = useProjectStore.getState().selectedProject
    if (!selectedProject) throw new Error('No project selected')
    return selectedProject.abbreviation
  }

  /** Builds an API URL and omits empty optional query parameters. */
  private buildUrl(path: string, params?: QueryParams): URL {
    const url = new URL(
      `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`
    )
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, String(value))
        }
      })
    }
    return url
  }

  /** Parses a successful API response according to its content type. */
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

  /** Extracts an array from the response envelopes used by the backend. */
  private asArray<T>(value: unknown): T[] {
    if (Array.isArray(value)) return value as T[]
    if (value === null || value === undefined) return []
    if (typeof value === 'object') {
      const candidate = value as Record<string, unknown>
      if (Array.isArray(candidate.items)) return candidate.items as T[]
      if (Array.isArray(candidate.results)) return candidate.results as T[]
      if (Array.isArray(candidate.data)) return candidate.data as T[]
      if (Object.keys(candidate).length === 0) return []
    }
    return []
  }

  /** Sends an authenticated JSON request and keeps the response status. */
  private async requestWithStatus<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    params?: QueryParams
  ): Promise<{ data: T; status: number }> {
    this.requireAccessToken()
    const url = this.buildUrl(path, params)
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${this.token}`
    }

    const res = await fetch(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new TrustDeckHttpError(
        `Request failed: ${res.status} ${errorText}`,
        res.status,
        errorText
      )
    }

    return {
      data: await this.parseResponse<T>(res),
      status: res.status
    }
  }

  /** Sends an authenticated JSON request and returns its response data. */
  private async request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    params?: QueryParams
  ): Promise<T> {
    return (await this.requestWithStatus<T>(method, path, body, params)).data
  }

  /** Sends an authenticated multipart request without overriding its boundary. */
  private async multipartRequest<T>(
    method: 'POST' | 'PUT',
    path: string,
    formData: FormData
  ): Promise<T> {
    this.requireAccessToken()
    const headers: HeadersInit = { Authorization: `Bearer ${this.token}` }

    const res = await fetch(this.buildUrl(path).toString(), {
      method,
      headers,
      body: formData
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new TrustDeckHttpError(
        `Upload failed: ${res.status} ${errorText}`,
        res.status,
        errorText
      )
    }

    return this.parseResponse<T>(res)
  }

  public async uploadFiles(files: File[]) {
    const formData = new FormData()
    files.forEach((file) => formData.append('files[]', file))
    return this.multipartRequest<unknown>('POST', '/upload', formData)
  }

  // API health and maintenance
  public async ping() {
    return this.request<string>('GET', '/ping')
  }

  public async getTableStorage(tableName: string) {
    return this.request<TableStorageInfo>(
      'GET',
      `/tables/${encodeURIComponent(tableName)}/storage`
    )
  }

  public async deleteTable(tableName: string) {
    return this.request<unknown>(
      'DELETE',
      `/tables/${encodeURIComponent(tableName)}`
    )
  }

  public async deleteRole(domainName: string) {
    return this.request<unknown>(
      'DELETE',
      `/roles/${encodeURIComponent(domainName)}`
    )
  }

  // Projects
  public async postProject(project: ProjectType) {
    return this.request<ProjectType>('POST', '/projects', project)
  }

  public async createProject(project: ProjectType) {
    return this.postProject(project)
  }

  public async getProjects() {
    const response = await this.request<unknown>('GET', '/projects')
    return this.asArray<ProjectType>(response)
  }

  public async getProject(projectAbbreviation?: string) {
    const projectName = projectAbbreviation ?? this.getSelectedProjectName()
    return this.request<ProjectType>(
      'GET',
      `/projects/${encodeURIComponent(projectName)}`
    )
  }

  public async getProjectStatistics(projectAbbreviation?: string) {
    const projectName = projectAbbreviation ?? this.getSelectedProjectName()
    return this.request<Record<string, unknown>>(
      'GET',
      `/projects/${encodeURIComponent(projectName)}/statistics`
    )
  }

  public async updateProject(
    project: ProjectType,
    projectAbbreviation?: string
  ) {
    const projectName = projectAbbreviation ?? this.getSelectedProjectName()
    return this.request<ProjectType>(
      'PUT',
      `/projects/${encodeURIComponent(projectName)}`,
      project
    )
  }

  public async deleteProject(projectAbbreviation?: string) {
    const projectName = projectAbbreviation ?? this.getSelectedProjectName()
    return this.request<ProjectType>(
      'DELETE',
      `/projects/${encodeURIComponent(projectName)}`
    )
  }

  // Project image
  public async createImage(file: File, projectAbbreviation?: string) {
    const projectName = projectAbbreviation ?? this.getSelectedProjectName()
    let method: 'POST' | 'PUT' = 'POST'
    try {
      await this.getImage(projectName)
      method = 'PUT'
    } catch {
      method = 'POST'
    }

    const formData = new FormData()
    formData.append('image', file)
    return this.multipartRequest<unknown>(
      method,
      `/projects/${encodeURIComponent(projectName)}/image`,
      formData
    )
  }

  public async getImage(projectAbbreviation?: string): Promise<Blob> {
    this.requireAccessToken()
    const projectName = projectAbbreviation ?? this.getSelectedProjectName()
    const headers: HeadersInit = { Authorization: `Bearer ${this.token}` }

    const res = await fetch(
      this.buildUrl(
        `/projects/${encodeURIComponent(projectName)}/image`
      ).toString(),
      { method: 'GET', headers }
    )

    if (!res.ok) {
      const errorText = await res.text()
      throw new TrustDeckHttpError(
        `Failed to fetch image: ${res.status} ${errorText}`,
        res.status,
        errorText
      )
    }

    return res.blob()
  }

  public async deleteImage(projectAbbreviation?: string) {
    const projectName = projectAbbreviation ?? this.getSelectedProjectName()
    return this.request<unknown>(
      'DELETE',
      `/projects/${encodeURIComponent(projectName)}/image`
    )
  }

  // Domains/groups
  public async getDomain(name?: string) {
    const domainName = name ?? this.getSelectedProjectName()
    return this.request<Domain>(
      'GET',
      `/domains/${encodeURIComponent(domainName)}`
    )
  }

  public async getDomainAttribute(domainName: string, attribute: string) {
    return this.request<unknown>(
      'GET',
      `/domains/${encodeURIComponent(domainName)}/${encodeURIComponent(attribute)}`
    )
  }

  public async getDomainsHierarchy() {
    const response = await this.request<unknown>('GET', '/domains/hierarchy')
    return this.asArray<unknown>(response)
  }

  public async getProjectDomains(projectAbbreviation: string) {
    const response = await this.request<unknown>(
      'GET',
      `/projects/${encodeURIComponent(projectAbbreviation)}/domains`
    )
    return this.asArray<ProjectDomain>(response)
  }

  public async searchReadableDomains(query = '*') {
    const response = await this.request<unknown>('GET', '/domains', undefined, {
      query
    })
    return this.asArray<Domain>(response)
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

  public async updateGroupComplete(
    groupName: string,
    recursive: boolean,
    payload: unknown
  ): Promise<any> {
    return this.request<any>('PUT', '/domains/complete', payload, {
      name: groupName,
      recursive
    })
  }

  public async updateDomainSalt(
    domainName: string,
    salt: string,
    allowEmpty = false
  ) {
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
    return this.request<any>(
      'GET',
      `/domains/${encodeURIComponent(projectName)}/subtree`
    )
  }

  // Entity types
  public async getBaseTypes(query = '*') {
    const response = await this.request<unknown>(
      'GET',
      '/entities/base-types',
      undefined,
      { query }
    )
    return this.asArray<EntityTypePayload>(response)
  }

  public async createBaseType(payload: EntityTypePayload) {
    return this.request<EntityTypePayload>(
      'POST',
      '/entities/base-types',
      payload
    )
  }

  public async getBaseType(entityTypeName: string) {
    return this.request<EntityTypePayload>(
      'GET',
      `/entities/base-types/${encodeURIComponent(entityTypeName)}`
    )
  }

  public async updateBaseType(
    entityTypeName: string,
    payload: EntityTypePayload
  ) {
    return this.request<EntityTypePayload>(
      'PUT',
      `/entities/base-types/${encodeURIComponent(entityTypeName)}`,
      payload
    )
  }

  public async deleteBaseType(entityTypeName: string) {
    return this.request<unknown>(
      'DELETE',
      `/entities/base-types/${encodeURIComponent(entityTypeName)}`
    )
  }

  public async getProjectEntities(query = '*', projectAbbreviation?: string) {
    const projectName = projectAbbreviation ?? this.getSelectedProjectName()
    const response = await this.request<unknown>(
      'GET',
      `/projects/${encodeURIComponent(projectName)}/entities`,
      undefined,
      { query }
    )
    return this.asArray<EntityTypePayload>(response)
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

  public async updateEntityConfig(
    entityTypeName: string,
    payload: EntityTypePayload,
    projectAbbreviation?: string
  ) {
    const projectName = projectAbbreviation ?? this.getSelectedProjectName()
    return this.request<EntityTypePayload>(
      'PUT',
      `/projects/${encodeURIComponent(projectName)}/entities/config/${encodeURIComponent(entityTypeName)}`,
      payload
    )
  }

  public async deleteEntityConfig(
    entityTypeName: string,
    projectAbbreviation?: string
  ) {
    const projectName = projectAbbreviation ?? this.getSelectedProjectName()
    return this.request<unknown>(
      'DELETE',
      `/projects/${encodeURIComponent(projectName)}/entities/config/${encodeURIComponent(entityTypeName)}`
    )
  }

  // Entity instances
  public async fuzzySearch(entity: string, query: string) {
    const projectName = this.getSelectedProjectName()
    const response = await this.request<unknown>(
      'GET',
      `/projects/${encodeURIComponent(projectName)}/entities/${encodeURIComponent(entity)}`,
      undefined,
      { query }
    )
    return this.asArray<PersonType>(response)
  }

  public async searchEntities(
    entityTypeName: string,
    query = '*',
    projectAbbreviation?: string
  ) {
    const projectName = projectAbbreviation ?? this.getSelectedProjectName()
    const response = await this.request<unknown>(
      'GET',
      `/projects/${encodeURIComponent(projectName)}/entities/${encodeURIComponent(entityTypeName)}`,
      undefined,
      { query }
    )
    return this.asArray<unknown>(response)
  }

  public async getEntity(
    entityTypeName: string,
    trustdeckID: string,
    projectAbbreviation?: string
  ) {
    const projectName = projectAbbreviation ?? this.getSelectedProjectName()
    return this.request<any>(
      'GET',
      `/projects/${encodeURIComponent(projectName)}/entities/${encodeURIComponent(entityTypeName)}/${encodeURIComponent(trustdeckID)}`
    )
  }

  public async postEntityWithResult(
    entityType: string,
    payload: unknown,
    recordLinkageResolution?: RecordLinkageCreationResolution
  ): Promise<EntityCreationResult> {
    const projectName = this.getSelectedProjectName()
    const response = await this.requestWithStatus<Record<string, any>>(
      'POST',
      `/projects/${encodeURIComponent(projectName)}/entities/${encodeURIComponent(entityType)}`,
      payload,
      recordLinkageResolution
        ? { recordLinkageResolution }
        : undefined
    )
    return {
      entity: response.data,
      created: response.status === 201
    }
  }

  public async postEntity(entityType: string, payload: unknown) {
    return (await this.postEntityWithResult(entityType, payload)).entity
  }

  public async putEntity(
    entityType: string,
    payload: unknown,
    trustdeckID: string
  ) {
    const projectName = this.getSelectedProjectName()
    return this.request<any>(
      'PUT',
      `/projects/${encodeURIComponent(projectName)}/entities/${encodeURIComponent(entityType)}/${encodeURIComponent(trustdeckID)}`,
      payload
    )
  }

  public async deleteEntity(
    entityTypeName: string,
    trustdeckID: string,
    projectAbbreviation?: string
  ) {
    const projectName = projectAbbreviation ?? this.getSelectedProjectName()
    return this.request<unknown>(
      'DELETE',
      `/projects/${encodeURIComponent(projectName)}/entities/${encodeURIComponent(entityTypeName)}/${encodeURIComponent(trustdeckID)}`
    )
  }

  public async getEntityPseudonyms(
    entityTypeName: string,
    trustdeckID: string,
    projectAbbreviation?: string
  ) {
    const projectName = projectAbbreviation ?? this.getSelectedProjectName()
    const response = await this.request<unknown>(
      'GET',
      `/projects/${encodeURIComponent(projectName)}/entities/${encodeURIComponent(entityTypeName)}/${encodeURIComponent(trustdeckID)}/pseudonyms`
    )
    return this.asArray<Pseudonym>(response)
  }

  public async recordLinkage(
    entityTypeName: string,
    payload: unknown,
    projectAbbreviation?: string
  ): Promise<RecordLinkageCandidate[]> {
    const projectName = projectAbbreviation ?? this.getSelectedProjectName()
    const response = await this.request<unknown>(
      'POST',
      `/projects/${encodeURIComponent(projectName)}/entities/${encodeURIComponent(entityTypeName)}/record-linkage`,
      payload
    )
    return this.asArray<RecordLinkageCandidate>(response)
  }

  public async postPersonWithResult(person: unknown) {
    return this.postEntityWithResult('person', person)
  }

  public async postPerson(person: unknown) {
    return (await this.postPersonWithResult(person)).entity
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

  // Pseudonyms
  public async createPseudonym(
    payload: PseudonymCreatePayload,
    selectedGroup: string
  ) {
    return this.request<Pseudonym>(
      'POST',
      `/domains/${encodeURIComponent(selectedGroup)}/pseudonyms`,
      payload
    )
  }

  public async createPseudonymsBatch(
    payload: PseudonymCreatePayload[],
    domainName: string
  ) {
    const response = await this.request<unknown>(
      'POST',
      `/domains/${encodeURIComponent(domainName)}/pseudonyms/batch`,
      payload
    )
    return this.asArray<Pseudonym>(response)
  }

  public async searchPseudonym(
    query: string,
    domain?: string
  ): Promise<Pseudonym> {
    const domainName = domain ?? this.getSelectedProjectName()
    return this.request<Pseudonym>(
      'GET',
      `/domains/${encodeURIComponent(domainName)}/pseudonyms`,
      undefined,
      {
        psn: query
      }
    )
  }

  public async getPseudonymByIdentifier(
    domainName: string,
    identifier: string,
    idType: string
  ) {
    return this.request<Pseudonym>(
      'GET',
      `/domains/${encodeURIComponent(domainName)}/pseudonyms`,
      undefined,
      {
        id: identifier,
        idType
      }
    )
  }

  public async searchPseudonyms(domainName: string, query = '*') {
    const response = await this.request<unknown>(
      'GET',
      `/domains/${encodeURIComponent(domainName)}/pseudonyms`,
      undefined,
      {
        query
      }
    )
    return this.asArray<Pseudonym>(response)
  }

  public async getPseudonymsBatch(domainName: string) {
    const response = await this.request<unknown>(
      'GET',
      `/domains/${encodeURIComponent(domainName)}/pseudonyms/batch`
    )
    return this.asArray<Pseudonym>(response)
  }

  public async updatePseudonym(
    domainName: string,
    payload: PseudonymUpdatePayload
  ) {
    return this.request<Pseudonym>(
      'PUT',
      `/domains/${encodeURIComponent(domainName)}/pseudonyms`,
      payload
    )
  }

  public async updatePseudonymComplete(
    domainName: string,
    payload: PseudonymUpdatePayload
  ) {
    return this.request<Pseudonym>(
      'PUT',
      `/domains/${encodeURIComponent(domainName)}/pseudonyms/complete`,
      payload
    )
  }

  public async updatePseudonymsBatch(
    domainName: string,
    payload: PseudonymUpdatePayload[]
  ) {
    const response = await this.request<unknown>(
      'PUT',
      `/domains/${encodeURIComponent(domainName)}/pseudonyms/batch`,
      payload
    )
    return this.asArray<Pseudonym>(response)
  }

  public async deletePseudonym(
    domainName: string,
    payload: { identifierItem?: IdentifierItem; psn?: string }
  ) {
    return this.request<unknown>(
      'DELETE',
      `/domains/${encodeURIComponent(domainName)}/pseudonyms`,
      undefined,
      {
        id: payload.identifierItem?.identifier,
        idType: payload.identifierItem?.idType,
        psn: payload.psn
      }
    )
  }

  public async deletePseudonymsBatch(
    domainName: string,
    payload: { identifierItem?: IdentifierItem; psn?: string }[]
  ) {
    return this.request<unknown>(
      'DELETE',
      `/domains/${encodeURIComponent(domainName)}/pseudonyms/batch`,
      payload
    )
  }

  public async validatePseudonym(domainName: string, psn: string) {
    return this.request<unknown>(
      'GET',
      `/domains/${encodeURIComponent(domainName)}/pseudonyms/validation`,
      undefined,
      {
        psn
      }
    )
  }

  public async getLinkedPseudonyms(sourceDomain: string, targetDomain: string) {
    const response = await this.request<unknown>(
      'GET',
      '/domains/linked-pseudonyms',
      undefined,
      {
        sourceDomain,
        targetDomain
      }
    )
    return this.asArray<Pseudonym>(response)
  }

  // Permissions/users
  public async searchOperators(q: string) {
    const response = await this.request<unknown>(
      'GET',
      '/permissions/users',
      undefined,
      { query: q }
    )
    return this.asArray<Operator>(response)
  }

  public async getDefinedPermissions() {
    const response = await this.request<unknown>('GET', '/permissions')
    return this.asArray<{ resourceType: string; action: string }>(response)
  }

  public async createDomainPermissions(
    domainName: string,
    permissions: PermissionGrant[]
  ) {
    return this.request<PermissionGrant[]>(
      'POST',
      `/permissions/domains/${encodeURIComponent(domainName)}`,
      permissions
    )
  }

  public async createProjectPermissions(
    projectAbbreviation: string,
    permissions: PermissionGrant[]
  ) {
    return this.request<PermissionGrant[]>(
      'POST',
      `/permissions/projects/${encodeURIComponent(projectAbbreviation)}`,
      permissions
    )
  }

  public async createEntityTypePermissions(
    projectAbbreviation: string,
    entityTypeName: string,
    permissions: EntityTypePermissionGrant[]
  ) {
    return this.request<PermissionGrant[]>(
      'POST',
      `/permissions/projects/${encodeURIComponent(projectAbbreviation)}/entity-types/${encodeURIComponent(entityTypeName)}`,
      permissions
    )
  }

  public async createGlobalPermissions(permissions: PermissionGrant[]) {
    return this.request<PermissionGrant[]>(
      'POST',
      '/permissions/global',
      permissions
    )
  }

  public async getDomainPermissions(domainName: string, userId?: string) {
    const response = await this.request<unknown>(
      'GET',
      `/permissions/domains/${encodeURIComponent(domainName)}`,
      undefined,
      {
        userId
      }
    )
    return this.asArray<Permission>(response)
  }

  public async getProjectPermissions(
    projectAbbreviation?: string,
    userId?: string
  ) {
    const projectName = projectAbbreviation ?? this.getSelectedProjectName()
    const response = await this.request<unknown>(
      'GET',
      `/permissions/projects/${encodeURIComponent(projectName)}`,
      undefined,
      {
        userId
      }
    )
    return this.asArray<Permission>(response)
  }

  public async getEntityTypePermissions(
    projectAbbreviation: string,
    entityTypeName: string,
    userId?: string
  ) {
    const response = await this.request<unknown>(
      'GET',
      `/permissions/projects/${encodeURIComponent(projectAbbreviation)}/entity-types/${encodeURIComponent(entityTypeName)}`,
      undefined,
      { userId }
    )
    return this.asArray<Permission>(response)
  }

  public async getGlobalPermissions(userId?: string) {
    const response = await this.request<unknown>(
      'GET',
      '/permissions/global',
      undefined,
      { userId }
    )
    return this.asArray<Permission>(response)
  }

  public async updateDomainPermissions(
    userId: string,
    permissions: PermissionUpdate[] | PermissionGrant[]
  ) {
    const projectName = this.getSelectedProjectName()
    return this.request<unknown>(
      'PUT',
      `/permissions/domains/${encodeURIComponent(projectName)}`,
      permissions,
      {
        userId
      }
    )
  }

  public async updateProjectPermissions(
    userId: string,
    permissions: PermissionUpdate[] | PermissionGrant[]
  ) {
    const projectName = this.getSelectedProjectName()
    return this.request<unknown>(
      'PUT',
      `/permissions/projects/${encodeURIComponent(projectName)}`,
      permissions,
      {
        userId
      }
    )
  }

  public async updateGlobalPermissions(
    userId: string,
    permissions: PermissionUpdate[] | PermissionGrant[]
  ) {
    return this.request<unknown>('PUT', '/permissions/global', permissions, {
      userId
    })
  }

  public async updateDomainPermissionGrants(
    domainName: string,
    userId: string,
    permissions: PermissionUpdate[] | PermissionGrant[]
  ) {
    return this.request<unknown>(
      'PUT',
      `/permissions/domains/${encodeURIComponent(domainName)}`,
      permissions,
      {
        userId
      }
    )
  }

  public async updateProjectPermissionGrants(
    projectAbbreviation: string,
    userId: string,
    permissions: PermissionUpdate[] | PermissionGrant[]
  ) {
    return this.request<unknown>(
      'PUT',
      `/permissions/projects/${encodeURIComponent(projectAbbreviation)}`,
      permissions,
      {
        userId
      }
    )
  }

  public async updateEntityTypePermissionGrants(
    projectAbbreviation: string,
    entityTypeName: string,
    userId: string,
    permissions: EntityTypePermissionUpdate[] | EntityTypePermissionGrant[]
  ) {
    return this.request<unknown>(
      'PUT',
      `/permissions/projects/${encodeURIComponent(projectAbbreviation)}/entity-types/${encodeURIComponent(entityTypeName)}`,
      permissions,
      { userId }
    )
  }

  public async deleteDomainPermissions(
    domainName: string,
    userId: string,
    permissions: PermissionGrant[]
  ) {
    return this.request<unknown>(
      'DELETE',
      `/permissions/domains/${encodeURIComponent(domainName)}`,
      permissions,
      {
        userId
      }
    )
  }

  public async deleteProjectPermissions(
    projectAbbreviation: string,
    userId: string,
    permissions: PermissionGrant[]
  ) {
    return this.request<unknown>(
      'DELETE',
      `/permissions/projects/${encodeURIComponent(projectAbbreviation)}`,
      permissions,
      {
        userId
      }
    )
  }

  public async deleteEntityTypePermissions(
    projectAbbreviation: string,
    entityTypeName: string,
    userId: string,
    permissions: EntityTypePermissionGrant[]
  ) {
    return this.request<unknown>(
      'DELETE',
      `/permissions/projects/${encodeURIComponent(projectAbbreviation)}/entity-types/${encodeURIComponent(entityTypeName)}`,
      permissions,
      { userId }
    )
  }

  public async deleteGlobalPermissions(
    userId: string,
    permissions: PermissionGrant[]
  ) {
    return this.request<unknown>('DELETE', '/permissions/global', permissions, {
      userId
    })
  }

  public async getUserPermissions(userId: string) {
    return this.getProjectPermissions(undefined, userId)
  }

  public async getFlatRootDomainTree(rootDomainName: string) {
    const domains = await this.searchReadableDomains('*')
    const root = domains.find((d) => d.name === rootDomainName)
    if (!root) return []

    function collect(node: Domain): Domain[] {
      const children = domains.filter((d) => d.superDomainName === node.name)
      return [node, ...children.flatMap(collect)]
    }

    return collect(root)
  }
}

export default TrustDeck
