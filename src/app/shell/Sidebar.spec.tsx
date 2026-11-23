import { act } from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useSessionStore } from '@/core/auth/session.store';
import { useUiStore } from '@/core/ui/ui.store';
import { renderWithProviders } from '@/test-utils/render';

import { Sidebar } from './Sidebar';

function renderSidebar() {
  useSessionStore.setState({
    status: 'authenticated',
    user: {
      id: '1',
      username: 'admin',
      fullName: 'Ana Administradora',
      roles: ['Administrador']
    },
    permissions: [
      { resource: 'Nomenclators', actions: ['Leer'] },
      { resource: 'User', actions: ['Leer'] },
      { resource: 'Role', actions: ['Leer'] }
    ]
  });

  return renderWithProviders(<Sidebar />, { route: '/' });
}

describe('Sidebar', () => {
  it('filtra los ítems según los permisos de la sesión', async () => {
    renderSidebar();

    expect(await screen.findByRole('link', { name: 'Países' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Usuarios' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Roles' })).toBeInTheDocument();
  });

  it('al colapsar mantiene la etiqueta en el DOM y la desvanece', () => {
    renderSidebar();

    const link = screen.getByRole('link', { name: 'Países' });

    // Expandido: etiqueta visible y sin duplicar el nombre accesible.
    expect(link.querySelector('.opacity-100')).not.toBeNull();
    expect(link.querySelector('.sr-only')).toBeNull();

    act(() => {
      useUiStore.setState({ sidebarCollapsed: true });
    });

    // Colapsado: la etiqueta sigue montada (se anima), oculta para lectores y
    // el nombre accesible pasa al `sr-only` sin duplicarse.
    const collapsedLink = screen.getByRole('link', { name: 'Países' });
    expect(collapsedLink.querySelector('.opacity-0')).not.toBeNull();
    expect(collapsedLink.querySelector('.sr-only')?.textContent).toBe('Países');
  });
});
