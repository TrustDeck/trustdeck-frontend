import { CustomTreeNode, GroupStoredAttributes } from '../types/CustomTreeNode'
import TrustDeck from '@service/TrustDeck'
import type { Domain } from '../../../core/types/Domain'
import {
  characters,
  CUSTOM_ALPHABET_VALUE,
  getAlphabetKeyByCharacters
} from '../utils/alphabetOptions.ts'

type DomainTreeDto = {
  domain?: Domain
  children?: DomainTreeDto[]
}

const formatDate = (dateString?: string | null): string | undefined => {
  if (!dateString) return undefined
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return undefined
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}-${day}-${year}`
}

const numberToString = (value?: number | string | null): string | undefined => {
  if (value === null || value === undefined || value === '') return undefined
  return String(value)
}

const normalizeDomain = (
  g: Domain,
  superDomainName?: string | null
): GroupStoredAttributes => {
  const alphabetKey = getAlphabetKeyByCharacters(g.alphabet)
  return {
    label: g.name ?? '',
    validFrom: formatDate(g.validFrom),
    validFromInherited: g.validFromInherited,
    validTo: formatDate(g.validTo),
    validityTime: g.validityTime,
    validToInherited: g.validToInherited,
    prefix: g.prefix ?? '',
    psnlength: numberToString(g.pseudonymLength),
    pseudonymLengthInherited: g.pseudonymLengthInherited,
    alphabet: alphabetKey ?? CUSTOM_ALPHABET_VALUE,
    alphabetInherited: g.alphabetInherited,
    ...(alphabetKey === null && g.alphabet != null
      ? { customAlphabetCharacters: g.alphabet }
      : {}),
    algorithm: g.algorithm ?? '',
    algorithmInherited: g.algorithmInherited,
    maxnumpsn: numberToString(g.randomAlgorithmDesiredSize),
    randomAlgorithmDesiredSizeInherited: g.randomAlgorithmDesiredSizeInherited,
    randomAlgorithmDesiredSuccessProbability: numberToString(
      g.randomAlgorithmDesiredSuccessProbability
    ),
    randomAlgorithmDesiredSuccessProbabilityInherited:
      g.randomAlgorithmDesiredSuccessProbabilityInherited,
    multiplepsn: Boolean(g.multiplePsnAllowed ?? false),
    multiplePsnAllowedInherited: g.multiplePsnAllowedInherited,
    consecutiveValueCounter: numberToString(g.consecutiveValueCounter),
    paddingchar: g.paddingCharacter ?? '',
    paddingCharacterInherited: g.paddingCharacterInherited,
    checkdigit: Boolean(g.addCheckDigit ?? false),
    addCheckDigitInherited: g.addCheckDigitInherited,
    lengthIncludesCheckDigit: Boolean(g.lengthIncludesCheckDigit ?? false),
    lengthIncludesCheckDigitInherited: g.lengthIncludesCheckDigitInherited,
    enforceStartDateValidity: Boolean(g.enforceStartDateValidity ?? false),
    enforceStartDateValidityInherited: g.enforceStartDateValidityInherited,
    enforceEndDateValidity: Boolean(g.enforceEndDateValidity ?? false),
    enforceEndDateValidityInherited: g.enforceEndDateValidityInherited,
    salt: g.salt ?? '',
    saltLength: numberToString(g.saltLength),
    description: g.description ?? '',
    parentgroup: superDomainName || g.superDomainName || 'ROOT'
  }
}

const toLocalDateTime = (input?: string | null): string | null => {
  if (!input) return null
  const parts = input.split(/[-/]/).map((p) => p.trim())
  if (parts.length !== 3) return null

  let year: string, month: string, day: string
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

  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month) || !/^\d{2}$/.test(day)) {
    return null
  }

  return `${year}-${month}-${day}T00:00:00`
}

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isNaN(value) ? null : value
  const raw = String(value).trim().replace(/\s/g, '')
  if (!raw) return null

  // Accept both locale-formatted integers (1,000,000 / 1.000.000) and
  // locale-formatted decimals (0.999 / 0,999).
  const normalized = raw
    .replace(/(?<=\d)[.,](?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.')
  const parsed = Number(normalized)
  return Number.isNaN(parsed) ? null : parsed
}

const mapDomain = (payload: GroupStoredAttributes): any => {
  const alphabet =
    payload.alphabet === CUSTOM_ALPHABET_VALUE
      ? (payload.customAlphabetCharacters ?? '')
      : characters[payload.alphabet as keyof typeof characters] || ''

  const out: Record<string, unknown> = {
    name: payload.label,
    ...(payload.parentgroup && payload.parentgroup !== 'ROOT'
      ? { superDomainName: payload.parentgroup }
      : {}),
    prefix: payload.prefix,
    description: payload.description,
    multiplePsnAllowed: payload.multiplepsn,
    paddingCharacter: payload.paddingchar,
    pseudonymLength: toNumberOrNull(payload.psnlength),
    randomAlgorithmDesiredSize: toNumberOrNull(payload.maxnumpsn),
    randomAlgorithmDesiredSuccessProbability: toNumberOrNull(
      payload.randomAlgorithmDesiredSuccessProbability
    ),
    consecutiveValueCounter:
      String(payload.algorithm ?? '').trim().toUpperCase() === 'CONSECUTIVE'
        ? toNumberOrNull(payload.consecutiveValueCounter)
        : 1,
    salt: payload.salt || undefined,
    saltLength: toNumberOrNull(payload.saltLength),
    addCheckDigit: payload.checkdigit ?? false,
    lengthIncludesCheckDigit: payload.lengthIncludesCheckDigit ?? false,
    enforceStartDateValidity: payload.enforceStartDateValidity ?? false,
    enforceEndDateValidity: payload.enforceEndDateValidity ?? false,
    validFrom: toLocalDateTime(payload.validFrom),
    validTo: toLocalDateTime(payload.validTo),
    validityTime: payload.validityTime,
    algorithm: payload.algorithm,
    alphabet
  }

  Object.keys(out).forEach((key) => {
    if (out[key] === null || out[key] === undefined || out[key] === '') {
      delete out[key]
    }
  })

  return out
}

const mapTree = (
  item: DomainTreeDto,
  idx: string,
  superDomainName: string | null
): CustomTreeNode | null => {
  const domain = item.domain
  if (!domain) return null
  const stored = normalizeDomain(domain, superDomainName)
  return {
    key: idx,
    label: domain.name ?? `group-${idx}`,
    hasChanges: false,
    data: {
      stored,
      temporal: { ...stored },
      raw: domain
    },
    children: Array.isArray(item.children)
      ? item.children
          .map((child, i) => mapTree(child, `${idx}-${i}`, domain.name))
          .filter(Boolean) as CustomTreeNode[]
      : []
  }
}

const mapFlatDomainToNode = (domain: Domain, idx: string): CustomTreeNode => {
  const stored = normalizeDomain(domain, domain.superDomainName)
  return {
    key: idx,
    label: domain.name ?? `group-${idx}`,
    hasChanges: false,
    data: {
      stored,
      temporal: { ...stored },
      raw: domain
    },
    children: []
  }
}

const flattenTree = (nodes: CustomTreeNode[]): Domain[] => {
  const out: Domain[] = []
  const walk = (node: CustomTreeNode) => {
    if (node.data?.raw) out.push(node.data.raw)
    if (Array.isArray(node.children)) {
      ;(node.children as CustomTreeNode[]).forEach(walk)
    }
  }
  nodes.forEach(walk)
  return out
}

const GroupService = {
  getGroups: async (): Promise<CustomTreeNode[]> => {
    try {
      const remoteTrees = await TrustDeck.instance().getDomainsHierarchy()
      const treeItems = Array.isArray(remoteTrees) ? remoteTrees : [remoteTrees]
      const mapped = treeItems
        .map((item, i) => mapTree(item as DomainTreeDto, String(i), null))
        .filter(Boolean) as CustomTreeNode[]
      if (mapped.length > 0) return mapped
    } catch {
      // Fall back to the domain search endpoint when hierarchy access is not available.
    }

    const domains = await TrustDeck.instance().searchReadableDomains('*')
    return domains.map((domain, index) => mapFlatDomainToNode(domain, String(index)))
  },

  getReadableGroups: async (): Promise<Domain[]> => {
    try {
      const tree = await GroupService.getGroups()
      const treeDomains = flattenTree(tree)
      if (treeDomains.length > 0) return treeDomains
    } catch {
      // fall through to search endpoint
    }
    return TrustDeck.instance().searchReadableDomains('*')
  },

  getGroup: async (groupName: string): Promise<Domain> => {
    return TrustDeck.instance().getDomain(groupName)
  },

  createGroup: async (payload: any): Promise<void> => {
    return TrustDeck.instance().createGroupComplete(mapDomain(payload))
  },

  updateGroups: async (
    trees: CustomTreeNode[],
    exclude?: CustomTreeNode
  ): Promise<void> => {
    const flattenLeavesFirst = (nodes: CustomTreeNode[]): CustomTreeNode[] => {
      const out: CustomTreeNode[] = []
      const dfs = (n: CustomTreeNode) => {
        if (Array.isArray(n.children)) {
          ;(n.children as CustomTreeNode[]).forEach((c) => dfs(c))
        }
        out.push(n)
      }
      nodes.forEach((n) => dfs(n))
      return out
    }

    const flat = flattenLeavesFirst(trees)
    const nodesToUpdate = flat.filter(
      (node) => node.hasChanges && (!exclude || node.key !== exclude.key)
    )
    if (nodesToUpdate.length === 0) return Promise.resolve()

    for (const node of nodesToUpdate) {
      const storedName = node.data.stored.label
      if (!storedName) continue
      await TrustDeck.instance().updateGroupComplete(
        storedName,
        true,
        mapDomain(node.data.temporal)
      )
    }
  },

  deleteGroup: async (groupName: string): Promise<void> => {
    return TrustDeck.instance().deleteGroup(groupName, true)
  }
}

export default GroupService
