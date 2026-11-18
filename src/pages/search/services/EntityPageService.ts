import TrustDeck, { TrustDeckHttpError } from '../../../core/services/TrustDeck'
import type { Link } from '../../../core/types/Link'
import type { SortState } from '../../../core/utils/sorting'

/** One page of an entity search, prepared for the result lists. */
export type EntityResultPage = {
  items: any[]
  page: number
  size: number
  /** Number of matches, counted at most up to the backend's count limit. */
  total: number
  /** Whether more entities match than counted. */
  numberOfMatchesExceedsSearchLimit: boolean
}

/**
 * The backend refuses to sort by an attribute without a sort index when more entities match
 * than it counts, since that would mean sorting a huge result set.
 */
export class SortNeedsNarrowerSearchError extends Error {
  constructor() {
    super('Narrow the search to sort by this attribute.')
    this.name = 'SortNeedsNarrowerSearchError'
  }
}

export function pseudonymsToLinks(pseudonyms: any[] = []): Link[] {
  return pseudonyms
    .map((pseudonym) => ({
      group: pseudonym?.domainName ?? pseudonym?.group ?? '',
      pseudonym: pseudonym?.psn ?? pseudonym?.pseudonym ?? '',
      children: Array.isArray(pseudonym?.children)
        ? pseudonymsToLinks(pseudonym.children)
        : undefined
    }))
    .filter((link) => link.group || link.pseudonym)
}

/** Adds the identifiers and person fields the result views expect. */
export function normalizeEntityResult(result: any, entityTypeName: string) {
  const trustdeckID = String(
    result?.trustdeckID ??
      result?.trustdeckId ??
      result?.trustDeckId ??
      result?.id ??
      ''
  )

  if (!result || !result.data) {
    return {
      ...result,
      trustdeckID,
      entityTypeName: result?.entityTypeName ?? entityTypeName,
      type: result?.type ?? entityTypeName
    }
  }

  const data = result.data
  const firstAddress = Array.isArray(data.address) ? data.address[0] : undefined

  return {
    ...result,
    trustdeckID,
    entityTypeName: result.entityTypeName ?? entityTypeName,
    type: result.type ?? entityTypeName,
    data: {
      ...data,
      firstName: data.firstName ?? data.firstname ?? '',
      lastName: data.lastName ?? data.lastname ?? '',
      dateOfBirth: data.dateOfBirth ?? data.birthdate ?? '',
      id: data.id ?? result.trustdeckID ?? result.trustdeckId ?? '',
      street: data.street ?? firstAddress?.street ?? '',
      houseNumber:
        data.houseNumber ?? data.housenumber ?? firstAddress?.housenumber ?? '',
      postalCode:
        data.postalCode ??
        data.postalcode ??
        data.zip ??
        data.plz ??
        firstAddress?.postalcode ??
        '',
      city: data.city ?? firstAddress?.city ?? '',
      country: data.country ?? firstAddress?.country ?? ''
    }
  }
}

/**
 * Searches one page of entities and adds their pseudonyms. The backend sorts and pages, so
 * that this also works for entity types with millions of entities.
 */
export async function fetchEntityPage(
  entityTypeName: string,
  query: string,
  page: number,
  size: number,
  sort: SortState | null,
  projectAbbreviation: string
): Promise<EntityResultPage> {
  let result
  try {
    result = await TrustDeck.instance().searchEntitiesPage(
      entityTypeName,
      query,
      page,
      size,
      sort,
      projectAbbreviation
    )
  } catch (error) {
    if (error instanceof TrustDeckHttpError && error.status === 422) {
      throw new SortNeedsNarrowerSearchError()
    }
    throw error
  }

  const items = await Promise.all(
    result.items.map(async (entry) => {
      // The pseudonym endpoint applies the domain permissions, so pseudonyms are loaded per entity
      const entity = normalizeEntityResult(entry, entityTypeName)
      if (!entity.trustdeckID) return entity

      try {
        const pseudonyms = await TrustDeck.instance().getEntityPseudonyms(
          entityTypeName,
          entity.trustdeckID,
          projectAbbreviation
        )
        return { ...entity, links: pseudonymsToLinks(pseudonyms) }
      } catch (error) {
        console.error('Failed to load entity pseudonyms:', error)
        return entity
      }
    })
  )

  return { ...result, items }
}
