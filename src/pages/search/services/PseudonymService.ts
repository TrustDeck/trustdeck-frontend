import { Pseudonym } from "../../../core/types/Pseudonym"
import TrustDeck from "../../../core/services/TrustDeck"

const PseudonymService = {
  searchPseudonym: async (pseudonym: string): Promise<Pseudonym> => {
    return TrustDeck.instance().searchPseudonym(pseudonym)
  }
}

export default PseudonymService
