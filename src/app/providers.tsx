import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';

import { queryClient } from '@/core/query/query-client';

export interface AppProvidersProps {
  readonly children: ReactNode;
  /** Permite inyectar un cliente aislado en pruebas y en el catálogo. */
  readonly client?: QueryClient;
}

/**
 * Providers globales de la aplicación.
 *
 * Sólo hay dos: el estado de servidor (TanStack Query) y las notificaciones.
 * Todo lo demás es de dominio y vive en las features.
 */
export function AppProviders({ children, client = queryClient }: AppProvidersProps) {
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster position="top-right" closeButton richColors />
    </QueryClientProvider>
  );
}
