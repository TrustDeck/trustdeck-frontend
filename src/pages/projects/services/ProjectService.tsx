import TrustDeck from '@service/TrustDeck'
import { ProjectType } from '../types/ProjectType'
import { mockProjectEntities } from './mockTypes'

const ProjectService = {
  getProjects: async (): Promise<ProjectType[]> => {
    return TrustDeck.instance().getProjects()
  },

  postProject: async (project: ProjectType): Promise<ProjectType> => {
    const createdProject = await TrustDeck.instance().postProject(project)

    await TrustDeck.instance().createBaseType()
    await TrustDeck.instance().createType(createdProject.abbreviation)
    console.log(createdProject)
    return createdProject
  },

  createGroup: async (defaultGroup: any): Promise<any> => {
    return TrustDeck.instance().createGroup(defaultGroup)
  },

  getProjectImage: async (): Promise<string | undefined> => {
    try {
      const blob = await TrustDeck.instance().getImage()
      // Use base64 data URL so the image persists in localStorage and survives refresh
      return await new Promise<string | undefined>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = () => resolve(undefined)
        reader.readAsDataURL(blob)
      })
    } catch (err) {
      console.warn('Failed to get project image', err)
      return undefined
    }
  },

  getEntityAttributes: () => {
    return mockProjectEntities
  }
}

export default ProjectService
