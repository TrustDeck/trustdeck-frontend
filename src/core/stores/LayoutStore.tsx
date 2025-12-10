import { create } from 'zustand'

interface BreadcrumbItem {
  label: string
  url: string
}

interface LayoutStore {
  isSidebarOpen: boolean
  toggleSidebar: () => void
  breadcrumbItems: BreadcrumbItem[]
  setBreadcrumbItems: (items: BreadcrumbItem[]) => void
  isTabActive: boolean
  setTabActive: (isActive: boolean) => void
  editMode: boolean
  setEditMode: (editMode: boolean) => void
}

const useLayoutStore = create<LayoutStore>((set) => ({
  isSidebarOpen: false,
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  breadcrumbItems: [],
  setBreadcrumbItems: (items) => set({ breadcrumbItems: items }),
  isTabActive: true,
  setTabActive: (isActive) => set({ isTabActive: isActive }),
  editMode: false,
  setEditMode: (editMode) => set({ editMode })
}))

export default useLayoutStore
