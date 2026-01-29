import { Operator, Permission } from 'core/types/Permission'
import { Domain } from '../types/Domain'
import { ProjectType } from '../../pages/projects/types/ProjectType'
import useProjectStore from '../stores/ProjectStore.ts'
import { PersonType } from '../types/PersonEntity.ts'
import { BioSampleEntity } from 'core/types/BioSampleEntity.ts'
import { basePerson } from './basePerson.ts'
import { person } from './person.ts'
import { Pseudonym } from '../../core/types/Pseudonym.ts'

class TrustDeck {
  private static thisInstance: TrustDeck
  private token: string = ''
  private baseUrl: string

  private constructor() {
    this.baseUrl =
      window.__ENV__?.API_BASE_URL ?? import.meta.env.VITE_API_BASE_URL
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

  private getSelectedProjectName(): string {
    const selectedProject = useProjectStore.getState().selectedProject
    if (!selectedProject) throw new Error('No project selected')
    return selectedProject.abbreviation
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: any,
    params?: Record<string, string>
  ): Promise<T> {
    const url = new URL(this.baseUrl + path)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })
    }

    //how to make sure this.token is available while async fetched?
    const res = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    })

    //TODO return always the response not directly as json
    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Request failed: ${res.status} ${errorText}`)
    }

    if (res.status === 204) {
      return {} as T
    } else {
      return res.json()
    }
  }

  public async getDomain() {
    const projectName = this.getSelectedProjectName()
    return this.request<Domain[]>(
      'GET',
      `/domains?name=${projectName}`
    )
  }

  public async getDomainsHierarchy() {
    return this.request<Domain[]>(
      'GET',
      '/pseudonymization/experimental/domains/hierarchy'
    )
  }

  public async postProject(project: ProjectType) {
    return this.request<ProjectType>('POST', `/projects`, project)
  }

  public async deleteProject() {
    const projectName = this.getSelectedProjectName()
    return this.request<ProjectType>('DELETE', `/projects/${projectName}`)
  }

  public async getProjects() {
    return this.request<ProjectType[]>('GET', '/projects')
  }

  public async createBaseType() {
    console.log('fired create base type')
    const res = await this.request('POST', `/entities/base-types`, basePerson)
    console.log(res)
  }

  public async getType(type: string) {
    const projectName = this.getSelectedProjectName()
    return this.request(
      'GET',
      `/projects/${projectName}/entities/config/${type}`
    )
  }

  public async createType(projectName: string) {
    console.log('create type fired')
    const res = await this.request(
      'POST',
      `/projects/${projectName}/entities/config`,
      person
    )
    console.log(res)
  }

  public async fuzzySearch(entity: string, query: string) {
    const projectName = this.getSelectedProjectName()
    return this.request<PersonType[]>(
      'GET',
      `/projects/${projectName}/entities/${entity}?query=${query}`
    )
  }

  public async postPerson(person: any) {
    const projectName = this.getSelectedProjectName()
    return this.request<any>(
      'POST',
      `/projects/${projectName}/entities/person`,
      person
    )
  }

  public async putPerson(updatedPerson: any, trustdeckID: string) {
    const projectName = this.getSelectedProjectName()
    console.log(trustdeckID)
    console.log(updatedPerson)
    return this.request<any>(
      'PUT',
      `/projects/${projectName}/entities/person/${trustdeckID}`,
      updatedPerson
    )
  }

  public async postBiosample(biosample: BioSampleEntity) {
    const projectName = this.getSelectedProjectName()
    return this.request<BioSampleEntity>(
      'POST',
      `/${projectName}/biosample`,
      biosample
    )
  }

  public async recordLinkagePerson(person: any) {
    const projectName = this.getSelectedProjectName()
    return this.request<any>(
      'POST',
      `/projects/${projectName}/entities/person/record-linkage`,
      person
    )
  }

  public async createGroup(payload: any) {
    return this.request<any>('POST', '/domains', payload)
  }
  public async createGroupComplete(payload: any) {
    console.log(payload)
    return this.request<any>('POST', '/domains/complete', payload)
  }

  public async deleteGroup(groupName: string, recursive: boolean) {
    return this.request<any>(
      'DELETE',
      `/domains?name=${groupName}&recursive=${recursive ? 'true' : 'false'}`
    )
  }

  public async getGroups() {
    const projectName = this.getSelectedProjectName()
    return this.request<any>('GET', `/domains/${projectName}/subtree`)
  }

  public async updateGroupComplete(
    groupName: string,
    recursive: boolean,
    payload: any
  ): Promise<any> {
    console.log(groupName, recursive, payload)
    return this.request<any>(
      'PUT',
      `/domains/complete?name=${groupName}&recursive=${recursive ? 'true' : 'false'}`,
      payload
    )
  }

  public async createPseudonym(payload: { identifier: string, idType: string }, selectedGroup: string) {
    return this.request('POST', `/domains/${selectedGroup}/pseudonyms`, payload)
  }

  public async searchPseudonym(query: string): Promise<Pseudonym> {
    const projectName = this.getSelectedProjectName()
    return this.request('GET', `/domains/${projectName}/pseudonyms?psn=${query}`)
  }

  public async searchOperators(q: string) {
    return this.request<Operator[]>(
      'GET',
      `/permissions/users?query=${q}`
    )
  }

  public async updateUserPermissions( userId: string, permissions: Permission[] ) {
    const projectName = this.getSelectedProjectName()
    return this.request<string>(
      'PUT',
      `/permissions/${projectName}?userId=${userId}`,
      permissions
    )
  }

  public async getUserPermissions(userId: string) {
    const projectName = this.getSelectedProjectName()
    return this.request<Permission[]>(
      'GET',
      `/permissions/${projectName}?userId=${userId}`
    )
  }

  public async getFlatRootDomainTree(rootDomainName: string) {
    const domainHierarchy = await this.getDomainsHierarchy()

    //get flat domain tree under root
    const root = domainHierarchy.find((d) => d.name === rootDomainName)
    if (!root) return []

    // Recursive function to collect children
    function collect(node: any): any[] {
      const children = domainHierarchy.filter(
        (d) => d.superDomainName === node.name
      )
      return [node, ...children.flatMap(collect)]
    }
    const allDomainsUnderRoot = collect(root)

    const domainMap = new Map<string, any[]>()
    allDomainsUnderRoot.forEach((domain) => {
      if (!domainMap.has(domain.superDomainName)) {
        domainMap.set(domain.superDomainName, [])
      }
      domainMap.get(domain.superDomainName)!.push(domain)
    })

    const result: any[] = []
    const queue: any[] = []
    // Find the root domain (no superDomainName or superDomainName === null)
    const rootDomain = allDomainsUnderRoot.find(
      (d) =>
        !d.superDomainName ||
        d.superDomainName === null ||
        d.name === rootDomainName
    )
    if (rootDomain) {
      queue.push(rootDomain)
    }

    while (queue.length > 0) {
      const current = queue.shift()
      result.push(current)
      const children = domainMap.get(current.name) || []
      queue.push(...children)
    }
    return result
  }
}

export default TrustDeck
