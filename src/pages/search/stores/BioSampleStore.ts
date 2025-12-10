import { create } from 'zustand'

export type BioSampleData = {
  location: string
  date: string | Date
  sampleNumber: string
  contents: string
  moi: string
}

type BioSampleState = BioSampleData & {
  setLocation: (location: string) => void
  setDate: (date: string) => void
  setSampleNumber: (sampleNumber: string) => void
  setContents: (contents: string) => void
  setMoi: (moi: string) => void

  loadEntity: (data: Partial<BioSampleData> & { id?: string }) => void
  reset: () => void
}

const defaultState: BioSampleData = {
  location: '',
  date: '',
  sampleNumber: '',
  contents: '',
  moi: ''
}

const useBioSampleStore = create<BioSampleState>((set) => ({
  ...defaultState,

  setLocation: (location) => set({ location }),
  setDate: (date) => set({ date }),
  setSampleNumber: (sampleNumber) => set({ sampleNumber }),
  setContents: (contents) => set({ contents }),
  setMoi: (moi) => set({ moi }),

  loadEntity: (data) =>
    set(() => ({
      location: data.location ?? '',
      date: data.date ?? '',
      sampleNumber: data.sampleNumber ?? data.id ?? '',
      contents: data.contents ?? '',
      moi: data.moi ?? ''
    })),

  reset: () => set({ ...defaultState })
}))

export default useBioSampleStore
