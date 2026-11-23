import { setupWorker } from 'msw/browser';

import { handlers } from './handlers';

/** Worker de MSW para el navegador (modo `VITE_API_MODE=mock`). */
export const worker = setupWorker(...handlers);
