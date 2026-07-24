/*
 * Trust Deck Services
 * Copyright 2024-2026 Armin Müller and Loic Khodarkovsky
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

import type { CustomTreeNode, GroupStoredAttributes } from '../types/CustomTreeNode'
import TrustDeck, { TrustDeckHttpError } from '@service/TrustDeck'
import type { Algorithm, Domain } from '../../../core/types/Domain'
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

const DEFAULT_ALGORITHM: Algorithm = {
  name: 'RANDOM_LET',
  alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  randomAlgorithmDesiredSize: 100_000_000,
  randomAlgorithmDesiredSuccessProbability: 0.99999998,
  consecutiveValueCounter: 1,
  pseudonymLength: 16,
  paddingCharacter: '0',
  addCheckDigit: true,
  lengthIncludesCheckDigit: false,
  saltLength: 32
}

const ALGORITHM_FORM_FIELDS: Array<keyof GroupStoredAttributes> = [
  'algorithm',
  'alphabet',
  'customAlphabetCharacters',
  'maxnumpsn',
  'randomAlgorithmDesiredSuccessProbability',
  'consecutiveValueCounter',
  'psnlength',
  'paddingchar',
  'checkdigit',
  'lengthIncludesCheckDigit',
  'salt',
  'saltLength',
  'algorithmInherited'
]

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

/** Maps an API domain and its nested algorithm to the form representation. */
const normalizeDomain = (
  domain: Domain,
  superDomainName?: string | null
): GroupStoredAttributes => {
  const algorithm = domain.algorithm ?? DEFAULT_ALGORITHM
  const alphabetKey = getAlphabetKeyByCharacters(algorithm.alphabet ?? '')
  const algorithmInherited = Boolean(domain.algorithmInherited)

  return {
    label: domain.name ?? '',
    validFrom: formatDate(domain.validFrom),
    validFromInherited: Boolean(domain.validFromInherited),
    validTo: formatDate(domain.validTo),
    validityTime: domain.validityTime ?? '',
    validToInherited: Boolean(domain.validToInherited),
    prefix: domain.prefix ?? '',
    psnlength: numberToString(algorithm.pseudonymLength),
    pseudonymLengthInherited: algorithmInherited,
    alphabet: alphabetKey ?? CUSTOM_ALPHABET_VALUE,
    alphabetInherited: algorithmInherited,
    ...(alphabetKey === null && algorithm.alphabet
      ? { customAlphabetCharacters: algorithm.alphabet }
      : {}),
    algorithm: algorithm.name ?? DEFAULT_ALGORITHM.name,
    algorithmInherited,
    maxnumpsn:
      numberToString(algorithm.randomAlgorithmDesiredSize) ??
      String(DEFAULT_ALGORITHM.randomAlgorithmDesiredSize),
    randomAlgorithmDesiredSizeInherited: algorithmInherited,
    randomAlgorithmDesiredSuccessProbability:
      numberToString(algorithm.randomAlgorithmDesiredSuccessProbability) ??
      String(DEFAULT_ALGORITHM.randomAlgorithmDesiredSuccessProbability),
    randomAlgorithmDesiredSuccessProbabilityInherited: algorithmInherited,
    multiplepsn: Boolean(domain.multiplePsnAllowed ?? false),
    multiplePsnAllowedInherited: Boolean(
      domain.multiplePsnAllowedInherited
    ),
    consecutiveValueCounter:
      numberToString(algorithm.consecutiveValueCounter) ?? '1',
    paddingchar:
      algorithm.paddingCharacter ?? DEFAULT_ALGORITHM.paddingCharacter,
    paddingCharacterInherited: algorithmInherited,
    checkdigit: Boolean(
      algorithm.addCheckDigit ?? DEFAULT_ALGORITHM.addCheckDigit
    ),
    addCheckDigitInherited: algorithmInherited,
    lengthIncludesCheckDigit: Boolean(
      algorithm.lengthIncludesCheckDigit ??
        DEFAULT_ALGORITHM.lengthIncludesCheckDigit
    ),
    lengthIncludesCheckDigitInherited: algorithmInherited,
    enforceStartDateValidity: Boolean(
      domain.enforceStartDateValidity ?? false
    ),
    enforceStartDateValidityInherited: Boolean(
      domain.enforceStartDateValidityInherited
    ),
    enforceEndDateValidity: Boolean(domain.enforceEndDateValidity ?? false),
    enforceEndDateValidityInherited: Boolean(
      domain.enforceEndDateValidityInherited
    ),
    salt: algorithm.salt ?? '',
    saltLength:
      numberToString(algorithm.saltLength) ??
      String(DEFAULT_ALGORITHM.saltLength),
    description: domain.description ?? '',
    parentgroup: superDomainName || domain.superDomainName || 'ROOT'
  }
}

