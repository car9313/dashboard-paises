import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { installAuth } from '@/core/auth/session.service';
import { useSessionStore } from '@/core/auth/session.store';

import { LoginPage } from './LoginPage';

function renderLogin(initialEntry = '/login') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<p>Inicio del dashboard</p>} />
        <Route path="/nomencladores/paises" element={<p>Listado de países</p>} />
      </Routes>
    </MemoryRouter>
  );
}

async function submit(username: string, password: string) {
  const user = userEvent.setup();

  await user.type(screen.getByLabelText(/usuario/i), username);
  await user.type(screen.getByLabelText(/contraseña/i), password);
  await user.click(screen.getByRole('button', { name: /entrar/i }));
}

describe('LoginPage', () => {
  beforeEach(() => {
    installAuth({ onSessionExpired: vi.fn() });
  });

  it('valida los campos antes de llamar al API', async () => {
    renderLogin();

    await userEvent.setup().click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByText('Escribe tu usuario')).toBeInTheDocument();
    expect(screen.getByText('Escribe tu contraseña')).toBeInTheDocument();
    expect(useSessionStore.getState().status).not.toBe('authenticated');
  });

  it('muestra un mensaje de credenciales inválidas con un 401', async () => {
    renderLogin();

    await submit('admin', 'clave-incorrecta');

    expect(await screen.findByRole('alert')).toHaveTextContent(/usuario o contraseña incorrectos/i);
    expect(useSessionStore.getState().status).not.toBe('authenticated');
  });

  it('entra al dashboard y autentica la sesión', async () => {
    renderLogin();

    await submit('admin', 'Admin123$');

    expect(await screen.findByText('Inicio del dashboard')).toBeInTheDocument();
    expect(useSessionStore.getState().user?.username).toBe('admin');
  });

  it('vuelve al destino pedido tras autenticarse', async () => {
    renderLogin('/login?redirect=%2Fnomencladores%2Fpaises');

    await submit('consulta', 'Consulta123$');

    expect(await screen.findByText('Listado de países')).toBeInTheDocument();
  });
});
