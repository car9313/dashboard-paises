import { QueryClient } from '@tanstack/react-query';

/**
 * Política de caché del proyecto (ADR-004).
 *
 * Los valores por defecto son conservadores a propósito; cada recurso los ajusta
 * en su propio hook (`staleTime` del catálogo = 5 min). Lo que NO se negocia:
 * - Una sola reintento en lectura: dos fallos seguidos son un fallo real.
 * - Ninguna reintento en escritura: repetir un alta puede duplicar datos.
 * - `refetchOnWindowFocus` apagado: el foco de una herramienta de escritorio no
 *   debe disparar peticiones; solo la identidad lo activa.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true
      },
      mutations: {
        retry: false
      }
    }
  });
}

/** Cliente único de la aplicación. Las pruebas crean el suyo con `createQueryClient`. */
export const queryClient = createQueryClient();
