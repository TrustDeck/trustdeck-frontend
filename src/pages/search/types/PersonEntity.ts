import { Link } from "../../../core/types/Link"
import { ContactPerson } from "./ContactPerson"

export interface PersonEntity {
  id: string
  type: 'person'
  firstname: string
  lastname: string
  birthdate: string
  gender: string
  email: string
  phone: string
  secondPhone: string
  street: string
  houseNumber: string
  zip: string
  city: string
  country: string
  contactPerson: ContactPerson
  links: Link[]
  identifiers: {
    id: string
    MOI: string
  }
}