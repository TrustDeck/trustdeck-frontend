import TrustDeck from "@service/TrustDeck";

const mockGroups = [
  {label: 'Group-MRT', value: 'Group-MRT'},
  {label: 'Group-Labor', value: 'Group-Labor'},
  {label: 'Group-EEG', value: 'Group-EEG'}
]

export const PseudonymService = {
  getGroups: async () => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockGroups), 200);
    });
  },

  createPseudonym: async (payload: any, selectedGroup: string) => {
    return await TrustDeck.instance().createPseudonym(payload, selectedGroup)
  }
}