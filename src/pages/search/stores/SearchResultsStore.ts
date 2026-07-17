import { create } from 'zustand'

type SearchResultsState = {
  results: any[]
  hasSearched: boolean
  entityTypeName: string
  setResults: (results: any[], entityTypeName?: string) => void
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

const useSearchResultsStore = create<SearchResultsState>((set) => ({
  results: [],
  hasSearched: false,
  entityTypeName: '',
  setResults: (results, entityTypeName) =>
    set((state) => ({
      results,
      hasSearched: true,
      entityTypeName: entityTypeName ?? state.entityTypeName
    })),
  removeResult: (identifier) =>
    set((state) => ({
      results: state.results.filter(
        (result) => resultIdentifier(result) !== identifier
      )
    })),
  clearResults: () =>
    set({ results: [], hasSearched: false, entityTypeName: '' })
}))

export default useSearchResultsStore
