export interface Pseudonym {
  domainName: string
  identifierItem: {
    idType: string
    identifier: string
  }
  psn: string
  validFrom: string
  validFromInherited: boolean
  validTo: string
  validToInherited: boolean
  children?: Pseudonym[]
}
