import { Pseudonym } from "../../../core/types/Pseudonym"
import TrustDeck from "../../../core/services/TrustDeck"

const PseudonymService = {
  searchPseudonym: async (pseudonym: string): Promise<Pseudonym> => {
    try {
      return await TrustDeck.instance().searchPseudonym(pseudonym)
    } catch (error: any) {
      // 404 = no results
      if (
        error instanceof Error &&
        error.message.startsWith('Request failed: 404')
      ) {
        return null as unknown as Pseudonym
      }
      throw error
    }
  }
}

export default PseudonymService
