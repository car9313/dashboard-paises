import '@testing-library/jest-dom/vitest';

import { webcrypto } from 'node:crypto';

import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';

/*
 * 28 archivos en paralelo compiten por CPU y las esperas por defecto (1 s en
 * `waitFor`, 5 s en `findBy`) provocaban fallos intermitentes que no eran del
 * código. El timeout se sube una vez aquí en lugar de caso por caso.
 */
/*
 * Jerarquía de esperas: syncUtilTimeout (5 s) tiene que ser MENOR que el
 * 	estTimeout (15 s, en ite.config.ts). Si es mayor, una aserción que no
 * encuentra su elemento no falla con su mensaje, sino que el test muere por
 * timeout global con un error inútil (fue el fallo del primer CI en Linux).
 */
configure({ asyncUtilTimeout: 5000 });

import { resetDeviceKey } from '@/core/auth/device-key';
import { resetSessionBootstrap } from '@/core/auth/session.service';
import { resetHttpState } from '@/core/http/client';
import { useUiStore } from '@/core/ui/ui.store';
import { resetMockDb } from '@/mocks/handlers';
import { server } from '@/mocks/server';

/**
 * Setup global de Vitest.
 *
 * - MSW intercepta toda la red: ninguna prueba toca el backend real.
 * - `onUnhandledFrame: 'error'` convierte una petición sin handler en un fallo
 *   visible, en lugar de salir a Internet en silencio.
 * - `resetMockDb()` devuelve las fixtures a su estado inicial entre pruebas.
 * - jsdom no implementa `crypto.subtle`; se inyecta el Web Crypto de Node para
 *   que el cifrado de tokens se pruebe de verdad (no con un doble).
 */

if (globalThis.crypto?.subtle === undefined) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
    writable: true
  });
}

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});

beforeEach(() => {
  // Los stores de Zustand viven en el módulo: se rearman antes de cada prueba.
  useUiStore.setState({
    sidebarCollapsed: false,
    mobileNavOpen: false,
    permissionsView: 'table',
    motion: 'system'
  });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockDb();
  resetHttpState();
  resetSessionBootstrap();
  resetDeviceKey();
  // Los stores de Zustand viven en el módulo: sin este reset, la preferencia de
  // vista de un test se filtra al siguiente.
  localStorage.clear();
  sessionStorage.clear();
});

afterAll(() => {
  server.close();
});
