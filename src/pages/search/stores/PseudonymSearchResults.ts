import { create } from 'zustand'
import { Pseudonym } from '../../../core/types/Pseudonym'

type PseudonymSearchResultState = {
  pseudonymValue: Pseudonym | null
  results: Pseudonym[]
  hasSearched: boolean
  setPseudonymValue: (pseudonym: Pseudonym) => void
  clearPseudonymValue: () => void
  setResults: (results: Pseudonym[]) => void
  removeResult: (domainName: string, psn: string) => void
  clearResults: () => void
}

const usePseudonymStore = create<PseudonymSearchResultState>((set) => ({
  pseudonymValue: null,
  results: [],
  hasSearched: false,
  setPseudonymValue: (pseudonymValue) => set({ pseudonymValue }),
  clearPseudonymValue: () => set({ pseudonymValue: null }),
  setResults: (results) => set({ results, hasSearched: true }),
  removeResult: (domainName, psn) =>
    set((state) => ({
      results: state.results.filter(
        (result) =>
          !(
            result.domainName === domainName &&
            result.psn === psn
          )
      )
    })),
  clearResults: () => set({ results: [], hasSearched: false })
}))

export default usePseudonymStore
