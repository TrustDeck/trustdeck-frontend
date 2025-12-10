export interface Identifier {
  identifier: string
  identifierType: string
}

export interface Phone {
  type: string
  value: string
}

export interface Email {
  type: string
  value: string
}

export interface Address {
  type: string
  street: string
  houseNumber: string
  zip: string
  city: string
  country: string
}

export interface ContactPerson {
  identifiers?: Identifier[] 
  firstname?: string
  lastname?: string
  birthdate?: string
  gender?: string
  phones?: Phone[]
  emails?: Email[]
  addresses?: Address[]
  contactPersons?: ContactPerson[] // recursive
  relationShip?: string
}

export type AdministrativeGender = "male" | "female" | "other" | "unknown"

export interface PersonType {
  id?: number;

  firstName: string;
  lastName: string;

  administrativeGender: "male" | "female" | "other" | "unknown";

  dateOfBirth: string; // ISO date
  phoneNumber: string;
  email?: string;

  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;

  // Optional contact person info
  contactFirstName?: string;
  contactLastName?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactRelationship?: "partner" | "sibling" | "friend" | "other";

  createdOn?: string;
  updatedOn?: string;
}
