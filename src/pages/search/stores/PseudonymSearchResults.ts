import { create } from 'zustand'
import { Pseudonym } from '../../../core/types/Pseudonym'
import TrustDeck from '../../../core/services/TrustDeck'

/** The search behind the current page of results, so that other pages can be loaded. */
export type PseudonymPaging = {
  domainName: string
  query: string
  page: number
  pageSize: number
  total: number
  totalIsLowerBound: boolean
}

export const DEFAULT_PSEUDONYM_PAGE_SIZE = 10

/** Identifies the latest page request, so that late answers of older requests are ignored. */
let latestPageRequest = 0

export type PseudonymSelection = {
  domainName: string
  psn: string
  editMode: boolean
}

type PseudonymSearchResultState = {
  pseudonymValue: Pseudonym | null
  results: Pseudonym[]
  hasSearched: boolean
  /** Set when the results are one page of a search in the backend. */
  paging: PseudonymPaging | null
  loadingPage: boolean
  selectedResult: PseudonymSelection | null
  setPseudonymValue: (pseudonym: Pseudonym) => void
  clearPseudonymValue: () => void
  setResults: (results: Pseudonym[]) => void
  /**
   * Searches one page of pseudonyms in the backend and shows it. Throws when the search
   * failed; the results are empty then.
   */
  loadPage: (
    domainName: string,
    query: string,
    page: number,
    pageSize?: number
  ) => Promise<void>
  selectResult: (domainName: string, psn: string, editMode?: boolean) => void
  clearSelectedResult: () => void
  removeResult: (domainName: string, psn: string) => void
  clearResults: () => void
}

export function findSelectedPseudonym(
  results: Pseudonym[],
  selection: PseudonymSelection | null,
  fallbackDomain: string
): Pseudonym | null {
  if (!selection) return null
  return (
    results.find(
      (result) =>
        (result.domainName || fallbackDomain) === selection.domainName &&
        result.psn === selection.psn
    ) ?? null
  )
}

const usePseudonymStore = create<PseudonymSearchResultState>((set, get) => ({
  pseudonymValue: null,
  results: [],
  hasSearched: false,
  paging: null,
  loadingPage: false,
  selectedResult: null,
  setPseudonymValue: (pseudonymValue) => set({ pseudonymValue }),
  clearPseudonymValue: () => set({ pseudonymValue: null }),
  setResults: (results) => set({ results, hasSearched: true }),
  loadPage: async (domainName, query, page, pageSize) => {
    const size =
      pageSize ?? get().paging?.pageSize ?? DEFAULT_PSEUDONYM_PAGE_SIZE
    const request = ++latestPageRequest
    set({ loadingPage: true })
    try {
      const result = await TrustDeck.instance().searchPseudonymsPage(
        domainName,
        query,
        page,
        size
      )
      if (request !== latestPageRequest) return
      set({
        results: result.items.map((entry) => ({
          ...entry,
          domainName: entry.domainName || domainName
        })),
        hasSearched: true,
        loadingPage: false,
        paging: {
          domainName,
          query,
          page,
          pageSize: size,
          total: result.total,
          totalIsLowerBound: result.totalIsLowerBound
        }
      })
    } catch (error) {
      if (request !== latestPageRequest) return
      set({
        results: [],
        hasSearched: true,
        loadingPage: false,
        paging: null
      })
      throw error
    }
  },
  selectResult: (domainName, psn, editMode = false) =>
    set({ selectedResult: { domainName, psn, editMode } }),
  clearSelectedResult: () => set({ selectedResult: null }),
  removeResult: (domainName, psn) =>
    set((state) => ({
      results: state.results.filter(
        (result) => !(result.domainName === domainName && result.psn === psn)
      ),
      paging: state.paging
        ? { ...state.paging, total: Math.max(0, state.paging.total - 1) }
        : null,
      selectedResult:
        state.selectedResult?.domainName === domainName &&
        state.selectedResult?.psn === psn
          ? null
          : state.selectedResult
    })),
  clearResults: () => {
    latestPageRequest += 1
    set({
      results: [],
      hasSearched: false,
      selectedResult: null,
      paging: null,
      loadingPage: false
    })
  }
}))

export default usePseudonymStore
