import { create } from 'zustand'

type EntityData = {
  id: number
  lastName: string
  firstName: string
  dateOfBirth: string
  administrativeGender: string
  email: string
  phoneNumber: string
  street: string
  houseNumber: string
  city: string
  country: string
  postalCode: string
  trustdeckID: string,
  contactFirstName: string,
  contactLastName: string,
  contactPhone: string,
  contactEmail: string,
  contactRelationship: string
}

type EntityState = EntityData & {
  setId: (id: number) => void
  setLastName: (lastName: string) => void
  setFirstName: (firstName: string) => void
  setDateOfBirth: (dateOfBirth: string) => void
  setAdministrativeGender: (administrativeGender: string) => void
  setEmail: (email: string) => void
  setPhoneNumber: (phoneNumber: string) => void
  setStreet: (street: string) => void
  setHouseNumber: (houseNumber: string) => void
  setCity: (city: string) => void
  setCountry: (country: string) => void
  setPostalCode: (postalCode: string) => void
  setTrustdeckID: (trustdeckID: string) => void
  setContactFirstName: (firstName: string) => void
  setContactLastName: (lastName: string) => void
  setContactEmail: (email: string) => void
  setContactPhone: (phone: string) => void
  setContactRelationship: (relationship: string) => void

  loadEntity: (data: any) => void
  reset: () => void
}

const defaultState: EntityData = {
  id: 0,
  lastName: '',
  firstName: '',
  dateOfBirth: '',
  administrativeGender: '',
  email: '',
  phoneNumber: '',
  street: '',
  houseNumber: '',
  city: '',
  country: '',
  postalCode: '',
  trustdeckID: '',
  contactFirstName: '',
  contactLastName: '',
  contactPhone: '',
  contactEmail: '',
  contactRelationship: ''
}

const usePersonStore = create<EntityState>((set) => ({
  ...defaultState,

  // setters
  setId: (id) => set({ id }),
  setLastName: (lastName) => set({ lastName }),
  setFirstName: (firstName) => set({ firstName }),
  setDateOfBirth: (dateOfBirth) => set({ dateOfBirth }),
  setAdministrativeGender: (administrativeGender) => set({ administrativeGender }),
  setEmail: (email) => set({ email }),
  setPhoneNumber: (phoneNumber) => set({ phoneNumber }),
  setStreet: (street) => set({ street }),
  setHouseNumber: (houseNumber) => set({ houseNumber }),
  setCity: (city) => set({ city }),
  setCountry: (country) => set({ country }),
  setPostalCode: (postalCode) => set({ postalCode }),
  setTrustdeckID: (trustdeckID) => set({ trustdeckID }),
  setContactFirstName: (contactFirstName) => ({ contactFirstName }),
  setContactLastName: (contactLastName) => ({ contactLastName }),
  setContactEmail: (contactEmail) => ({ contactEmail }),
  setContactPhone: (contactPhone) => ({ contactPhone }),
  setContactRelationship: (contactRelationship) => ({ contactRelationship }),

  // main function: map API person object
  loadEntity: (result: any) => {
    const id = result.data.identifiers?.find((i: any) => i.identifierType === 'SAP-ID')?.identifier ?? ''
    const MOI = result.data.identifiers?.find((i: any) => i.identifierType === 'masterObjectIdentifier')?.identifier ?? ''

    set({
      id: result.data.id ?? '',
      lastName: result.data.lastName ?? '',
      firstName: result.data.firstName ?? '',
      dateOfBirth: result.data.dateOfBirth?.split('T')[0] ?? '',
      administrativeGender: result.data.administrativeGender ?? '',
      email: result.data.email,
      phoneNumber: result.data.phoneNumber,
      street: result.data.street ?? '',
      houseNumber: result.data.houseNumber ?? '',
      city: result.data.city ?? '',
      country: result.data.country ?? '',
      postalCode: result.data.postalCode ?? '',
      trustdeckID: result.trustdeckID ?? '',
      contactFirstName: result.data.contactFirstName ?? '',
      contactLastName: result.data.contactLastName ?? '',
      contactPhone: result.data.contactPhone ?? '',
      contactEmail: result.data.contactEmail ?? '',
      contactRelationship: result.data.contactRelationship ?? ''
    })
  },

  reset: () => set({ ...defaultState })
}))

export default usePersonStore
