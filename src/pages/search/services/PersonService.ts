import TrustDeck from '../../../core/services/TrustDeck'
import { PersonType } from '../../../core/types/PersonEntity'

const PersonService = {
  fuzzySearch: async (entity: string, query: string) => {
    return TrustDeck.instance().fuzzySearch(entity, query)
  },

  personUpdate: async (person: PersonType): Promise <PersonType> => {
    return TrustDeck.instance().putPerson(person)
  }
}

export default PersonService