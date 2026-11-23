import { env } from '@/core/config/env';

/**
 * Espera a que MSW **atienda de verdad** las peticiones de esta página.
 *
 * `worker.start()` resuelve cuando el worker está registrado, pero en una recarga
 * el cliente nuevo puede emitir peticiones antes de que el worker las atienda.
 * Comprobar `navigator.serviceWorker.controller` no basta: el controlador de la
 * carga anterior sigue presente, así que la comprobación pasa y la petición
 * escapa al backend real.
 *
 * La única señal fiable es una petición de sonda que solo MSW responde. Se
 * reintenta hasta recibir la cabecera esperada.
 */

const PROBE_PATH = '/api/__msw/ready';
const PROBE_HEADER = 'x-msw';
const PROBE_VALUE = 'ready';

export async function waitForMockReady(timeoutMs = 3000): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${env.apiBaseUrl}${PROBE_PATH}`, {
        headers: { Accept: 'application/json' }
      });

      if (response.headers.get(PROBE_HEADER) === PROBE_VALUE) {
        return;
      }
    } catch {
      // La sonda puede fallar mientras el worker se instala: se reintenta.
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  console.warn(
    '[mock] MSW no confirmó que intercepta las peticiones; las llamadas al API pueden salir a la red.'
  );
}
