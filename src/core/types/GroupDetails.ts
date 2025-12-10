export type GroupDetails = {
  id?: number
  name: string
  prefix: string
  validFrom?: string | Date | null
  validFromInherited?: boolean
  validTo?: string | Date | null
  validToInherited?: boolean
  enforceStartDateValidity?: boolean
  enforceStartDateValidityInherited?: boolean
  enforceEndDateValidity?: boolean
  enforceEndDateValidityInherited?: boolean
  algorithm: string
  algorithmInherited?: boolean
  alphabet: string
  alphabetInherited?: boolean
  randomAlgorithmDesiredSize: number
  randomAlgorithmDesiredSizeInherited?: boolean
  randomAlgorithmDesiredSuccessProbability?: number
  randomAlgorithmDesiredSuccessProbabilityInherited?: boolean
  multiplePsnAllowed: boolean
  multiplePsnAllowedInherited?: boolean
  consecutiveValueCounter?: number
  pseudonymLength: number
  pseudonymLengthInherited?: boolean
  paddingCharacter: string
  paddingCharacterInherited?: boolean
  addCheckDigit: boolean
  addCheckDigitInherited?: boolean
  lengthIncludesCheckDigit?: boolean
  lengthIncludesCheckDigitInherited?: boolean
  salt?: string
  saltLength?: number
  superDomainID?: number
  superDomainName?: string
  description?: string
}