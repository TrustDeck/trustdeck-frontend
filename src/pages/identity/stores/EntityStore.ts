import { create } from 'zustand'

type EntityState = {
  entityType: string | null
  bulk: boolean
  setEntityType: (type: string | null) => void
  setBulk: (param: boolean) => void
}

const useEntityStore = create<EntityState>((set) => ({
  entityType: null,
  bulk: false,
  setEntityType: (type) => set({ entityType: type }),
  setBulk: (param) => set({ bulk: param })
}))

export default useEntityStore
