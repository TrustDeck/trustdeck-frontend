import TrustDeck from '@service/TrustDeck'
import { ProjectType } from '../types/ProjectType'

const ProjectService = {
  getProjects: async (): Promise<ProjectType[]> => {
    return TrustDeck.instance().getProjects()
  },

  postProject: async (project: ProjectType): Promise<ProjectType> => {
    const createdProject = await TrustDeck.instance().postProject(project)
    console.log(createdProject)
    return createdProject
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
      // Use base64 data URL so the image persists in localStorage and survives refresh
      return await new Promise<string | undefined>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = () => resolve(undefined)
        reader.readAsDataURL(blob)
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (!message.includes('404')) {
        console.warn('Failed to get project image', err)
      }
      return undefined
    }
  },

  getEntityAttributes: async () => {
    try {
      const response = await TrustDeck.instance().getProjectEntities('*')
      const entitiesFromBackend = response
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
      if (!message.includes('404')) {
        console.error('Failed to load entity attributes from backend', error)
      }
      return []
    }
  },

  getProjectEntities: async (): Promise<string[]> => {
    const mapEntityNames = (response: any[]): string[] =>
      response
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
      if (!message.includes('404')) {
        console.error('Failed to load project entities', error)
      }
      return []
    }
  }
}

export default ProjectService
