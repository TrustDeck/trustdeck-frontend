import TrustDeck from '@service/TrustDeck'

export const PseudonymService = {
  createPseudonym: async (payload: any, selectedGroup: string) => {
    return await TrustDeck.instance().createPseudonym(payload, selectedGroup)
  }
}
