/// <reference types="vite/client" />

export {}

declare global {
  interface Window {
    __ENV__?: {
      API_BASE_URL?: string
      AUTHORITY_URL?: string
      AUTHORITY_CLIENT?: string
      AUTHORITY_REDIRECT_URI?: string
      AUTHORITY_SILENT_URI?: string
      [key: string]: string | undefined
    }
  }

  interface ImportMetaEnv {
    readonly VITE_API_BASE_URL?: string
    readonly VITE_AUTHORITY_URL?: string
    readonly VITE_AUTHORITY_CLIENT?: string
    readonly VITE_AUTHORITY_REDIRECT_URI?: string
    readonly VITE_AUTHORITY_SILENT_URI?: string
  }
}
