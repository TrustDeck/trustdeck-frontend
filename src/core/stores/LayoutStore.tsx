import { create } from 'zustand'

interface BreadcrumbItem {
  label: string
  url: string
}

interface LayoutStore {
  isSidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
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
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  breadcrumbItems: [],
  setBreadcrumbItems: (items) =>
    set((state) => {
      const sameLength = state.breadcrumbItems.length === items.length
      const sameItems =
        sameLength &&
        state.breadcrumbItems.every((item, index) =>
          item.label === items[index]?.label && item.url === items[index]?.url
        )
      return sameItems ? state : { breadcrumbItems: items }
    }),
  isTabActive: true,
  setTabActive: (isActive) => set({ isTabActive: isActive }),
  editMode: false,
  setEditMode: (editMode) => set({ editMode })
}))

export default useLayoutStore
