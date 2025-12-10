import TrustDeck from '../../../core/services/TrustDeck'

const PersonRecordLinkage = {
  async recordLinkage(person: any) {
    return TrustDeck.instance().recordLinkagePerson(person)
  }
}

export default PersonRecordLinkage
