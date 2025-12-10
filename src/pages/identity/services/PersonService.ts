import TrustDeck from '../../../core/services/TrustDeck'

const PersonService = {
  async create(person: any) {
    return TrustDeck.instance().postPerson(person)
  }
}

export default PersonService
