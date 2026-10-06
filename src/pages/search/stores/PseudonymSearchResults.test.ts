import { describe, expect, it } from 'vitest'

import { findSelectedPseudonym } from './PseudonymSearchResults'

const pseudonym = {
  domainName: 'patients',
  identifierItem: { idType: 'id', identifier: '123' },
  psn: 'PSN-1',
  validFrom: '2026-01-01',
  validFromInherited: false,
  validTo: '',
  validToInherited: false
}

describe('findSelectedPseudonym', () => {
  it('returns the selected result when it is already loaded', () => {
    expect(
      findSelectedPseudonym(
        [pseudonym],
        { domainName: 'patients', psn: 'PSN-1', editMode: false },
        'patients'
      )
    ).toBe(pseudonym)
  })

  it('does not preserve a selection from another domain', () => {
    expect(
      findSelectedPseudonym(
        [pseudonym],
        { domainName: 'encounters', psn: 'PSN-1', editMode: false },
        'patients'
      )
    ).toBeNull()
  })
})
