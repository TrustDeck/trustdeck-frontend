import { Attribute } from '../stores/EntityTypeStore'

export const defaultAttributes: Attribute[] = [
  {
    key: '',
    name: 'firstname',
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
    type: 'date',
    required: true,
    linkage: false,
    repeatable: false
  },
  {
    key: '',
    name: 'gender',
    type: 'enum',
    required: false,
    linkage: false,
    repeatable: false,
    values: ['male', 'female', 'diverse', 'unknown']
  },
  {
    key: '',
    name: 'street',
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
    type: 'string',
    required: false,
    linkage: false,
    repeatable: false,
    minLength: 1,
    maxLength: 100
  }
]