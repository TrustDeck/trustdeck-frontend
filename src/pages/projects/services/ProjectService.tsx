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

  getEntityAttributes: () => {
    return mockProjectEntities
  }
}

export default ProjectService
