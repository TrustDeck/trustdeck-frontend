import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { shared } from 'use-broadcast-ts'
import useUserStore from './UserStore'

interface AuthState {
  data: Record<string, string>
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  shared(
    persist(
      (set) => ({
        data: JSON.parse(localStorage.getItem('auth-storage') || '{}'),
        setItem: (key, value) =>
          set((state) => {
            const newData = { ...state.data, [key]: value }
            localStorage.setItem('auth-storage', JSON.stringify(newData))
            return { data: newData }
          }),
        removeItem: (key) =>
          set((state) => {
            const newData = { ...state.data }
            delete newData[key]
            localStorage.setItem('auth-storage', JSON.stringify(newData))
            return { data: newData }
          }),
        clear: () =>
          set(() => {
            localStorage.removeItem('auth-storage')
            return { data: {} }
          })
      }),
      {
        name: 'auth-storage',
        storage: createJSONStorage(() => localStorage)
      }
    ),
    { name: 'auth-broadcast' }
  )
)

export class AuthWebStorage implements Storage {
  private _data: Record<string, string> = useAuthStore.getState().data

  public clear(): void {
    useAuthStore.getState().clear()
    useUserStore.getState().clear()
    this._data = {}
    //authChannel.postMessage({ type: 'LOGOUT' })
  }

  public getItem(key: string): string | null {
    try {
      const token = this._data[key]
      const parsedToken = JSON.parse(token)
      useUserStore.getState().setFromAccessToken(parsedToken?.access_token)
      return token || null
    } catch (error) {
      console.log(error)
      return null
    }
  }

  public setItem(key: string, value: string): void {
    try {
      useAuthStore.getState().setItem(key, value)
      this._data[key] = value
      const token = JSON.parse(value)
      useUserStore.getState().setFromAccessToken(token?.access_token)
    } catch (error) {
      console.log(error)
      useUserStore.getState().clear()
    }
  }

  public removeItem(key: string): void {
    useAuthStore.getState().removeItem(key)
    delete this._data[key]
    useUserStore.getState().clear()
  }

  public get length(): number {
    return Object.keys(this._data).length
  }

  public key(index: number): string | null {
    return Object.keys(this._data)[index] || null
  }
}
