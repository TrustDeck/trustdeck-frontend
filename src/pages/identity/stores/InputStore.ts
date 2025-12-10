import { create } from 'zustand'

type InputState = {
  firstName: string
  lastName: string
  dateOfBirth: Date | null
  administrativeGender: string
  phoneNumber: string
  secondPhoneNumber: string
  email: string
  secondEmail: string
  street: string
  houseNumber: string
  city: string
  country: string
  postalCode: string
  contactFirstName: string
  contactLastName: string
  contactPhone: string
  contactEmail: string
  contactRelationship: string
  location: string
  date: Date | null
  contents: string
  sampleNumber: string
  patientID: string
  setFirstName: (firstName: string) => void
  setLastName: (lastName: string) => void
  setDateOfBirth: (dateOfBirth: Date | null) => void
  setAdministrativeGender: (administrativeGender: string) => void
  setEmail: (email: string) => void
  setPhoneNumber: (phoneNumber: string) => void
  setSecondPhoneNumber: (secondPhoneNumber: string) => void
  setSecondEmail: (secondEmail: string) => void
  setStreet: (street: string) => void
  setHouseNumber: (houseNumber: string) => void
  setCity: (city: string) => void
  setCountry: (country: string) => void
  setPostalCode: (postalCode: string) => void
  setContactFirstName: (contactFirstName: string) => void
  setContactLastName: (contactLastName: string) => void
  setContactPhone: (contactPhone: string) => void
  setContactEmail: (contactEmail: string) => void
  setContactRelationship: (contactRelationship: string) => void
  setLocation: (location: string) => void
  setDate: (date: Date | null) => void
  setContents: (contents: string) => void
  setSampleNumber: (sampleNumber: string) => void
  setPatientID: (patientID: string) => void
}

const useInputStore = create<InputState>((set) => ({
  firstName: '',
  lastName: '',
  dateOfBirth: null,
  administrativeGender: '',
  phoneNumber: '',
  secondPhoneNumber: '',
  email: '',
  secondEmail: '',
  street: '',
  houseNumber: '',
  city: '',
  country: '',
  postalCode: '',
  contactFirstName: '',
  contactLastName: '',
  contactPhone: '',
  contactEmail: '',
  contactRelationship: '',
  location: '',
  date: null,
  contents: '',
  sampleNumber: '',
  patientID: '',
  setFirstName: (firstName) => set({ firstName }),
  setLastName: (lastName) => set({ lastName }),
  setDateOfBirth: (dateOfBirth) => set({ dateOfBirth }),
  setAdministrativeGender: (administrativeGender) => set({ administrativeGender }),
  setEmail: (email) => set({ email }),
  setSecondEmail: (secondEmail) => set({ secondEmail }),
  setPhoneNumber: (phoneNumber) => set({ phoneNumber }),
  setSecondPhoneNumber: (secondPhoneNumber) => set( { secondPhoneNumber }),
  setStreet: (street) => set({ street }),
  setHouseNumber: (houseNumber) => set({ houseNumber }),
  setCity: (city) => set({ city }),
  setCountry: (country) => set({ country }),
  setPostalCode: (postalCode) => set({ postalCode }),
  setContactFirstName: (contactFirstName) => set({ contactFirstName }),
  setContactLastName: (contactLastName) => set({ contactLastName }),
  setContactPhone: (contactPhone) => set({ contactPhone }),
  setContactEmail: (contactEmail) => set({ contactEmail }),
  setContactRelationship: (contactRelationship) => set({ contactRelationship }),
  setLocation: (location) => set({ location }),
  setDate: (date) => set({ date }),
  setContents: (contents) => set({ contents }),
  setSampleNumber: (sampleNumber) => set({ sampleNumber }),
  setPatientID: (patientID) => set({ patientID })
}))

export default useInputStore
