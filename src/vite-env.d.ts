/// <reference types="vite/client" />

export {};

declare global {
  interface Window {
    __ENV__?: {
      AUTHORITY_URL?: string;
      AUTHORITY_CLIENT?: string;
      AUTHORITY_REDIRECT_URI?: string;
      AUTHORITY_SILENT_URI?: string;
      API_BASE_URL?: string;
      [key: string]: string | undefined;
    };
  }

  interface ImportMetaEnv {
    readonly API_BASE_URL: string;
    readonly AUTHORITY_URL?: string; // build-time Fallback
    readonly AUTHORITY_CLIENT?: string; // build-time Fallback
    readonly AUTHORITY_REDIRECT_URI?: string; // build-time Fallback
    readonly AUTHORITY_SILENT_URI?: string; // build-time Fallback
  }
}