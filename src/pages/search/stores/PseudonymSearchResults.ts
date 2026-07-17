import { create } from 'zustand'
import { Pseudonym } from '../../../core/types/Pseudonym'

type PseudonymSearchResultState = {
  pseudonymValue: Pseudonym | null
  results: Pseudonym[]
  hasSearched: boolean
  selectedResult: {
    domainName: string
    psn: string
    editMode: boolean
  } | null
  setPseudonymValue: (pseudonym: Pseudonym) => void
  clearPseudonymValue: () => void
  setResults: (results: Pseudonym[]) => void
  selectResult: (domainName: string, psn: string, editMode?: boolean) => void
  clearSelectedResult: () => void
  removeResult: (domainName: string, psn: string) => void
  clearResults: () => void
}

const usePseudonymStore = create<PseudonymSearchResultState>((set) => ({
  pseudonymValue: null,
  results: [],
  hasSearched: false,
  selectedResult: null,
  setPseudonymValue: (pseudonymValue) => set({ pseudonymValue }),
  clearPseudonymValue: () => set({ pseudonymValue: null }),
  setResults: (results) => set({ results, hasSearched: true }),
  selectResult: (domainName, psn, editMode = false) =>
    set({ selectedResult: { domainName, psn, editMode } }),
  clearSelectedResult: () => set({ selectedResult: null }),
  removeResult: (domainName, psn) =>
    set((state) => ({
      results: state.results.filter(
        (result) => !(result.domainName === domainName && result.psn === psn)
      ),
      selectedResult:
        state.selectedResult?.domainName === domainName &&
        state.selectedResult?.psn === psn
          ? null
          : state.selectedResult
    })),
  clearResults: () =>
    set({ results: [], hasSearched: false, selectedResult: null })
}))

export default usePseudonymStore
