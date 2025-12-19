import TrustDeck from "@service/TrustDeck";

export const PseudonymService = {
  getGroups: async () => {
    return await TrustDeck.instance().getGroups()
  },

  createPseudonym: async (payload: any, selectedGroup: string) => {
    return await TrustDeck.instance().createPseudonym(payload, selectedGroup)
  }
}