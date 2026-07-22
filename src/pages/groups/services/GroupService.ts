/*
 * Trust Deck Services
 * Copyright 2024-2026 Armin Müller and Eric Wündisch
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { CustomTreeNode, GroupStoredAttributes } from '../types/CustomTreeNode'
import TrustDeck from '@service/TrustDeck'
import type { Domain } from '../../../core/types/Domain'
import {
  characters,
  CUSTOM_ALPHABET_VALUE,
  getAlphabetKeyByCharacters
} from '../utils/alphabetOptions'

/** Represents the nested domain response returned by the hierarchy API. */
type DomainTreeDto = {
  domain?: Domain
  children?: DomainTreeDto[]
}

/** Formats an API date for the editable domain form. */
const formatDate = (dateString?: string | null): string => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`
}

/** Preserves optional numeric form values as strings. */
const numberToString = (value?: number | string | null): string | undefined => {
  if (value === null || value === undefined || value === '') return undefined
  return String(value)
}

/** Maps an API domain to the group form's stored representation. */
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
    validityTime: g.validityTime ?? '',
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
    maxnumpsn: numberToString(g.randomAlgorithmDesiredSize) ?? '',
    randomAlgorithmDesiredSizeInherited: g.randomAlgorithmDesiredSizeInherited,
    randomAlgorithmDesiredSuccessProbability:
      numberToString(g.randomAlgorithmDesiredSuccessProbability) ?? '',
    randomAlgorithmDesiredSuccessProbabilityInherited:
      g.randomAlgorithmDesiredSuccessProbabilityInherited,
    multiplepsn: Boolean(g.multiplePsnAllowed ?? false),
    multiplePsnAllowedInherited: g.multiplePsnAllowedInherited,
    consecutiveValueCounter: numberToString(g.consecutiveValueCounter) ?? '1',
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
    saltLength: numberToString(g.saltLength) ?? '32',
    description: g.description ?? '',
    parentgroup: superDomainName || g.superDomainName || 'ROOT'
  }
}

/** Converts supported date input formats to a valid local ISO date-time. */
const toLocalDateTime = (input?: string | null): string | null => {
  if (!input) return null
  const raw = input.trim()

  // ISO input can be forwarded after validating it.
  if (/^\d{4}-\d{2}-\d{2}(?:T|\s)/.test(raw)) {
    const normalized = raw.replace(' ', 'T')
    return Number.isNaN(new Date(normalized).getTime()) ? null : normalized
  }

  // UI format: DD.MM.YYYY HH:mm:ss (time is optional).
  const match = raw.match(
    /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  )
  if (!match) return null

  const [
    ,
    dayRaw,
    monthRaw,
    year,
    hourRaw = '0',
    minuteRaw = '0',
    secondRaw = '0'
  ] = match
  const day = dayRaw.padStart(2, '0')
  const month = monthRaw.padStart(2, '0')
  const hour = hourRaw.padStart(2, '0')
  const minute = minuteRaw.padStart(2, '0')
  const second = secondRaw.padStart(2, '0')

  const candidate = `${year}-${month}-${day}T${hour}:${minute}:${second}`
  return Number.isNaN(new Date(candidate).getTime()) ? null : candidate
}

/** Parses locale-formatted numbers used by the group form. */
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

/** Parses a finite decimal probability from a form value. */
const toDecimalNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  const raw = String(value).trim().replace(/\s/g, '')
  if (!raw) return null

  // Decimal probabilities accept either a comma or a dot as separator.
  const normalized =
    raw.includes(',') && !raw.includes('.')
      ? raw.replace(',', '.')
      : raw.replace(/,/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

/** Converts form data to the domain API payload and omits empty values. */
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
    randomAlgorithmDesiredSuccessProbability: toDecimalNumberOrNull(
      payload.randomAlgorithmDesiredSuccessProbability
    ),
    consecutiveValueCounter:
      String(payload.algorithm ?? '')
        .trim()
        .toUpperCase() === 'CONSECUTIVE'
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

/** Converts a nested domain response to the editable tree shape. */
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
      ? (item.children
          .map((child, i) => mapTree(child, `${idx}-${i}`, domain.name))
          .filter(Boolean) as CustomTreeNode[])
      : []
  }
}

/** Converts a flat domain response to a tree node. */
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

/** Flattens an editable domain tree to its backing domain records. */
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

/** Provides domain-group operations and request/response mapping. */
const GroupService = {
  normalizeGroup: (group: Domain, superDomainName?: string | null) =>
    normalizeDomain(group, superDomainName),
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
    return domains.map((domain, index) =>
      mapFlatDomainToNode(domain, String(index))
    )
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
