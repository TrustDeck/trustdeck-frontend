import TrustDeck from '../../../core/services/TrustDeck'

const PersonRecordLinkage = {
  async recordLinkage(person: any) {
    return TrustDeck.instance().recordLinkage('person', person)
  }
}

export default PersonRecordLinkage
