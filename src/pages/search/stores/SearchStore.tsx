import { create } from 'zustand'

type SearchState = {
  lastname: string
  firstname: string
  phone: string
  idType: string
  identifier: string
  street: string
  houseNumber: string
  city: string
  zip: string
  pseudonym: string
  group: string
  location: string
  date: string
  sampleNumber: string
  quick: string,
  setLastname: (lastname: string) => void
  setFirstname: (firstname: string) => void
  setPhone: (phone: string) => void
  setIdType: (idType: string) => void
  setIdentifier: (identifier: string) => void
  setStreet: (street: string) => void
  setHousenumber: (houseNumber: string) => void
  setCity: (city: string) => void
  setZip: (zip: string) => void
  setPseudonym: (pseudonym: string) => void
  setGroup: (group: string) => void
  setLocation: (location: string) => void
  setDate: (date: string) => void
  setSampleNumber: (sampleNumber: string) => void
  setQuick: (quick: string) => void
}

const useSearchStore = create<SearchState>((set) => ({
  lastname: '',
  firstname: '',
  phone: '',
  idType: '',
  identifier: '',
  street: '',
  houseNumber: '',
  city: '',
  zip: '',
  pseudonym: '',
  group: '',
  location: '',
  date: '',
  sampleNumber: '',
  quick: '',
  setLastname: (lastname) => set({ lastname }),
  setFirstname: (firstname) => set({ firstname }),
  setPhone: (phone) => set({ phone }),
  setIdType: (idType) => set({ idType}),
  setIdentifier: (identifier) => set({ identifier }),
  setStreet: (street) => set({ street }),
  setHousenumber: (houseNumber) => set({ houseNumber }),
  setCity: (city) => set({ city }),
  setZip: (zip) => set({ zip }),
  setPseudonym: (pseudonym) => set({ pseudonym }),
  setGroup: (group) => set({ group }),
  setLocation: (location) => set({ location }),
  setDate: (date) => set({ date }),
  setSampleNumber: (sampleNumber) => set({ sampleNumber }),
  setQuick: (quick) => set({ quick })
}))

export default useSearchStore
