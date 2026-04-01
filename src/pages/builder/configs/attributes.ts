import { Attribute } from '../stores/EntityTypeStore'

export const defaultAttributes: Attribute[] = [
  {
    key: '',
    name: 'firstname',
    labelEn: 'First name',
    labelDe: 'Vorname',
    type: 'string',
    required: true,
    linkage: false,
    repeatable: false,
    minLength: 1,
    maxLength: 100
  },
  {
    key: '',
    name: 'lastname',
    labelEn: 'Last name',
    labelDe: 'Nachname',
    type: 'string',
    required: true,
    linkage: false,
    repeatable: false,
    minLength: 1,
    maxLength: 100
  },
  {
    key: '',
    name: 'birthdate',
    labelEn: 'Date of birth',
    labelDe: 'Geburtsdatum',
    type: 'date',
    required: true,
    linkage: false,
    repeatable: false
  },
  {
    key: '',
    name: 'gender',
    labelEn: 'Gender',
    labelDe: 'Geschlecht',
    type: 'enum',
    required: false,
    linkage: false,
    repeatable: false,
    values: ['male', 'female', 'diverse', 'unknown']
  },
  {
    key: '',
    name: 'street',
    labelEn: 'Street',
    labelDe: 'Straße',
    type: 'string',
    required: false,
    linkage: false,
    repeatable: false,
    minLength: 1,
    maxLength: 150
  },
  {
    key: '',
    name: 'housenumber',
    labelEn: 'House number',
    labelDe: 'Hausnummer',
    type: 'string',
    required: false,
    linkage: false,
    repeatable: false,
    minLength: 1,
    maxLength: 20
  },
  {
    key: '',
    name: 'city',
    labelEn: 'City',
    labelDe: 'Stadt',
    type: 'string',
    required: false,
    linkage: false,
    repeatable: false,
    minLength: 1,
    maxLength: 100
  },
  {
    key: '',
    name: 'zip',
    labelEn: 'ZIP code',
    labelDe: 'PLZ',
    type: 'string',
    required: false,
    linkage: false,
    repeatable: false,
    minLength: 1,
    maxLength: 20
  },
  {
    key: '',
    name: 'country',
    labelEn: 'Country',
    labelDe: 'Land',
    type: 'string',
    required: false,
    linkage: false,
    repeatable: false,
    minLength: 1,
    maxLength: 100
  }
]