import { describe, expect, it } from 'vitest'

import { hasCompleteMapping, normalizeHeader, suggestMapping } from './mapping'

describe('batch import mapping', () => {
  it('matches English and German aliases after normalization', () => {
    const mapping = suggestMapping([
      'Patient-ID',
      'Kennungsart',
      'GÜLTIG VON',
      'gültig-bis'
    ])
    expect(mapping.identifier).toBe(0)
    expect(mapping.idType).toBe(1)
    expect(mapping.validFrom).toBe(2)
    expect(mapping.validTo).toBe(3)
    expect(normalizeHeader('Patient-ID')).toBe('patientid')
  })

  it('does not guess an ambiguous alias and requires fixed ID type when needed', () => {
    const mapping = suggestMapping(['id', 'identifier'])
    expect(mapping.identifier).toBeNull()
    expect(hasCompleteMapping({ ...mapping, idTypeFixed: 'PatientID' })).toBe(
      false
    )
    expect(
      hasCompleteMapping({
        ...mapping,
        identifier: 0,
        idTypeFixed: 'PatientID'
      })
    ).toBe(true)
  })
})
