export type Algorithm = {
  name?: string
  alphabet?: string
  randomAlgorithmDesiredSize?: number // int64
  randomAlgorithmDesiredSuccessProbability?: number // double
  consecutiveValueCounter?: number // int64
  pseudonymLength?: number
  paddingCharacter?: string
  addCheckDigit?: boolean
  lengthIncludesCheckDigit?: boolean
  salt?: string
  saltLength?: number
}

export type Domain = {
  id?: number
  name: string
  prefix?: string
  validFrom?: string
  validFromInherited?: boolean
  validTo?: string
  validityTime?: string // Only needed for creation
  validToInherited?: boolean
  enforceStartDateValidity?: boolean
  enforceStartDateValidityInherited?: boolean
  enforceEndDateValidity?: boolean
  enforceEndDateValidityInherited?: boolean
  algorithm?: Algorithm | null
  algorithmInherited?: boolean
  multiplePsnAllowed?: boolean
  multiplePsnAllowedInherited?: boolean
  description?: string
  superDomainID?: number
  superDomainName?: string
  projectAbbreviation?: string
}
