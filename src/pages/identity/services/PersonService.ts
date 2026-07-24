import TrustDeck from '../../../core/services/TrustDeck'

const PersonService = {
  async createWithResult(person: any) {
    return TrustDeck.instance().postPersonWithResult(person)
  },

  async create(person: any) {
    return (await this.createWithResult(person)).entity
  }
}

export default PersonService
