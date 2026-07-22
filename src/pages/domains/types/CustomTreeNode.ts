import { TreeNode } from 'primereact/treenode'
import type { Domain } from '../../../core/types/Domain'

export interface GroupStoredAttributes {
  label?: string
  validFrom?: string
  validTo?: string
  validityTime?: string
  prefix?: string
  psnlength?: string
  alphabet?: string
  customAlphabetCharacters?: string
  algorithm?: string
  maxnumpsn?: string | number
  randomAlgorithmDesiredSuccessProbability?: string | number
  parentgroup?: string
  multiplepsn?: boolean
  paddingchar?: string
  checkdigit?: boolean
  lengthIncludesCheckDigit?: boolean
  enforceStartDateValidity?: boolean
  enforceEndDateValidity?: boolean
  consecutiveValueCounter?: string | number
  salt?: string
  saltLength?: string | number
  description?: string
  validFromInherited?: boolean
  validToInherited?: boolean
  algorithmInherited?: boolean
  alphabetInherited?: boolean
  randomAlgorithmDesiredSizeInherited?: boolean
  randomAlgorithmDesiredSuccessProbabilityInherited?: boolean
  multiplePsnAllowedInherited?: boolean
  pseudonymLengthInherited?: boolean
  paddingCharacterInherited?: boolean
  addCheckDigitInherited?: boolean
  lengthIncludesCheckDigitInherited?: boolean
  enforceStartDateValidityInherited?: boolean
  enforceEndDateValidityInherited?: boolean
}

export interface GroupStoredData {
  stored: GroupStoredAttributes
  temporal: GroupStoredAttributes
  raw?: Domain
}

//take TreeNode as the default but override the attribuite data to be of type CustomTreeNode
export type CustomTreeNode = TreeNode & {
  data: GroupStoredData
  key: string
  hasChanges: boolean
}
