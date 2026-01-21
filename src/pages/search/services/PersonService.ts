import TrustDeck from '../../../core/services/TrustDeck'
import { PersonType } from '../../../core/types/PersonEntity'

const PersonService = {
  fuzzySearch: async (entity: string, query: string) => {
    try {
      return await TrustDeck.instance().fuzzySearch(entity, query)
    } catch (error: any) {
      // 404 = no results
      if (
        error instanceof Error &&
        error.message.startsWith('Request failed: 404')
      ) {
        return []
      }
      throw error
    }
  },

  personUpdate: async (updatedPerson: any, trustdeckID: string): Promise <PersonType> => {
    return TrustDeck.instance().putPerson(updatedPerson, trustdeckID)
  }
}

export default PersonService