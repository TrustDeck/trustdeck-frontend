export interface Pseudonym {
  id: string
  pseudonym: string
  group: string
  parent?: string
  children?: []
  createdOn: string
  expiresOn: string
}