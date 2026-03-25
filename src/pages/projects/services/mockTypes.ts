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
        { name: 'administrativeGender', type: 'enum', required: true, linkage: true, enum: ['male', 'female', 'other', 'unknown'], value: 'male' },
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
    name: "biosample",
    version: "v0.2-alpha",
    typeDefinition: {
      typeName: "biosample",
      version: "v0.2-alpha",
      attributes: [
        {
          group: true,
          name: "sampleInformation",
          attributes: [
            {
              layout: "row",
              name: "Row 1 title",
              attributes: [
                {
                  name: "location",
                  type: "string",
                  required: true,
                  linkage: false,
                  minLength: 1,
                  maxLength: 200,
                },
                {
                  name: "sampleType",
                  type: "string",
                  required: true,
                  linkage: false,
                  minLength: 1,
                  maxLength: 100
                }
              ]
            },
            {
              layout: "row",
              name: "Row 2 title",
              attributes: [
                {
                  name: "collectionDate",
                  type: "date",
                  required: true,
                  linkage: false
                }
              ]
            }
          ]
        },
        {
          name: "storage",
          attributes: [
            {
              name: "preservationMethod",
              type: "enum",
              required: true,
              linkage: false,
              enum: [
                { label: "Frozen (-80°C)", value: "FROZEN" },
                { label: "Refrigerated (4°C)", value: "REFRIGERATED" },
                { label: "Room Temperature", value: "ROOM_TEMP" },
                { label: "Formalin Fixed", value: "FORMALIN" }
              ]
            }
          ]
        }
      ]
    }
  }
]
