import { TreeNode } from 'primereact/treenode'

export interface GroupStoredAttributes {
  label?: string
  validFrom?: string
  validTo?: string
  prefix?: string
  psnlength?: string
  alphabet?: string
  algorithm?: string
  maxnumpsn?: string
  parentgroup?: string
  multiplepsn?: boolean
  paddingchar?: string
  checkdigit?: boolean
  description?: string
}

export interface GroupStoredData {
  stored: GroupStoredAttributes
  temporal: GroupStoredAttributes
}

//take TreeNode as the default but override the attribuite data to be of type CustomTreeNode
export type CustomTreeNode = TreeNode & {
  data: GroupStoredData
  key: string
  hasChanges: boolean
}
