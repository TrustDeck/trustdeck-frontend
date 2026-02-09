import { create } from 'zustand'

type ProjectInputState = {
  projectName: string
  projectAbbreviation: string
  startDate: Date | null
  endDate: Date | null
  setProjectName: (projectName: string) => void
  setProjectAbbreviation: (projectAbbreviation: string) => void
  setStartDate: (startDate: Date | null) => void
  setEndDate: (endDate: Date | null) => void
  clearProjectInputs: () => void
}

const useProjectInputStore = create<ProjectInputState>((set) => ({
  projectName: '',
  projectAbbreviation: '',
  startDate: null,
  endDate: null,
  setProjectName: (projectName) => set({ projectName }),
  setProjectAbbreviation: (projectAbbreviation) => set({ projectAbbreviation }),
  setStartDate: (startDate) => set({ startDate }),
  setEndDate: (endDate) => set({ endDate }),
  clearProjectInputs: () =>
    set({
      projectName: '',
      projectAbbreviation: '',
      startDate: null,
      endDate: null
    })
}))

export default useProjectInputStore
