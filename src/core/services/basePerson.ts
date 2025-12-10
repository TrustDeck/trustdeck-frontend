export const basePerson = {
    "name": "basePersonNoId",
    "version": "v1.0-BASE",
    "typeDefinition": {
        "typeName": "base-person-no-id",
        "version": "v1.0",
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
            "name": "street",
            "type": "string",
            "required": false,
            "linkage": false,
            "maxLength": 200
        },
        {
            "name": "postalCode",
            "type": "string",
            "required": false,
            "linkage": false,
            "maxLength": 20
        },
        {
            "name": "city",
            "type": "string",
            "required": false,
            "linkage": false,
            "maxLength": 120
        },
        {
            "name": "country",
            "type": "string",
            "required": false,
            "linkage": false,
            "minLength": 1,
            "maxLength": 50
        }
        ]
    }
}