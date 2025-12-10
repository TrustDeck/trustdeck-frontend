import { create } from 'zustand'

type SearchResultsState = {
  results: any[]
  setResults: (results: any[]) => void
  clearResults: () => void
}

const useSearchResultsStore = create<SearchResultsState>((set) => ({
  results: [],
  setResults: (results) => set({ results }),
  clearResults: () => set({ results: [] }),
}))

export default useSearchResultsStore
