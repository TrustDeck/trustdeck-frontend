import TrustDeck from '../../../core/services/TrustDeck'
import { PersonType } from '../../../core/types/PersonEntity'

const PersonService = {
  getPerson: async (trustdeckID: string) => {
    return TrustDeck.instance().getPerson(trustdeckID)
  },

  searchEntities: async (
    entityTypeName: string,
    query: string,
    projectAbbreviation?: string
  ) => {
    try {
      return await TrustDeck.instance().searchEntities(
        entityTypeName,
        query,
        projectAbbreviation
      )
    } catch (error: any) {
      // The entity search endpoint returns 404 when there are no results.
      if (
        error instanceof Error &&
        error.message.startsWith('Request failed: 404')
      ) {
        return []
      }
      throw error
    }
  },

  // Kept as a compatibility alias for older callers.
  fuzzySearch: async (entity: string, query: string) => {
    return PersonService.searchEntities(entity, query)
  },

  personUpdate: async (
    updatedPerson: any,
    trustdeckID: string
  ): Promise<PersonType> => {
    return TrustDeck.instance().putPerson(updatedPerson, trustdeckID)
  }
}

export default PersonService
