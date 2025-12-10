
import { create } from 'zustand'

type GroupState = {
  selectedGroup: string
  groups: any[] | null //TODO define proper type not any!
  setSelectedGroup: (selectedGroup: string) => void
  setGroups: (groups: any[]) => void
}

const useGroupStore = create<GroupState>((set) => ({
  selectedGroup: '',
  groups: null,
  setSelectedGroup: (group) => set({ selectedGroup: group }),
  setGroups: (groups) => set({ groups })
}))

export default useGroupStore