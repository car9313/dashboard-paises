import { setupServer } from 'msw/node';

import { handlers } from './handlers';

/**
 * Servidor MSW para Node (Vitest).
 *
 * Se arranca en `vitest.setup.ts`; cada prueba puede añadir handlers propios con
 * `server.use(...)` y el reset global los descarta.
 */
export const server = setupServer(...handlers);
