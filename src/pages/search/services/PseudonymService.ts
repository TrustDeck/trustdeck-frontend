import { Pseudonym } from '../../../core/types/Pseudonym'
import TrustDeck from '../../../core/services/TrustDeck'

const PseudonymService = {
  /** Retrieve one exact pseudonym for detail views. */
  searchPseudonym: async (
    pseudonym: string,
    domain?: string
  ): Promise<Pseudonym> => {
    try {
      return await TrustDeck.instance().searchPseudonym(pseudonym, domain)
    } catch (error: any) {
      if (
        error instanceof Error &&
        error.message.startsWith('Request failed: 404')
      ) {
        return null as unknown as Pseudonym
      }
      throw error
    }
  },

  /** Search pseudonyms through GET /domains/{domainName}/pseudonyms?query=... */
  searchPseudonyms: async (
    domainName: string,
    query: string
  ): Promise<Pseudonym[]> => {
    try {
      return await TrustDeck.instance().searchPseudonyms(domainName, query)
    } catch (error: any) {
      if (
        error instanceof Error &&
        error.message.startsWith('Request failed: 404')
      ) {
        return []
      }
      throw error
    }
  }
}

export default PseudonymService
