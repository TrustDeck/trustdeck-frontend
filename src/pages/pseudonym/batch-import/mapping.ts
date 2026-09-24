import type { ColumnMapping, ImportField } from './types'

const ALIASES: Record<ImportField, string[]> = {
  identifier: [
    'identifier',
    'id',
    'patientid',
    'patientidentifier',
    'patientennummer',
    'personid',
    'subjectid',
    'externalid',
    'fallnummer'
  ],
  idType: [
    'idtype',
    'identifiertype',
    'identifierart',
    'kennungsart',
    'identifiercategory'
  ],
  psn: ['psn', 'pseudonym', 'pseudonymid'],
  validFrom: ['validfrom', 'validitystart', 'startdate', 'gueltigvon'],
  validTo: ['validto', 'validityend', 'enddate', 'gueltigbis'],
  validityTime: ['validitytime', 'validityperiod', 'gueltigkeitsdauer']
}

const GERMAN_ALIASES: Record<string, string> = {
  gültigvon: 'validfrom',
  gültigbis: 'validto',
  gültigkeitsdauer: 'validitytime'
}

export function normalizeHeader(value: string): string {
  const normalized = value
    .trim()
    .toLocaleLowerCase()
    .replace(/[ä]/g, 'ä')
    .replace(/[ö]/g, 'ö')
    .replace(/[ü]/g, 'ü')
    .replace(/[^\p{L}\p{N}]/gu, '')
  return GERMAN_ALIASES[normalized] ?? normalized
}

export function suggestMapping(headers: string[]): ColumnMapping {
  const result: ColumnMapping = {
    identifier: null,
    idType: null,
    idTypeFixed: '',
    psn: null,
    validFrom: null,
    validTo: null,
    validityTime: null
  }

  ;(Object.keys(ALIASES) as ImportField[]).forEach((field) => {
    const aliases = new Set(ALIASES[field].map(normalizeHeader))
    const matches = headers
      .map((header, index) => ({ header, index }))
      .filter(({ header }) => aliases.has(normalizeHeader(header)))
    if (matches.length === 1) result[field] = matches[0].index
  })

  return result
}

export function mappingUsesSourceColumn(
  mapping: ColumnMapping,
  columnIndex: number
): Exclude<ImportField, 'idTypeFixed'>[] {
  const fields: Exclude<ImportField, 'idTypeFixed'>[] = [
    'identifier',
    'idType',
    'psn',
    'validFrom',
    'validTo',
    'validityTime'
  ]
  return fields.filter((field) => mapping[field] === columnIndex)
}

export function hasCompleteMapping(mapping: ColumnMapping): boolean {
  return (
    mapping.identifier !== null &&
    (mapping.idType !== null || mapping.idTypeFixed.trim().length > 0)
  )
}
