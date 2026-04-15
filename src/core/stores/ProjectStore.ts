import { create } from 'zustand'
import { persist } from 'zustand/middleware'


export type Attribute = {
  key?: string
  name?: string
  labelEn?: string
  labelDe?: string
  type?: string
  required?: boolean
  linkage?: boolean
  minimum?: number
  minLength?: number
  maxLength?: number
  enum?: string[]
  values?: string[]
  group?: boolean
  layout?: 'row' | 'group' | 'col'
  repeatable?: boolean
  attributes?: Attribute[]
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
  projectImage?: string
  setSelectedProject: (p: SelectedProject) => void
  setJustCreated: (flag: boolean) => void
  setEntities: (entities: string[]) => void
  setEntityAttributes: (entityAttributes: EntityDefinition[]) => void
  setProjectImage: (image: string | undefined) => void
  clearSelectedProject: () => void
}

const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      selectedProject: null,
      justCreated: false,
      entities: [],
      entityAttributes: [],
      projectImage: undefined,
      setSelectedProject: (p) => set({ selectedProject: p }),
      setJustCreated: (flag) => set({ justCreated: flag }),
      setEntities: (entities) => set({ entities }),
      setEntityAttributes: (entityAttributes) => set({ entityAttributes }),
      setProjectImage:(image) => set({ projectImage: image}),
      clearSelectedProject: () =>
        set({ selectedProject: null, justCreated: false, projectImage: undefined }),
    }),
    { name: 'selected-project' }
  )
)

export default useProjectStore