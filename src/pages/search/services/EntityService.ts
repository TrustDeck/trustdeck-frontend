import TrustDeck from '../../../core/services/TrustDeck'
import { Link } from '../../../core/types/Link'

function mapToLinks(items: any[]): Link[] {
  return items
    .map((item) => {
      const group = item?.domainName ?? item?.group ?? ''
      const pseudonym = item?.psn ?? item?.pseudonym ?? ''
      const children = Array.isArray(item?.children)
        ? mapToLinks(item.children)
        : undefined

      return {
        group,
        pseudonym,
        ...(children && children.length > 0 ? { children } : {})
      }
    })
    .filter((link) => link.group || link.pseudonym)
}

const EntityService = {
  getEntityPseudonyms: async (
    entityType: string,
    trustdeckID: string
  ): Promise<Link[]> => {
    try {
      const response = await TrustDeck.instance().getEntityPseudonyms(
        entityType,
        trustdeckID
      )
      if (!response) return []
      const items = Array.isArray(response) ? response : [response]
      return mapToLinks(items)
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith('Request failed: 404')
      ) {
        return []
      }
      throw error
    }
  }
}

export default EntityService
