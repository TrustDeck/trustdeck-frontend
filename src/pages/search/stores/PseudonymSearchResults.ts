import { create } from 'zustand'
import { Pseudonym } from '../../../core/types/Pseudonym'

type PseudonymSearchResultState = {
  pseudonymValue: Pseudonym | null
  setPseudonymValue: (pseudonym: Pseudonym) => void
  clearPseudonymValue: () => void
}

const usePseudonymStore = create<PseudonymSearchResultState>((set) => ({
  pseudonymValue: null,
  setPseudonymValue: (pseudonymValue) => set( { pseudonymValue }),
  clearPseudonymValue: () => set({ pseudonymValue: null})
}))

export default usePseudonymStore
