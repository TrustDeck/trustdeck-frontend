import type { Attribute } from '../../../core/stores/ProjectStore'

type MockEntityDefinition = {
  name: string
  version: string
  baseTypeDefinition?: string
  typeDefinition: {
    attributes: Attribute[]
  }
}

export const personFallbackEntity: MockEntityDefinition = {
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
      }
    ]
  }
}
