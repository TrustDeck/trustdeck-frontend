export const person = {
    "name": "personNoId",
    "version": "v0.2-alpha",
    "baseTypeName": "basePersonNoId",
    "typeDefinition": {
        "typeName": "personNoId",
        "version": "v0.1-alpha",
        "attributes": [
        {
            "name": "firstName",
            "type": "string",
            "required": true,
            "linkage": true,
            "minLength": 1,
            "maxLength": 100
        },
        {
            "name": "lastName",
            "type": "string",
            "required": true,
            "linkage": true,
            "minLength": 1,
            "maxLength": 100
        },
        {
            "name": "birthName",
            "type": "string",
            "required": false,
            "linkage": false,
            "maxLength": 100
        },
        {
            "name": "administrativeGender",
            "type": "string",
            "required": true,
            "linkage": true,
            "enum": ["male", "female", "other", "unknown"]
        },
        {
            "name": "dateOfBirth",
            "type": "date",
            "required": true,
            "linkage": true
        },
        {
            "name": "phoneNumber",
            "type": "string",
            "required": true,
            "linkage": true
        },
        {
            "name": "email",
            "type": "string",
            "required": false,
            "linkage": true
        },
        {
            "name": "street",
            "type": "string",
            "required": true,
            "linkage": false,
            "maxLength": 200
        },
        {
            "name": "houseNumber",
            "type": "string",
            "required": true,
            "linkage": false,
            "maxLength": 200
        },
        {
            "name": "postalCode",
            "type": "string",
            "required": true,
            "linkage": false,
            "maxLength": 20
        },
        {
            "name": "city",
            "type": "string",
            "required": true,
            "linkage": false,
            "maxLength": 120
        },
        {
            "name": "country",
            "type": "string",
            "required": true,
            "linkage": false,
            "minLength": 1,
            "maxLength": 50
        },
        {
            "name": "description",
            "type": "string",
            "required": false,
            "linkage": false
        },
        {
            "name": "contactFirstName",
            "type": "string",
            "required": false,
            "linkage": false
        },
        {
            "name": "contactLastName",
            "type": "string",
            "required": false,
            "linkage": false
        },
        {
            "name": "contactPhone",
            "type": "string",
            "required": false,
            "linkage": false
        },
        {
            "name": "contactEmail",
            "type": "string",
            "required": false,
            "linkage": false
        },
        {
            "name": "contactRelationship",
            "type": "string",
            "required": false,
            "linkage": false,
            "enum": ["partner", "sibling", "friend", "other"]
        }
        ]
    }
}