/** Converts supported date input formats to a valid local ISO date-time. */
const toLocalDateTime = (input?: string | null): string | null => {
  if (!input) return null
  const raw = input.trim()

  if (/^\d{4}-\d{2}-\d{2}(?:T|\s)/.test(raw)) {
    const normalized = raw.replace(' ', 'T')
    return Number.isNaN(new Date(normalized).getTime()) ? null : normalized
  }

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

/** Parses locale-formatted numbers used by the domain form. */
const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const raw = String(value).trim().replace(/\s/g, '')
  if (!raw) return null

  const normalized = raw
    .replace(/(?<=\d)[.,](?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

/** Parses a finite decimal probability from a form value. */
const toDecimalNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  const raw = String(value).trim().replace(/\s/g, '')
  if (!raw) return null

  const normalized =
    raw.includes(',') && !raw.includes('.')
      ? raw.replace(',', '.')
      : raw.replace(/,/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const resolveAlphabet = (
  payload: GroupStoredAttributes,
  fallback?: Algorithm | null
): string => {
  const selected =
    payload.alphabet === CUSTOM_ALPHABET_VALUE
      ? String(payload.customAlphabetCharacters ?? '')
      : characters[payload.alphabet as keyof typeof characters] || ''
  return (
    selected ||
    fallback?.alphabet ||
    DEFAULT_ALGORITHM.alphabet ||
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  )
}

/** Builds the complete nested algorithm DTO expected by the backend. */
const buildAlgorithm = (
  payload: GroupStoredAttributes,
  fallback?: Algorithm | null,
  stored?: GroupStoredAttributes
): Algorithm => {
  const base = fallback ?? DEFAULT_ALGORITHM
  const name = String(payload.algorithm ?? base.name).trim() || base.name
  const saltWasChanged = stored ? payload.salt !== stored.salt : true
  const requestedSalt = String(payload.salt ?? '')
  const salt = saltWasChanged
    ? requestedSalt
    : String(base.salt ?? requestedSalt)

  return {
    name,
    alphabet: resolveAlphabet(payload, base),
    randomAlgorithmDesiredSize:
      toNumberOrNull(payload.maxnumpsn) ??
      base.randomAlgorithmDesiredSize ??
      DEFAULT_ALGORITHM.randomAlgorithmDesiredSize,
    randomAlgorithmDesiredSuccessProbability:
      toDecimalNumberOrNull(
        payload.randomAlgorithmDesiredSuccessProbability
      ) ??
      base.randomAlgorithmDesiredSuccessProbability ??
      DEFAULT_ALGORITHM.randomAlgorithmDesiredSuccessProbability,
    consecutiveValueCounter:
      toNumberOrNull(payload.consecutiveValueCounter) ??
      base.consecutiveValueCounter ??
      DEFAULT_ALGORITHM.consecutiveValueCounter,
    pseudonymLength:
      toNumberOrNull(payload.psnlength) ??
      base.pseudonymLength ??
      DEFAULT_ALGORITHM.pseudonymLength,
    paddingCharacter:
      String(payload.paddingchar ?? base.paddingCharacter ?? '0').slice(0, 1) ||
      DEFAULT_ALGORITHM.paddingCharacter,
    addCheckDigit:
      payload.checkdigit ??
      base.addCheckDigit ??
      DEFAULT_ALGORITHM.addCheckDigit,
    lengthIncludesCheckDigit:
      payload.lengthIncludesCheckDigit ??
      base.lengthIncludesCheckDigit ??
      DEFAULT_ALGORITHM.lengthIncludesCheckDigit,
    salt,
    saltLength:
      toNumberOrNull(payload.saltLength) ??
      base.saltLength ??
      DEFAULT_ALGORITHM.saltLength
  }
}

const hasAlgorithmChanges = (
  stored: GroupStoredAttributes,
  temporal: GroupStoredAttributes
): boolean =>
  ALGORITHM_FORM_FIELDS.some(
    (field) => JSON.stringify(stored[field]) !== JSON.stringify(temporal[field])
  )

const assignIfChanged = (
  output: Record<string, unknown>,
  key: string,
  storedValue: unknown,
  temporalValue: unknown,
  mapper: (value: unknown) => unknown = (value) => value
) => {
  if (JSON.stringify(storedValue) !== JSON.stringify(temporalValue)) {
    output[key] = mapper(temporalValue)
  }
}

/** Creates the complete request body for POST /domains/complete. */
const mapCreateDomain = (
  payload: GroupStoredAttributes
): Record<string, unknown> => {
  const hasParent = Boolean(
    payload.parentgroup && payload.parentgroup !== 'ROOT'
  )
  const inheritAlgorithm = hasParent && Boolean(payload.algorithmInherited)

  const output: Record<string, unknown> = {
    name: payload.label,
    prefix: payload.prefix,
    ...(hasParent ? { superDomainName: payload.parentgroup } : {}),
    ...(payload.description !== undefined
      ? { description: payload.description }
      : {}),
    ...(payload.validFromInherited
      ? {}
      : { validFrom: toLocalDateTime(payload.validFrom) }),
    ...(payload.validToInherited
      ? {}
      : payload.validTo
        ? { validTo: toLocalDateTime(payload.validTo) }
        : payload.validityTime
          ? { validityTime: payload.validityTime }
          : {}),
    ...(payload.enforceStartDateValidityInherited
      ? {}
      : {
          enforceStartDateValidity: Boolean(
            payload.enforceStartDateValidity
          )
        }),
    ...(payload.enforceEndDateValidityInherited
      ? {}
      : {
          enforceEndDateValidity: Boolean(payload.enforceEndDateValidity)
        }),
    ...(payload.multiplePsnAllowedInherited
      ? {}
      : { multiplePsnAllowed: Boolean(payload.multiplepsn) }),
    ...(inheritAlgorithm ? {} : { algorithm: buildAlgorithm(payload) })
  }

  Object.keys(output).forEach((key) => {
    if (output[key] === undefined || output[key] === null) delete output[key]
  })

  return output
}

/** Uses the backend's documented complete-create minimum when a richer payload is rejected. */
const mapMinimalCompleteCreateDomain = (
  payload: GroupStoredAttributes
): Record<string, unknown> => ({
  name: payload.label,
  prefix: payload.prefix,
  ...(payload.parentgroup && payload.parentgroup !== 'ROOT'
    ? { superDomainName: payload.parentgroup }
    : {}),
  ...(payload.description ? { description: payload.description } : {})
})

/** Creates the reduced request body accepted by POST /domains. */
const mapStandardCreateDomain = (
  payload: GroupStoredAttributes
): Record<string, unknown> => {
  const output: Record<string, unknown> = {
    name: payload.label,
    prefix: payload.prefix,
    ...(payload.parentgroup && payload.parentgroup !== 'ROOT'
      ? { superDomainName: payload.parentgroup }
      : {}),
    description: payload.description,
    validFrom: toLocalDateTime(payload.validFrom),
    ...(payload.validTo
      ? { validTo: toLocalDateTime(payload.validTo) }
      : payload.validityTime
        ? { validityTime: payload.validityTime }
        : {})
  }

  Object.keys(output).forEach((key) => {
    if (output[key] === undefined || output[key] === null) delete output[key]
  })

  return output
}

/** Creates a partial request body for PUT /domains/complete. */
const mapUpdateDomain = (node: CustomTreeNode): Record<string, unknown> => {
  const stored = node.data.stored
  const temporal = node.data.temporal
  const original = node.data.raw
  const output: Record<string, unknown> = {}

  assignIfChanged(output, 'name', stored.label, temporal.label)
  assignIfChanged(output, 'prefix', stored.prefix, temporal.prefix)
  assignIfChanged(output, 'description', stored.description, temporal.description)
  assignIfChanged(
    output,
    'validFrom',
    stored.validFrom,
    temporal.validFrom,
    (value) => toLocalDateTime(String(value ?? ''))
  )
  assignIfChanged(
    output,
    'validTo',
    stored.validTo,
    temporal.validTo,
    (value) => toLocalDateTime(String(value ?? ''))
  )
  assignIfChanged(
    output,
    'validityTime',
    stored.validityTime,
    temporal.validityTime
  )
  assignIfChanged(
    output,
    'enforceStartDateValidity',
    stored.enforceStartDateValidity,
    temporal.enforceStartDateValidity,
    Boolean
  )
  assignIfChanged(
    output,
    'enforceEndDateValidity',
    stored.enforceEndDateValidity,
    temporal.enforceEndDateValidity,
    Boolean
  )
  assignIfChanged(
    output,
    'multiplePsnAllowed',
    stored.multiplepsn,
    temporal.multiplepsn,
    Boolean
  )

  if (hasAlgorithmChanges(stored, temporal)) {
    if (!temporal.algorithmInherited) {
      output.algorithm = buildAlgorithm(
        temporal,
        original?.algorithm,
        stored
      )
      output.algorithmInherited = false
    }
  }

  Object.keys(output).forEach((key) => {
    if (output[key] === undefined) delete output[key]
  })

  return output
}

/** Creates the reduced request body accepted by PUT /domains. */
const mapStandardUpdateDomain = (
  node: CustomTreeNode
): Record<string, unknown> => {
  const stored = node.data.stored
  const temporal = node.data.temporal
  const output: Record<string, unknown> = {}

  assignIfChanged(output, 'name', stored.label, temporal.label)
  assignIfChanged(output, 'prefix', stored.prefix, temporal.prefix)
  assignIfChanged(output, 'description', stored.description, temporal.description)
  assignIfChanged(
    output,
    'validFrom',
    stored.validFrom,
    temporal.validFrom,
    (value) => toLocalDateTime(String(value ?? ''))
  )
  assignIfChanged(
    output,
    'validTo',
    stored.validTo,
    temporal.validTo,
    (value) => toLocalDateTime(String(value ?? ''))
  )
  assignIfChanged(
    output,
    'validityTime',
    stored.validityTime,
    temporal.validityTime
  )
  assignIfChanged(
    output,
    'multiplePsnAllowed',
    stored.multiplepsn,
    temporal.multiplepsn,
    Boolean
  )

  return output
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

/** Replaces one tree node with a complete domain response. */
const hydrateDomainInTree = (
  nodes: CustomTreeNode[],
  lookupName: string,
  domain: Domain
): CustomTreeNode[] =>
  nodes.map((node) => {
    const children = Array.isArray(node.children)
      ? hydrateDomainInTree(
          node.children as CustomTreeNode[],
          lookupName,
          domain
        )
      : node.children

    if (node.label !== lookupName) return { ...node, children }

    const stored = normalizeDomain(domain, domain.superDomainName ?? null)
    return {
      ...node,
      label: domain.name || node.label,
      hasChanges: false,
      data: {
        stored,
        temporal: { ...stored },
        raw: domain
      },
      children
    }
  })

/** Flattens an editable domain tree to its backing domain records. */
const flattenTree = (nodes: CustomTreeNode[]): Domain[] => {
  const output: Domain[] = []
  const walk = (node: CustomTreeNode) => {
    if (node.data?.raw) output.push(node.data.raw)
    if (Array.isArray(node.children)) {
      ;(node.children as CustomTreeNode[]).forEach(walk)
    }
  }
  nodes.forEach(walk)
  return output
}

/** Provides domain-group operations and request/response mapping. */
const DomainService = {
  normalizeGroup: (group: Domain, superDomainName?: string | null) =>
    normalizeDomain(group, superDomainName),

  hydrateGroupTree: (
    trees: CustomTreeNode[],
    lookupName: string,
    group: Domain
  ): CustomTreeNode[] => hydrateDomainInTree(trees, lookupName, group),

  getGroups: async (): Promise<CustomTreeNode[]> => {
    try {
      const remoteTrees = await TrustDeck.instance().getDomainsHierarchy()
      const treeItems = Array.isArray(remoteTrees) ? remoteTrees : [remoteTrees]
      const mapped = treeItems
        .map((item, index) =>
          mapTree(item as DomainTreeDto, String(index), null)
        )
        .filter(Boolean) as CustomTreeNode[]
      if (mapped.length > 0) return mapped
    } catch {
      // Fall back to the domain search endpoint when hierarchy access is unavailable.
    }

    const domains = await TrustDeck.instance().searchReadableDomains('*')
    return domains.map((domain, index) =>
      mapFlatDomainToNode(domain, String(index))
    )
  },

  getReadableGroups: async (): Promise<Domain[]> => {
    try {
      const tree = await DomainService.getGroups()
      const treeDomains = flattenTree(tree)
      if (treeDomains.length > 0) return treeDomains
    } catch {
      // Fall through to the search endpoint.
    }
    return TrustDeck.instance().searchReadableDomains('*')
  },

  getGroup: async (groupName: string): Promise<Domain> =>
    TrustDeck.instance().getDomain(groupName),

  createGroup: async (
    payload: GroupStoredAttributes,
    complete = true
  ): Promise<Domain> => {
    let created: any
    if (complete) {
      try {
        created = await TrustDeck.instance().createGroupComplete(
          mapCreateDomain(payload)
        )
      } catch (error) {
        // Some deployed backend versions reject the rich DTO during binding.
        // Retrying the endpoint's documented minimum still creates a domain
        // with the backend's default AlgorithmDTO configuration.
        if (!(error instanceof TrustDeckHttpError) || error.status !== 400) {
          throw error
        }
        created = await TrustDeck.instance().createGroupComplete(
          mapMinimalCompleteCreateDomain(payload)
        )
      }
    } else {
      created = await TrustDeck.instance().createGroup(
        mapStandardCreateDomain(payload)
      )
    }
    if (created && typeof created === 'object' && created.name) {
      return created as Domain
    }

    const groupName = String(payload.label ?? '').trim()
    if (!groupName) {
      throw new Error('The backend did not return the created domain.')
    }
    return TrustDeck.instance().getDomain(groupName)
  },

  updateGroups: async (
    trees: CustomTreeNode[],
    exclude?: CustomTreeNode,
    complete = true
  ): Promise<void> => {
    const flattenLeavesFirst = (nodes: CustomTreeNode[]): CustomTreeNode[] => {
      const output: CustomTreeNode[] = []
      const visit = (node: CustomTreeNode) => {
        if (Array.isArray(node.children)) {
          ;(node.children as CustomTreeNode[]).forEach(visit)
        }
        output.push(node)
      }
      nodes.forEach(visit)
      return output
    }

    const nodesToUpdate = flattenLeavesFirst(trees).filter(
      (node) => node.hasChanges && (!exclude || node.key !== exclude.key)
    )

    for (const node of nodesToUpdate) {
      const storedName = node.data.stored.label
      if (!storedName) continue
      const payload = complete
        ? mapUpdateDomain(node)
        : mapStandardUpdateDomain(node)
      if (Object.keys(payload).length === 0) continue
      if (complete) {
        await TrustDeck.instance().updateGroupComplete(storedName, true, payload)
      } else {
        await TrustDeck.instance().updateGroup(storedName, payload)
      }
    }
  },

  deleteGroup: async (groupName: string): Promise<void> => {
    await TrustDeck.instance().deleteGroup(groupName, true)
  }
}

export default DomainService
