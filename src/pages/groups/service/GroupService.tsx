import { CustomTreeNode, GroupStoredAttributes } from '../types/CustomTreeNode'
import TrustDeck from '@service/TrustDeck'
import {
  characters,
  getAlphabetKeyByCharacters
} from '../utils/alphabetOptions.ts'

const normalizeDomain = (
  g: any,
  superDomainName: string
): GroupStoredAttributes => {
  const formatDate = (dateString: string | null): string | null => {
    if (!dateString) return null
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${month}-${day}-${year}`
  }
  // map/normalize fields from TrustDeck domain to our stored/temporal shape
  return {
    label: g.name ?? '',
    validFrom: formatDate(g.validFrom) ?? undefined,
    validTo: formatDate(g.validTo) ?? undefined,
    prefix: g.prefix ?? '',
    psnlength: String(g.pseudonymLength ?? ''),
    alphabet: getAlphabetKeyByCharacters(g.alphabet) ?? 'onlyNum',
    algorithm: g.algorithm ?? '',
    maxnumpsn: String(g.randomAlgorithmDesiredSize ?? ''),
    multiplepsn: Boolean(g.multiplePsnAllowed ?? false),
    paddingchar: g.paddingCharacter ?? '',
    checkdigit: Boolean(g.addCheckDigit ?? false),
    description: g.description ?? '',
    parentgroup: superDomainName ? superDomainName : 'ROOT' //placeholder TODO
  }
}

const mapDomain = (payload: any): any => {
  const toLocalDateTime = (input?: string | null): string | null => {
    if (!input) return null
    const parts = input.split(/[-/]/).map((p) => p.trim())
    if (parts.length !== 3) return null

    let year: string, month: string, day: string
    // accept MM-DD-YYYY or YYYY-MM-DD
    if (parts[0].length === 4) {
      year = parts[0]
      month = parts[1]
      day = parts[2]
    } else {
      month = parts[0]
      day = parts[1]
      year = parts[2]
    }

    month = month.padStart(2, '0')
    day = day.padStart(2, '0')

    if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month) || !/^\d{2}$/.test(day))
      return null

    return `${year}-${month}-${day}T00:00:00`
  }

  return {
    name: payload.label,
    superDomainName: payload.parentgroup == 'ROOT' ? '' : payload.parentgroup,
    prefix: payload.prefix,
    description: payload.description,
    multiplePsnAllowed: payload.multiplepsn,
    paddingCharacter: payload.paddingchar,
    pseudonymLength: Number(payload.psnlength),
    randomAlgorithmDesiredSize: Number(payload.maxnumpsn),
    addCheckDigit: payload.checkdigit ?? false,
    validFrom: toLocalDateTime(payload.validFrom),
    validTo: toLocalDateTime(payload.validTo),
    algorithm: payload.algorithm,
    alphabet: characters[payload.alphabet] || ''
  }
}

const GroupService = {
  getGroups: async (): Promise<CustomTreeNode[]> => {
    const remoteGroups = await TrustDeck.instance().getGroups()
    const mapGroup = (
      g: any,
      idx: string,
      superDomainName: string
    ): CustomTreeNode => {
      const stored = normalizeDomain(g.domain, superDomainName)
      const temporal = { ...stored } // initially equal; can be adjusted later by UI
      const node = {
        key: idx,
        label: g.domain.name ?? `group-${idx}`,
        hasChanges: false,
        data: {
          stored,
          temporal
        },
        children: Array.isArray(g.children)
          ? g.children.map((c: any, i: number) =>
              mapGroup(c, idx + '-' + i, g.domain.name)
            )
          : undefined
      }
      return node as unknown as CustomTreeNode
    }

    const group = mapGroup(remoteGroups, '0', 'ROOT')
    const result = [group]
    return result
  },
  createGroup: async (payload: any): Promise<void> => {
    return TrustDeck.instance().createGroupComplete(mapDomain(payload))
  },
  updateGroups: async (trees: CustomTreeNode[], exclude?: CustomTreeNode): Promise<void> => {
    const flattenLeavesFirst = (nodes: CustomTreeNode[]): CustomTreeNode[] => {
      const out: CustomTreeNode[] = []
      const dfs = (n: CustomTreeNode) => {
        if (Array.isArray(n.children)) {
          n.children.forEach((c) => dfs(c as CustomTreeNode))
        }
        out.push(n)
      }
      nodes.forEach((n) => dfs(n))
      return out
    }

    const flat = flattenLeavesFirst(trees)
    const nodesToUpdate = flat.filter((node) => node.hasChanges && (!exclude || node.key !== exclude.key))
    if (nodesToUpdate.length === 0) {
      return Promise.resolve()
    } else {
      //iterate over nodesToUpdate and take the temporal data to map and send to backend
      for (const node of nodesToUpdate) {
        await TrustDeck.instance().updateGroupComplete(
          node.data.stored.label,
          true,
          mapDomain(node.data.temporal)
        )
      }

      return new Promise<void>((resolve) => setTimeout(resolve, 2000))
    }
  },

  deleteGroup: async (groupName: string): Promise<void> => {
    return TrustDeck.instance().deleteGroup(groupName, true)
  }
}

export default GroupService
