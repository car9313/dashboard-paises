/**
 * Configuración de entorno, resuelta una sola vez al cargar el módulo.
 *
 * @remarks
 * - El modo `mock` existe porque el login del backend exige credenciales que no
 *   están en el entorno de desarrollo (ver `docs/08-riesgos-y-deuda.md` R5).
 * - El puerto del dev server (5173) está fijado en `vite.config.ts` porque la
 *   política CORS del backend solo lo admite a él.
 */

const DEFAULT_API_BASE_URL = 'http://172.22.10.3:1235';

function readMode(): 'live' | 'mock' {
  const configured = import.meta.env.VITE_API_MODE;

  if (configured === 'mock' || configured === 'live') {
    return configured;
  }

  // En desarrollo el valor por defecto es `mock`: el login exige credenciales
  // que no están en el entorno. Un build de producción siempre es `live`.
  return import.meta.env.DEV ? 'mock' : 'live';
}

export const env = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, ''),
  apiMode: readMode(),
  isDev: import.meta.env.DEV,
  isTest: import.meta.env.MODE === 'test'
} as const;

/** `true` cuando la app debe servirse con datos simulados (MSW). */
export const isMockMode = env.apiMode === 'mock';
