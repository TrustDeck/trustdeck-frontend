import { create } from 'zustand'
import { persist } from 'zustand/middleware'


export type Attribute = {
  name: string
  type?: string
  required: boolean
  linkage?: boolean
  minimum?: number
  minLength?: number
  maxLength?: number
  enum?: string[]
  repeatable?: boolean
  children?: Attribute[]      
  value?: any                   
}

type EntityDefinition = {
  name: string
  typeDefinition: {
    attributes: Attribute[]
  }
}

type SelectedProject = { abbreviation: string; name: string }

type ProjectState = {
  selectedProject: SelectedProject | null
  justCreated: boolean
  entities: string[]
  entityAttributes: EntityDefinition[]
  setSelectedProject: (p: SelectedProject) => void
  setJustCreated: (flag: boolean) => void
  setEntities: (entities: string[]) => void
  setEntityAttributes: (entityAttributes: EntityDefinition[]) => void
  clearSelectedProject: () => void
}

const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      selectedProject: null,
      justCreated: false,
      entities: [],
      entityAttributes: [],
      setSelectedProject: (p) => set({ selectedProject: p }),
      setJustCreated: (flag) => set({ justCreated: flag }),
      setEntities: (entities) => set({ entities }),
      setEntityAttributes: (entityAttributes) => set({ entityAttributes }),
      clearSelectedProject: () => set({ selectedProject: null, justCreated: false }),
    }),
    { name: 'selected-project' }
  )
)

export default useProjectStore