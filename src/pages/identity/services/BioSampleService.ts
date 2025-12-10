import TrustDeck from '../../../core/services/TrustDeck'
import { BioSampleEntity } from '../../../core/types/BioSampleEntity'

const BioSampleService = {
  async create(bioSample: BioSampleEntity) {
    return TrustDeck.instance().postBiosample(bioSample)
  }
}

export default BioSampleService
