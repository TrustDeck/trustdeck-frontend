import { create } from 'zustand'
import type { SortState } from '../../../core/utils/sorting'
import { fetchEntityPage } from '../services/EntityPageService'

/** The search behind the current page of entity results, so that other pages can be loaded. */
export type EntityPaging = {
  entityTypeName: string
  projectAbbreviation: string
  query: string
  page: number
  pageSize: number
  total: number
  moreMatchesThanTotal: boolean
  /** The chosen order; null for the backend's default (relevance, or latest update for "*"). */
  sort: SortState | null
}

export const DEFAULT_ENTITY_PAGE_SIZE = 10

/** Identifies the latest page request, so that late answers of older requests are ignored. */
let latestPageRequest = 0

type SearchResultsState = {
  results: any[]
  hasSearched: boolean
  entityTypeName: string
  /** Set when the results are one page of a search in the backend. */
  paging: EntityPaging | null
  loadingPage: boolean
  setResults: (results: any[], entityTypeName?: string) => void
  /**
   * Searches one page of entities in the backend and shows it. Throws when the search failed
   * (the shown results then stay unchanged), e.g. with SortNeedsNarrowerSearchError.
   */
  loadPage: (request: {
    entityTypeName: string
    projectAbbreviation: string
    query: string
    page: number
    pageSize?: number
    /** The order; omitted keeps the current order, null restores the default. */
    sort?: SortState | null
  }) => Promise<void>
  removeResult: (identifier: string) => void
  clearResults: () => void
}

function resultIdentifier(result: any): string {
  return String(
    result?.trustdeckID ??
      result?.trustdeckId ??
      result?.trustDeckId ??
      result?.data?.trustdeckID ??
      result?.data?.trustdeckId ??
      result?.data?.trustDeckId ??
      result?.id ??
      ''
  )
}

const useSearchResultsStore = create<SearchResultsState>((set, get) => ({
  results: [],
  hasSearched: false,
  entityTypeName: '',
  paging: null,
  loadingPage: false,
  setResults: (results, entityTypeName) =>
    set((state) => ({
      results,
      hasSearched: true,
      entityTypeName: entityTypeName ?? state.entityTypeName
    })),
  loadPage: async ({
    entityTypeName,
    projectAbbreviation,
    query,
    page,
    pageSize,
    sort
  }) => {
    const current = get().paging
    // The order belongs to the entity type, since attribute columns differ between types
    const sameType = current?.entityTypeName === entityTypeName
    const size = pageSize ?? current?.pageSize ?? DEFAULT_ENTITY_PAGE_SIZE
    const order =
      sort === undefined ? (sameType ? (current?.sort ?? null) : null) : sort
    const request = ++latestPageRequest
    set({ loadingPage: true })
    try {
      const result = await fetchEntityPage(
        entityTypeName,
        query,
        page,
        size,
        order,
        projectAbbreviation
      )
      if (request !== latestPageRequest) return
      set({
        results: result.items,
        hasSearched: true,
        entityTypeName,
        loadingPage: false,
        paging: {
          entityTypeName,
          projectAbbreviation,
          query,
          page,
          pageSize: size,
          total: result.total,
          moreMatchesThanTotal: result.moreMatchesThanTotal,
          sort: order
        }
      })
    } catch (error) {
      if (request === latestPageRequest) set({ loadingPage: false })
      throw error
    }
  },
  removeResult: (identifier) =>
    set((state) => ({
      results: state.results.filter(
        (result) => resultIdentifier(result) !== identifier
      ),
      paging: state.paging
        ? { ...state.paging, total: Math.max(0, state.paging.total - 1) }
        : null
    })),
  clearResults: () => {
    latestPageRequest += 1
    set({
      results: [],
      hasSearched: false,
      entityTypeName: '',
      paging: null,
      loadingPage: false
    })
  }
}))

export default useSearchResultsStore
