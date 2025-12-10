import { create } from 'zustand'
import { PersonType } from '../../../core/types/PersonEntity'

type ContactPerson = {
  firstname: string
  lastname: string
  email: string
  phone: string
  relationship: string
}

type EntityData = {
  lastname: string
  firstname: string
  birthdate: string
  gender: string
  email: string
  phone: string
  street: string
  houseNumber: string
  city: string
  country: string
  zip: string
  identifiers: {
    id: string
    MOI: string
  }
  contactPerson: ContactPerson
}

type EntityState = EntityData & {
  setLastname: (lastname: string) => void
  setFirstname: (firstname: string) => void
  setBirthdate: (birthdate: string) => void
  setGender: (gender: string) => void
  setEmail: (email: string) => void
  setPhone: (phone: string) => void
  setStreet: (street: string) => void
  setHouseNumber: (houseNumber: string) => void
  setCity: (city: string) => void
  setCountry: (country: string) => void
  setZip: (zip: string) => void
  setId: (id: string) => void
  setMOI: (MOI: string) => void

  setContactFirstname: (firstname: string) => void
  setContactLastname: (lastname: string) => void
  setContactEmail: (email: string) => void
  setContactPhone: (phone: string) => void
  setRelationship: (relationship: string) => void

  loadEntity: (data: PersonType) => void
  reset: () => void
}

const defaultState: EntityData = {
  lastname: '',
  firstname: '',
  birthdate: '',
  gender: '',
  email: '',
  phone: '',
  street: '',
  houseNumber: '',
  city: '',
  country: '',
  zip: '',
  identifiers: {
    id: '',
    MOI: ''
  },
  contactPerson: {
    firstname: '',
    lastname: '',
    email: '',
    phone: '',
    relationship: ''
  }
}

const usePersonStore = create<EntityState>((set) => ({
  ...defaultState,

  // setters
  setLastname: (lastname) => set({ lastname }),
  setFirstname: (firstname) => set({ firstname }),
  setBirthdate: (birthdate) => set({ birthdate }),
  setGender: (gender) => set({ gender }),
  setEmail: (email) => set({ email }),
  setPhone: (phone) => set({ phone }),
  setStreet: (street) => set({ street }),
  setHouseNumber: (houseNumber) => set({ houseNumber }),
  setCity: (city) => set({ city }),
  setCountry: (country) => set({ country }),
  setZip: (zip) => set({ zip }),
  setId: (id) => set((state) => ({ identifiers: { ...state.identifiers, id } })),
  setMOI: (MOI) => set((state) => ({ identifiers: { ...state.identifiers, MOI } })),
  setContactFirstname: (firstname) =>
    set((state) => ({ contactPerson: { ...state.contactPerson, firstname } })),
  setContactLastname: (lastname) =>
    set((state) => ({ contactPerson: { ...state.contactPerson, lastname } })),
  setContactEmail: (email) =>
    set((state) => ({ contactPerson: { ...state.contactPerson, email } })),
  setContactPhone: (phone) =>
    set((state) => ({ contactPerson: { ...state.contactPerson, phone } })),
  setRelationship: (relationship) =>
    set((state) => ({ contactPerson: { ...state.contactPerson, relationship } })),

  // main function: map API person object
  loadEntity: (data: PersonType) => {
    const firstEmail = data.emails?.[0]?.value ?? ''
    const firstPhone = data.phones?.[0]?.value ?? ''
    const address = data.addresses?.[0] ?? {}
    const id = data.identifiers?.find((i) => i.identifierType === 'SAP-ID')?.identifier ?? ''
    const MOI = data.identifiers?.find((i) => i.identifierType === 'masterObjectIdentifier')?.identifier ?? ''
    const firstContact = data.contactPersons?.[0]

    set({
      lastname: data.lastname ?? '',
      firstname: data.firstname ?? '',
      birthdate: data.birthdate?.split('T')[0] ?? '',
      gender: data.gender ?? '',
      email: firstEmail,
      phone: firstPhone,
      street: address.street ?? '',
      houseNumber: address.houseNumber ?? '',
      city: address.city ?? '',
      country: address.country ?? '',
      zip: address.zip ?? '',
      identifiers: {
        id,
        MOI
      },
      contactPerson: {
        firstname: firstContact?.firstname ?? '',
        lastname: firstContact?.lastname ?? '',
        email: firstContact?.emails?.[0]?.value ?? '',
        phone: firstContact?.phones?.[0]?.value ?? '',
        relationship: firstContact?.relationShip ?? ''
      }
    })
  },

  reset: () => set({ ...defaultState })
}))

export default usePersonStore
