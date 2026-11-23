/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base del API. Por defecto apunta al backend de desarrollo. */
  readonly VITE_API_BASE_URL?: string;
  /** `live` habla con el backend; `mock` intercepta con MSW. */
  readonly VITE_API_MODE?: 'live' | 'mock';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
