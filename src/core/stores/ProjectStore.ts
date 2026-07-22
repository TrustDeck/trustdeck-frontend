/*
 * Trust Deck Services
 * Copyright 2024-2026 Armin Müller and Loic Khodarkovsky
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Describes a field in an entity type definition. */
export type Attribute = {
  key?: string
  name?: string
  labelEn?: string
  labelDe?: string
  type?: string
  required?: boolean
  linkage?: boolean
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  enum?: string[]
  values?: string[]
  group?: boolean
  layout?: 'row' | 'group' | 'col'
  repeatable?: boolean
  attributes?: Attribute[]
  value?: unknown
}

/** Describes an entity definition cached for the selected project. */
type EntityDefinition = {
  name: string
  typeDefinition: {
    attributes: Attribute[]
  }
}

/** Identifies a project selected by the user. */
type SelectedProject = { abbreviation: string; name: string }

/** Defines persisted project selection state and its update operations. */
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

/** Persists the selected project and its lightweight client-side metadata. */
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
      setProjectImage: (image) => set({ projectImage: image }),
      clearSelectedProject: () =>
        set({ selectedProject: null, justCreated: false, projectImage: undefined }),
    }),
    { name: 'selected-project' }
  )
)

export default useProjectStore
