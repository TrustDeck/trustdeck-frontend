import { Attribute } from '../stores/EntityTypeStore'

export const defaultAttributes: Attribute[] = [
  {
    key: '',
    name: 'firstname',
    type: 'string',
    required: true,
    linkage: false,
    repaetable: false,
    minLength: 1,
    maxLength: 100
  },
  {
    key: '',
    name: 'lastname',
    type: 'string',
    required: true,
    linkage: false,
    repaetable: false,
    minLength: 1,
    maxLength: 100
  },
  {
    key: '',
    name: 'birthdate',
    type: 'date',
    required: true,
    linkage: false,
    repaetable: false
  }
]
