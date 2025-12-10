import TrustDeck from '@service/TrustDeck'

const ProjectService = {
  deleteProject: async () => {
    return TrustDeck.instance().deleteProject()
  }
}

export default ProjectService;
