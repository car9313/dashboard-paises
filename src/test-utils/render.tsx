import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';

/**
 * Utilidades de prueba compartidas.
 *
 * Un `QueryClient` por prueba (sin reintentos, sin recolección) evita que un
 * fallo tarde por los reintentos y que la caché se libere entre renders.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: 0 },
      mutations: { retry: false }
    }
  });
}

export interface RenderOptions {
  readonly route?: string;
  readonly client?: QueryClient;
}

export function renderWithProviders(ui: ReactElement, options: RenderOptions = {}) {
  const client = options.client ?? createTestQueryClient();
  const user = userEvent.setup();

  const result = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[options.route ?? '/']}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );

  return { ...result, client, user };
}
