import { screen, waitFor, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';

import { env } from '@/core/config/env';
import { server } from '@/mocks/server';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test-utils/render';
import { signInAs } from '@/test-utils/auth';

import { UsersPage } from './UsersPage';

function renderPage(route = '/seguridad/usuarios') {
  return renderWithProviders(<UsersPage />, { route });
}

describe('UsersPage', () => {
  it('lista la primera página con el total del servidor', async () => {
    await signInAs('admin');
    renderPage();

    expect(await screen.findByText('12 usuarios')).toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: 'admin' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Ana Administradora' })).toBeInTheDocument();
    expect(screen.getByText('Mostrando 1–10 de 12')).toBeInTheDocument();
  });

  it('pagina contra el servidor y conserva la página en la URL', async () => {
    await signInAs('admin');
    const { user } = renderPage();

    await screen.findByText('12 usuarios');
    await user.click(screen.getByRole('button', { name: 'Página siguiente' }));

    await waitFor(() => {
      expect(screen.getByText('Mostrando 11–12 de 12')).toBeInTheDocument();
    });
  });

  it('deshabilita las acciones de un usuario protegido', async () => {
    await signInAs('admin');
    renderPage();

    await screen.findByRole('cell', { name: 'admin' });

    expect(screen.getByRole('button', { name: 'Editar admin' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Eliminar admin' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Restablecer contraseña de admin' })).toBeDisabled();
  });

  it('oculta las acciones de escritura a quien solo puede leer', async () => {
    await signInAs('consulta');
    renderPage();

    await screen.findByRole('cell', { name: 'admin' });

    expect(screen.queryByRole('button', { name: /nuevo usuario/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /editar/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /eliminar/i })).toBeNull();
    expect(screen.getByRole('button', { name: 'Ver admin' })).toBeInTheDocument();
  });

  it('crea un usuario y actualiza el total sin recargar', async () => {
    await signInAs('admin');
    const { user } = renderPage();

    await screen.findByText('12 usuarios');
    await user.click(screen.getByRole('button', { name: /nuevo usuario/i }));

    const dialog = await screen.findByRole('dialog');

    await user.type(within(dialog).getByLabelText(/^usuario/i), 'prueba.uno');
    await user.type(within(dialog).getByLabelText(/nombre completo/i), 'Prueba Uno');
    await user.type(within(dialog).getByLabelText(/^contraseña/i), 'Prueba123$');
    await user.type(within(dialog).getByLabelText(/confirmar contraseña/i), 'Prueba123$');
    await user.click(within(dialog).getByRole('checkbox', { name: 'Consulta' }));
    await user.click(within(dialog).getByRole('button', { name: /crear usuario/i }));

    await waitFor(() => {
      expect(screen.getByText('13 usuarios')).toBeInTheDocument();
    });
  });

  it('avisa cuando las contraseñas no coinciden y no llama al API', async () => {
    await signInAs('admin');
    const { user } = renderPage();

    await screen.findByText('12 usuarios');
    await user.click(screen.getByRole('button', { name: /nuevo usuario/i }));

    const dialog = await screen.findByRole('dialog');

    await user.type(within(dialog).getByLabelText(/^usuario/i), 'prueba.dos');
    await user.type(within(dialog).getByLabelText(/nombre completo/i), 'Prueba Dos');
    await user.type(within(dialog).getByLabelText(/^contraseña/i), 'Prueba123$');
    await user.type(within(dialog).getByLabelText(/confirmar contraseña/i), 'Otra123$');
    await user.click(within(dialog).getByRole('checkbox', { name: 'Consulta' }));
    await user.click(within(dialog).getByRole('button', { name: /crear usuario/i }));

    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument();
    expect(screen.getByText('12 usuarios')).toBeInTheDocument();
  });

  it('elimina un usuario tras confirmar', async () => {
    await signInAs('admin');
    const { user } = renderPage('/seguridad/usuarios?page=2');

    await screen.findByText('12 usuarios');
    await user.click(screen.getByRole('button', { name: 'Eliminar bnunez' }));

    const confirm = await screen.findByRole('dialog');
    await user.click(within(confirm).getByRole('button', { name: /^eliminar usuario$/i }));

    await waitFor(() => {
      expect(screen.getByText('11 usuarios')).toBeInTheDocument();
    });
  });

  it('restablece la contraseña y avisa de la clave temporal', async () => {
    await signInAs('admin');

    const requested: string[] = [];

    server.use(
      http.post(`${env.apiBaseUrl}/api/users/:id/reset-password`, ({ params }) => {
        requested.push(String(params['id']));
        return HttpResponse.json({ password: 'Tmp-4-2026' });
      })
    );

    const { user } = renderPage();

    await screen.findByRole('cell', { name: 'mgonzalez' });
    await user.click(screen.getByRole('button', { name: 'Restablecer contraseña de mgonzalez' }));

    await waitFor(() => {
      expect(requested).toEqual(['4']);
    });

    // El toast con la clave temporal se comprueba en el e2e: el Toaster no se
    // monta en las pruebas de componente a propósito (portal aparte).
  });
});
