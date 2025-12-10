export const mockProjectEntities = [
  {
    name: 'person',
    version: 'v0.1-alpha',
    typeDefinition: {
      typeName: 'person',
      version: 'v0.1-alpha',
      attributes: [
        { name: 'firstName', type: 'string', required: true, linkage: true, minLength: 1, maxLength: 100, value: 'John' },
        { name: 'lastName', type: 'string', required: true, linkage: true, minLength: 1, maxLength: 100, value: 'Doe' },
        { name: 'birthName', type: 'string', required: true, linkage: false, maxLength: 100, value: 'Doe' },
        { name: 'administrativeGender', type: 'enum', required: true, linkage: true, values: ['male', 'female', 'other', 'unknown'], value: 'male' },
        { name: 'dateOfBirth', type: 'date', required: true, linkage: true, value: '1990-01-01' },
        {
          name: 'address',
          repeatable: true,
          required: true,
          children: [
            { name: 'street', type: 'string', required: true, linkage: false, maxLength: 200, value: '123 Main St' },
            { name: 'postalCode', type: 'string', required: true, linkage: false, maxLength: 20, value: '10115' },
            { name: 'city', type: 'string', required: true, linkage: false, maxLength: 120, value: 'Berlin' },
            { name: 'country', type: 'string', required: true, linkage: false, minLength: 1, maxLength: 50, value: 'Germany' }
          ]
        }
      ]
    }
  },
  {
    name: 'biosample',
    version: 'v0.1-alpha',
    typeDefinition: {
      typeName: 'biosample',
      version: 'v0.1-alpha',
      attributes: [
        { name: 'location', type: 'string', required: true, linkage: false, maxLength: 200, value: 'Lab 1' },
        { name: 'sampleType', type: 'string', required: true, linkage: false, maxLength: 100, value: 'Blood' },
        { name: 'collectionDate', type: 'date', required: true, linkage: false, value: '2025-11-26' },
        { 
          name: 'preservationMethod', 
          type: 'enum', 
          required: true, 
          linkage: false, 
          values: ['Frozen', 'Refrigerated', 'RoomTemperature'], 
          value: 'Frozen' 
        }
      ]
    }
  }
]
