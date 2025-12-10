import { PersonType } from 'core/types/PersonEntity'
import { create } from 'zustand'

type DuplicatesState = {
  newEntry: PersonType | null
  duplicates: any[]
  setNewEntry: (newEntry: PersonType) => void
  setDuplicates: (duplicates: any[]) => void
  setFromResponse: (data: any) => void
  clearDuplicates: () => void
}

const useDuplicatesStore = create<DuplicatesState>((set) => ({
  newEntry: null,
  duplicates: [],
  setNewEntry: (newEntry) => set({ newEntry }),
  setDuplicates: (duplicates) => set( { duplicates }),
  setFromResponse: (data) =>
    set({
      newEntry: data,
      duplicates: data.matchingEntities || [],
    }),
  clearDuplicates: () => set({ newEntry: null, duplicates: [] })
}))

export default useDuplicatesStore
