import { create } from 'zustand'
import { CustomTreeNode } from '../types/CustomTreeNode'

type GroupOption = 'default' | 'edit' | 'registration'

type TreeState = {
  tree: CustomTreeNode[]
  groupOption: GroupOption
  selectedNodeKey: string
  expandedKeys: Record<string, boolean>
  setSelectedNodeKey: (key: string) => void
  setExpandedKeys: (keys: Record<string, boolean>) => void
  updateNodeAttribute: (key: string, attribute: string, value: any) => void
  newNode: () => void
  deleteNode: (key: string) => void
  moveNode: (key: string, parentName: string) => void
  setGroupOption: (option: GroupOption) => void
  setTree: (tree: CustomTreeNode[]) => void
  storeNodeChanges: () => void
}

export const useTreeStateStore = create<TreeState>((set) => ({
  tree: [],
  groupOption: 'default',
  selectedNodeKey: '',
  expandedKeys: {},
  deleteNode: (key: string) => {
    set((state) => {
      function removeNode(nodes: CustomTreeNode[] = []): CustomTreeNode[] {
        return nodes
          .filter((node) => node.key !== key)
          .map((node) => ({
            ...node,
            children: node.children
              ? removeNode(node.children as CustomTreeNode[])
              : node.children
          }))
      }
      const updatedTree = removeNode(state.tree)
      return { tree: updatedTree }
    })
  },
  setExpandedKeys: (keys: Record<string, boolean>) =>
    set({ expandedKeys: keys }),
  storeNodeChanges: () => {
    set((state) => {
      // take from all nodes including childrens and copy the data from temporal to stored and set hasChanges to false
      // if a node has a key with 'temporal' give it a new unique key and then copy it
      // collect existing keys (excluding temporal-like keys) to avoid collisions
      const usedKeys = new Set<string>()
      function collectKeys(nodes: CustomTreeNode[] = []) {
        for (const n of nodes) {
          const k = String(n.key)
          if (!k.includes('temporal')) usedKeys.add(k)
          if (n.children && Array.isArray(n.children))
            collectKeys(n.children as CustomTreeNode[])
        }
      }
      collectKeys(state.tree)

      function genUniqueKey(): string {
        let k: string
        do {
          k = `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
        } while (usedKeys.has(k))
        usedKeys.add(k)
        return k
      }

      let updatedSelectedKey = state.selectedNodeKey
      const updatedExpandedKeys: Record<string, boolean> = {
        ...(state.expandedKeys || {})
      }

      function storeChanges(nodes: CustomTreeNode[] = []): CustomTreeNode[] {
        return nodes.map((node) => {
          const oldKeyStr = String(node.key)
          const needsNewKey = oldKeyStr.includes('temporal')
          const newKey = needsNewKey ? genUniqueKey() : oldKeyStr

          // if the selected key pointed to this (possibly ambiguous) temporal key, update it to the new key
          if (needsNewKey && updatedSelectedKey === oldKeyStr) {
            updatedSelectedKey = newKey
          }

          // preserve expanded state: if expanded under old temporal key, move it to new key
          if (needsNewKey && updatedExpandedKeys[oldKeyStr]) {
            delete updatedExpandedKeys[oldKeyStr]
            updatedExpandedKeys[newKey] = true
          }

          const updatedNode: CustomTreeNode = {
            ...node,
            key: newKey,
            data: {
              ...node.data,
              stored: { ...(node.data?.temporal || {}) }
            },
            hasChanges: false,
            children: node.children
              ? storeChanges(node.children as CustomTreeNode[])
              : node.children
          }

          return updatedNode
        })
      }

      const updatedTree = storeChanges(state.tree)

      return {
        tree: updatedTree,
        selectedNodeKey: updatedSelectedKey,
        expandedKeys: updatedExpandedKeys
      }
    })
  },
  moveNode: (key: string, parentName: string) => {
    set((state) => {
      //take the node with the key and change its position in the tree if the parentName matches any node move the node which key was matched in the children of this parentname
      //if the parentname is '' then just move it to the root level
      //find the node with the key
      let nodeToMove: CustomTreeNode | null = null

      // removeNode: produce a new tree without the moved node (non-mutating)
      function removeNode(nodes: CustomTreeNode[] = []): CustomTreeNode[] {
        const result = nodes.reduce<CustomTreeNode[]>((acc, node) => {
          if (node.key === key) {
            nodeToMove = node
            return acc
          }

          if (node.children && Array.isArray(node.children)) {
            const newChildren = removeNode(node.children as CustomTreeNode[])
            if (newChildren !== node.children) {
              acc.push({ ...node, children: newChildren })
            } else {
              acc.push(node)
            }
            return acc
          }

          acc.push(node)
          return acc
        }, [])

        return result
      }

      const newTree = removeNode(state.tree)

      if (!nodeToMove) {
        return state
      }

      if (parentName === '') {
        // move to root level: ensure we produce a new array reference
        //const moved = nodeToMove as CustomTreeNode
        const updatedTreeRoot = [...newTree, nodeToMove]
        // collapse all when moved to root and select the moved node
        return { tree: updatedTreeRoot }
      } else {
        function addNodeToParent(
          nodes: CustomTreeNode[] = []
        ): [CustomTreeNode[], boolean] {
          let foundInThisLevel = false
          const newNodes = nodes.map((node) => {
            // if this node is the target parent, append and mark expanded
            if (node.label === parentName) {
              const children = node.children
                ? [...(node.children as CustomTreeNode[]), nodeToMove!]
                : [nodeToMove!]
              foundInThisLevel = true
              return { ...node, children }
            }

            if (node.children && Array.isArray(node.children)) {
              const [newChildren, foundInChildren] = addNodeToParent(
                node.children as CustomTreeNode[]
              )
              if (foundInChildren) {
                foundInThisLevel = true
                return { ...node, children: newChildren }
              }
              return node
            }

            return node
          })

          return [newNodes, foundInThisLevel]
        }

        const [updatedTree] = addNodeToParent(newTree)

        // compute path from root to the parentName to build expandedKeys
        function findPathKeys(
          nodes: CustomTreeNode[] = [],
          targetLabel?: string
        ): string[] | null {
          for (const node of nodes) {
            if (node.label === targetLabel) return [String(node.key)]
            if (node.children && Array.isArray(node.children)) {
              const childPath = findPathKeys(
                node.children as CustomTreeNode[],
                targetLabel
              )
              if (childPath) return [String(node.key), ...childPath]
            }
          }
          return null
        }

        const path = findPathKeys(updatedTree, parentName)
        const expanded: Record<string, boolean> = {}
        if (path) {
          path.forEach((k) => {
            if (k) expanded[k] = true
          })
        }

        return { tree: updatedTree, expandedKeys: expanded }
      }
    })
  },
  updateNodeAttribute: (key: string, attribute: string, value: any) => {
    set((state) => {
      function update(nodes: CustomTreeNode[] = []): CustomTreeNode[] {
        return nodes.map((node) => {
          if (node.key === key) {
            return {
              ...node,
              ...(attribute === 'label' ? { label: value } : {}),
              data: {
                ...node.data,
                temporal: {
                  ...(node.data?.temporal || {}),
                  [attribute]: value
                }
              },
              children: node.children
                ? update(node.children as CustomTreeNode[])
                : node.children
            }
          }
          return {
            ...node,
            children: node.children
              ? update(node.children as CustomTreeNode[])
              : node.children
          }
        })
      }

      //compare state.data.stored and state.data.temporal if they are different set hasChanges to true otherwise false
      function updateHasChanges(
        nodes: CustomTreeNode[] = []
      ): CustomTreeNode[] {
        return nodes.map((node) => {
          const stored = node.data?.stored
          const temporal = node.data?.temporal
          const hasChanges = JSON.stringify(stored) !== JSON.stringify(temporal)

          return {
            ...node,
            hasChanges: hasChanges,
            children: node.children
              ? updateHasChanges(node.children as CustomTreeNode[])
              : node.children
          }
        })
      }

      const updatedTree = update(state.tree)
      const updatedTreeWithChanges = updateHasChanges(updatedTree)

      return { tree: updatedTreeWithChanges }
    })
  },
  setSelectedNodeKey: (key: string) => set({ selectedNodeKey: key }),
  setTree: (tree: CustomTreeNode[]) => set({ tree }),
  setGroupOption: (option: GroupOption) => set({ groupOption: option }),
  newNode: () =>
    set((state) => {
      const nodes = state.tree ?? []

      // remove all nodes which data.stored contains no objects means it literal empty also include childrens
      const filteredNodes = (function filterNodes(
        nodes: CustomTreeNode[] = []
      ): CustomTreeNode[] {
        return nodes.reduce<CustomTreeNode[]>((acc, node) => {
          const children = node.children
            ? filterNodes(node.children as CustomTreeNode[])
            : []

          const storedData = node.data?.stored
          const hasStored =
            !!storedData &&
            typeof storedData === 'object' &&
            !Array.isArray(storedData) &&
            Object.keys(storedData as Record<string, unknown>).length > 0

          // keep node if it has stored data or any kept children
          if (hasStored || children.length > 0) {
            acc.push({
              ...node,
              children: children.length > 0 ? children : []
            })
          }

          return acc
        }, [])
      })(nodes)

      const label = 'NewGroup'
      const prefix = 'NG-'
      const psnlength = '8'

      const currentDate = new Date()
      const currentYear = String(currentDate.getFullYear())
      const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0')
      const currentDay = String(currentDate.getDate()).padStart(2, '0')

      const validFrom = `${currentMonth}-${currentDay}-${currentYear}`

      const date30Year = new Date()
      date30Year.setFullYear(date30Year.getFullYear() + 30)
      const year30 = String(date30Year.getFullYear())
      const month30 = String(date30Year.getMonth() + 1).padStart(2, '0')
      const day30 = String(date30Year.getDate()).padStart(2, '0')

      const validTo = `${month30}-${day30}-${year30}`

      // generate a key based on current total nodes (as in your example)
      const newNode: CustomTreeNode = {
        key: 'temporal',
        label,
        hasChanges: true,
        data: {
          // cast to any to satisfy the required stored shape on initialization;
          // replace with a proper GroupStoredData object if you have defaults
          stored: {},
          temporal: {
            type: 'domain',
            label: label,
            parentgroup: 'ROOT',
            validFrom: validFrom,
            validTo: validTo,
            prefix: prefix,
            psnlength: psnlength,
            alphabet: 'LETTERS_ONLY_ALPHABET',
            customAlphabetCharacters: '',
            algorithm: 'RANDOM_LET',
            maxnumpsn: '1000000',
            randomAlgorithmDesiredSuccessProbability: '0.999',
            consecutiveValueCounter: '1',
            saltLength: '32',
            validityTime: '',
            multiplepsn: false,
            paddingchar: '',
            checkdigit: true,
            lengthIncludesCheckDigit: false,
            description: '',
            validFromInherited: false,
            validToInherited: false,
            algorithmInherited: false,
            pseudonymLengthInherited: false,
            paddingCharacterInherited: false
          }
        },
        children: []
      }

      return { tree: [...filteredNodes, newNode], selectedNodeKey: newNode.key }
    })
}))

export default useTreeStateStore
