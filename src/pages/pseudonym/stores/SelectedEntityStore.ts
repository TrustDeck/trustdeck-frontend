import { create } from 'zustand'


type EntityId = {
  identifier: string
  identifierType: string
}

type SelectedEntityStore = {
  selectedEntityId: EntityId
  setSelectedEntityId: (entity: EntityId) => void
}

const useSelectedEntityStore = create<SelectedEntityStore>((set) => ({
  selectedEntityId: { identifier: '', identifierType: '' },
  setSelectedEntityId: (entity) => set({ selectedEntityId: entity }),
}))

export default useSelectedEntityStore