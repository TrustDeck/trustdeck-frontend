
import { create } from 'zustand'

type DomainState = {
  selectedGroup: string
  groups: any[] | null //TODO define proper type not any!
  setSelectedGroup: (selectedGroup: string) => void
  setGroups: (groups: any[]) => void
}

const useDomainStore = create<DomainState>((set) => ({
  selectedGroup: '',
  groups: null,
  setSelectedGroup: (group) => set({ selectedGroup: group }),
  setGroups: (groups) => set({ groups })
}))

export default useDomainStore
