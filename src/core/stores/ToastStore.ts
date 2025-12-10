import { create } from 'zustand'
import type { Toast } from 'primereact/toast'
import type { ToastMessage } from 'primereact/toast'

type ToastStore = {
  toast: Toast | null
  // wird als ref callback verwendet
  setToast: (toast: Toast | null) => void
  show: (message: ToastMessage) => void
}

const useToastStore = create<ToastStore>((set, get) => ({
  toast: null,
  setToast: (toast) => set({ toast }),
  show: (message) => {
    get().toast?.show(message)
  }
}))


export default useToastStore;