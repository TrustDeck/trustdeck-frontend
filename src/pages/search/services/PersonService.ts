import TrustDeck from '../../../core/services/TrustDeck'
import { PersonType } from '../../../core/types/PersonEntity'

const PersonService = {
  personFuzzySearch: async (query: string): Promise<PersonType[]> => {
    return TrustDeck.instance().personFuzzySearch(query)
  },

  personUpdate: async (person: PersonType): Promise <PersonType> => {
    return TrustDeck.instance().putPerson(person)
  }
}

export default PersonService