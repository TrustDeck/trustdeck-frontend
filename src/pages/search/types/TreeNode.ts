import { Link } from '../../../core/types/Link'

export interface TreeNode {
  key: string
  data: Link
  children: TreeNode[]
}