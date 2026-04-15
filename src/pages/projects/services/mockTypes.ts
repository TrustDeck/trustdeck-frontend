import type { Attribute } from '../../../core/stores/ProjectStore'

type MockEntityDefinition = {
  name: string
  version: string
  baseTypeDefinition?: string
  typeDefinition: {
    attributes: Attribute[]
  }
}

export const mockProjectEntities: MockEntityDefinition[] = [
  {
    name: 'person',
    version: 'v1.0',
    baseTypeDefinition: 'basePerson',
    typeDefinition: {
      attributes: [
        {
          key: 'b7cdfd54-d599-4600-af15-23a1912089dc',
          group: true,
          layout: 'col',
          labelEn: 'Personal details',
          labelDe: 'Stammdaten',
          attributes: [
            {
              key: 'ff8ded6f-80df-42ce-9263-3d644a5ac1c6',
              layout: 'row',
              attributes: [
                {
                  key: '626fd1a1-be56-4272-9517-fa513ad4c497',
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
                  key: '357571c3-72fe-4738-86d2-f8222d3c2aad',
                  name: 'lastname',
                  labelEn: 'Last name',
                  labelDe: 'Nachname',
                  type: 'string',
                  required: true,
                  linkage: false,
                  repeatable: false,
                  minLength: 1,
                  maxLength: 100
                }
              ]
            },
            {
              key: '49e7e143-15f2-4bcc-97db-da656f952883',
              layout: 'row',
              attributes: [
                {
                  key: 'c1139b65-a8e6-42f5-94fb-a10ee1fd79e4',
                  name: 'birthdate',
                  labelEn: 'Date of birth',
                  labelDe: 'Geburtsdatum',
                  type: 'date',
                  required: true,
                  linkage: false,
                  repeatable: false
                },
                {
                  key: 'fe59bc85-ab3d-4e8f-88c7-7149265f5326',
                  name: 'gender',
                  labelEn: 'Gender',
                  labelDe: 'Geschlecht',
                  type: 'enum',
                  required: false,
                  linkage: false,
                  repeatable: false,
                  values: ['male', 'female', 'diverse', 'unknown']
                }
              ]
            }
          ]
        },
        {
          key: 'b7cdfd54-d599-4600-2324-23a1912089dc',
          group: true,
          layout: 'col',
          labelEn: 'Address',
          labelDe: 'Adresse',
          attributes: [
            {
              key: 'ff8ded6f-80df-42ce-12345-3d644a5ac1c6',
              layout: 'row',
              attributes: [
                {
                  key: '626fd1a1-be56-4272-6543-fa513ad4c497',
                  name: 'street',
                  labelEn: 'Street',
                  labelDe: 'Straße',
                  type: 'string',
                  required: true,
                  linkage: false,
                  repeatable: false,
                  minLength: 1,
                  maxLength: 100
                },
                {
                  key: '357571c3-72fe-4738-8765-f8222d3c2aad',
                  name: 'housenumber',
                  labelEn: 'House number',
                  labelDe: 'Hausnummer',
                  type: 'string',
                  required: true,
                  linkage: false,
                  repeatable: false,
                  minLength: 1,
                  maxLength: 100
                }
              ]
            },
            {
              key: '49e7e143-15f2-4bcc-5678-da656f952883',
              layout: 'row',
              attributes: [
                {
                  key: 'c1139b65-a8e6-42f5-9876-a10ee1fd79e4',
                  name: 'postalcode',
                  labelEn: 'Postal code',
                  labelDe: 'PLZ',
                  type: 'date',
                  required: true,
                  linkage: false,
                  repeatable: false
                },
                {
                  key: 'fe59bc85-ab3d-4e8f-6789-7149265f5326',
                  name: 'city',
                  labelEn: 'City',
                  labelDe: 'Stadt',
                  type: 'string',
                  required: false,
                  linkage: false,
                  repeatable: false,
                  values: ['male', 'female', 'diverse', 'unknown']
                }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    name: 'biosample',
    version: 'v1.0',
    baseTypeDefinition: 'baseBioSample',
    typeDefinition: {
      attributes: [
        {
          key: '442eb8b1-b4ce-407e-aa23-ebe57389d324',
          group: true,
          layout: 'col',
          labelEn: 'Data',
          labelDe: 'Daten',
          attributes: [
            {
              key: 'ce9222bf-1ba4-48be-aedd-c2509e3346f1',
              layout: 'row',
              attributes: [
                {
                  key: 'e49772d4-ac19-4df2-a9d4-71344e4be18c',
                  name: 'id',
                  labelEn: 'ID',
                  labelDe: 'ID',
                  type: 'string',
                  required: false,
                  linkage: false,
                  minLength: 1,
                  maxLength: 150
                },
                {
                  key: '1781f721-1b19-4f3c-912c-7d887cf613f9',
                  name: 'Contents',
                  labelEn: 'Contents',
                  labelDe: 'Inhalt',
                  type: 'string',
                  required: false,
                  linkage: false,
                  minLength: 1,
                  maxLength: 20
                }
              ]
            },
            {
              key: 'ab4c4985-fbd6-4d56-9539-ec32c76111ff',
              name: 'location',
              labelEn: 'Location',
              labelDe: 'Standort',
              type: 'string',
              required: false,
              linkage: false,
              repeatable: false,
              minLength: 1,
              maxLength: 100
            }
          ]
        }
      ]
    }
  },
  {
    "name": "dog",
    "version": "v1.0",
    "baseTypeDefinition": "baseAnimal",
    "typeDefinition": {
      "attributes": [
        {
          "key": "a1f3c9d2-6b4e-4c3a-9f7a-1d2e5b6c7d8e",
          "group": true,
          "layout": "col",
          "labelEn": "Dog Data",
          "labelDe": "Hundedaten",
          "attributes": [
            {
              "key": "b2e4d6f8-1234-4abc-9def-56789abcdef0",
              "layout": "row",
              "attributes": [
                {
                  "key": "c3a1b2c3-d4e5-6789-abcd-ef0123456789",
                  "name": "name",
                  "labelEn": "Name",
                  "labelDe": "Name",
                  "type": "string",
                  "required": true,
                  "minLength": 1,
                  "maxLength": 100
                },
                {
                  "key": "d4b2c3d4-e5f6-789a-bcde-f0123456789a",
                  "name": "breed",
                  "labelEn": "Breed",
                  "labelDe": "Rasse",
                  "type": "string",
                  "required": true,
                  "minLength": 1,
                  "maxLength": 100
                }
              ]
            },
            {
              "key": "e5c3d4e5-f6a7-89ab-cdef-0123456789ab",
              "layout": "row",
              "attributes": [
                {
                  "key": "f6d4e5f6-a7b8-9abc-def0-123456789abc",
                  "name": "color",
                  "labelEn": "Color",
                  "labelDe": "Farbe",
                  "type": "string",
                  "required": false,
                  "minLength": 1,
                  "maxLength": 50
                },
                {
                  "key": "07e5f607-b8c9-abcd-ef01-23456789abcd",
                  "name": "owner",
                  "labelEn": "Owner",
                  "labelDe": "Besitzer",
                  "type": "string",
                  "required": false,
                  "minLength": 1,
                  "maxLength": 100
                }
              ]
            },
            {
              "key": "18f60718-c9da-bcde-f012-3456789abcde",
              "name": "gender",
              "labelEn": "Gender",
              "labelDe": "Geschlecht",
              "type": "enum",
              "required": true,
              "values": ["male", "female"]
            }
          ]
        }
      ]
    }
  }
]
