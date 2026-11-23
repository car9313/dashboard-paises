import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';

import './styles.css';

import { AppProviders } from './app/providers';
import { createAppRouter } from './app/router';
import { installAuth } from './core/auth/session.service';
import { isMockMode } from './core/config/env';

/**
 * Arranque de la aplicación.
 *
 * El orden es parte del contrato y **no** se puede alterar:
 *
 * 1. MSW (solo en desarrollo): debe interceptar antes de la primera petición.
 *    El import es dinámico y está condicionado a `import.meta.env.DEV`, así que
 *    en producción no entra en el artefacto (ADR-016).
 * 2. `installAuth`: conecta la sesión con el cliente HTTP. Antes de esto no hay
 *    proveedor de tokens, y una petición saldría sin `Bearer`.
 * 3. `createAppRouter`: crearlo ya inicia la navegación y ejecuta los `loader`.
 *    Por eso se crea aquí y no al importar el módulo: si no, la restauración de
 *    sesión correría antes de los pasos 1 y 2 (fallo real diagnosticado el
 *    2026-11-20: el refresh de un F5 se escapaba al backend real).
 * 4. Montar React.
 */
async function enableMocking(): Promise<void> {
  if (!isMockMode || !import.meta.env.DEV) {
    return;
  }

  const [{ worker }, { waitForMockReady }] = await Promise.all([
    import('./mocks/browser'),
    import('./mocks/wait-for-control')
  ]);

  await worker.start({ onUnhandledFrame: 'bypass' });
  // Confirma que el worker ya atiende a esta página y no solo que está registrado.
  await waitForMockReady();
}

async function bootstrap(): Promise<void> {
  await enableMocking();

  const router = createAppRouter();

  installAuth({
    onSessionExpired: () => {
      void router.navigate('/login', { replace: true });
    }
  });

  const rootElement = document.getElementById('root');
  if (rootElement === null) {
    throw new Error('No se encontró #root en index.html');
  }

  createRoot(rootElement).render(
    <StrictMode>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>
  );
}

void bootstrap();
