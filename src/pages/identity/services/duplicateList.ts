const duplicateList = [
  {
    id: '1',
    type: 'person',
    firstname: 'Anna',
    lastname: 'Müller',
    birthdate: '1985-04-12T00:00:00.000Z',
    gender: 'Female',
    phone: '+49 170 1234567',
    secondPhone: '+49 30 9876543',
    email: 'anna.mueller@example.com',
    street: 'Hauptstraße',
    houseNumber: '15A',
    zip: '10115',
    city: 'Berlin',
    contactPerson: {
      firstname: 'Thomas',
      lastname: 'Schneider',
      email: 'thomas.schneider@example.com',
      phone: '+49 160 7654321',
    },
    links: {
      group: 'Group-1',
      pseudonym: 'BLV-0383273',
      children: [
        { group: 'Group-MRT', pseudonym: 'GRP-MRT-3843732', children: [] },
        { group: 'Group-Labor', pseudonym: 'GRP-Labor-8674536', children: [] },
        { group: 'Group-EEG', pseudonym: 'GRP-EEG-1827365', children: [] },
        { group: 'Group-Screening', pseudonym: 'GRP-S-3746586', children: [] }
      ]
    },
    identifiers: {
      id: '3647659283',
      MOI: '382648506795842'
    },
    matches: ['firstname', 'lastname', 'city']
  },
  {
    id: '2',
    type: 'person',
    firstname: 'Max',
    lastname: 'Schmidt',
    birthdate: '1990-07-22T00:00:00.000Z',
    gender: 'Male',
    phone: '+49 172 7654321',
    secondPhone: '+49 40 8765432',
    email: 'max.schmidt@example.com',
    street: 'Bahnhofstraße',
    houseNumber: '22',
    zip: '20095',
    city: 'Hamburg',
    contactPerson: {
      firstname: 'Katrin',
      lastname: 'Weber',
      email: 'katrin.weber@example.com',
      phone: '+49 151 6549873',
    },
    links: {
      group: 'Group',
      pseudonym: 'BLV-9482736',
      children: [
        { group: 'Group-MRT', pseudonym: 'GRP-MRT-5928371', children: [] },
        { group: 'Group-Labor', pseudonym: 'GRP-Labor-1047583', children: [] },
        { group: 'Group-EEG', pseudonym: 'GRP-EEG-7263491', children: [] },
        { group: 'Group-Screening', pseudonym: 'GRP-S-2938475', children: [] }
      ]
    },
    identifiers: {
      id: '8473620913',
      MOI: '495837265091823'
    },
    matches: ['firstname', 'lastname', 'city']
  },
  {
    id: '3',
    type: 'person',
    firstname: 'Sophia',
    lastname: 'Fischer',
    birthdate: '1978-11-30T00:00:00.000Z',
    gender: 'Female',
    phone: '+49 176 2345678',
    secondPhone: '+49 89 3456789',
    email: 'sophia.fischer@example.com',
    street: 'Lindenstraße',
    houseNumber: '8',
    zip: '80331',
    city: 'München',
    contactPerson: {
      firstname: 'Michael',
      lastname: 'Krause',
      email: 'michael.krause@example.com',
      phone: '+49 152 7894561',
    },
    links: {
      group: 'Group',
      pseudonym: 'BLV-5672948',
      children: [
        { group: 'Group-MRT', pseudonym: 'GRP-MRT-8102746', children: [] },
        { group: 'Group-Labor', pseudonym: 'GRP-Labor-6573910', children: [] },
        { group: 'Group-EEG', pseudonym: 'GRP-EEG-3726150', children: [] },
        { group: 'Group-Screening', pseudonym: 'GRP-S-9481027', children: [] }
      ]
    },
    identifiers: {
      id: '7263910482',
      MOI: '394857261038472'
    },
    matches: ['firstname', 'lastname', 'city']
  }
];

export default duplicateList