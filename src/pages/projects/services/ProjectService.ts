/*
 * Trust Deck Services
 * Copyright 2024-2026 Armin Müller and Eric Wündisch
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

import TrustDeck from '@service/TrustDeck'
import { ProjectType } from '../types/ProjectType'

/** Converts an unknown API result to an array without unsafe iteration. */
function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}

/** Provides project API operations used by the projects feature. */
const ProjectService = {
  getProjects: async (): Promise<ProjectType[]> => {
    if (!TrustDeck.instance().hasAccessToken()) return []
    return TrustDeck.instance().getProjects()
  },

  postProject: async (project: ProjectType): Promise<ProjectType> => {
    return TrustDeck.instance().postProject(project)
  },

  updateProject: async (project: ProjectType, projectAbbreviation?: string): Promise<ProjectType> => {
    return TrustDeck.instance().updateProject(project, projectAbbreviation)
  },

  deleteProject: async (projectAbbreviation?: string): Promise<ProjectType> => {
    return TrustDeck.instance().deleteProject(projectAbbreviation)
  },

  createGroup: async (defaultGroup: any): Promise<any> => {
    return TrustDeck.instance().createGroup(defaultGroup)
  },

  getProjectImage: async (projectAbbreviation?: string): Promise<string | undefined> => {
    try {
      const blob = await TrustDeck.instance().getImage(projectAbbreviation)
      // Data URLs survive the persisted project store across page reloads.
      return await new Promise<string | undefined>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = () => resolve(undefined)
        reader.readAsDataURL(blob)
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (!message.includes('404') && !message.includes('No access token available')) {
        console.warn('Failed to get project image', err)
      }
      return undefined
    }
  },

  getEntityAttributes: async () => {
    try {
      const response = await TrustDeck.instance().getProjectEntities('*')
      const entitiesFromBackend = asArray<any>(response)
        .filter(
          (entry: any) =>
            entry &&
            typeof entry.name === 'string' &&
            entry.typeDefinition &&
            Array.isArray(entry.typeDefinition.attributes)
        )
        .map((entry: any) => ({
          name: entry.name,
          typeDefinition: {
            attributes: entry.typeDefinition.attributes
          }
        }))

      return entitiesFromBackend
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!message.includes('404') && !message.includes('No access token available')) {
        console.error('Failed to load entity attributes from backend', error)
      }
      return []
    }
  },

  getProjectEntities: async (): Promise<string[]> => {
    const mapEntityNames = (response: unknown): string[] =>
      asArray<any>(response)
        .map((entry: any) => {
          if (typeof entry === 'string') return entry
          if (entry && typeof entry.name === 'string') return entry.name
          if (entry && typeof entry.typeName === 'string') return entry.typeName
          return null
        })
        .filter((name: string | null): name is string => !!name)

    try {
      const response = await TrustDeck.instance().getProjectEntities('*')
      const names = Array.from(new Set(mapEntityNames(response)))
      return names
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!message.includes('404') && !message.includes('No access token available')) {
        console.error('Failed to load project entities', error)
      }
      return []
    }
  }
}

export default ProjectService
