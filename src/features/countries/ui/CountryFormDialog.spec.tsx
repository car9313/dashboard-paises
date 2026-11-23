import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '@/core/config/env';
import { server } from '@/mocks/server';
import { signInAs } from '@/test-utils/auth';
import { createTestQueryClient } from '@/test-utils/render';

import type { Country } from '../domain/country';
import { CountryFormDialog } from './CountryFormDialog';

const API = env.apiBaseUrl;

function renderDialog(props: Partial<Parameters<typeof CountryFormDialog>[0]> = {}) {
  const onSaved = vi.fn<(country: Country) => void>();
  const onClose = vi.fn<() => void>();

  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <CountryFormDialog mode="create" onClose={onClose} onSaved={onSaved} {...props} />
    </QueryClientProvider>
  );

  return { onSaved, onClose, user: userEvent.setup() };
}

describe('CountryFormDialog', () => {
  beforeEach(async () => {
    await signInAs('admin');
  });

  it('valida el código y el nombre antes de llamar al API', async () => {
    const { user, onSaved } = renderDialog();

    await user.click(screen.getByRole('button', { name: /crear país/i }));

    expect(
      await screen.findByText('El código debe tener exactamente 2 letras')
    ).toBeInTheDocument();
    expect(screen.getByText('El nombre debe tener al menos 2 caracteres')).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('crea el país y devuelve la entidad guardada', async () => {
    const { user, onSaved } = renderDialog();

    await user.type(screen.getByLabelText(/código/i), 'zz');
    await user.type(screen.getByLabelText(/nombre/i), 'Zzzlandia');
    await user.click(screen.getByRole('button', { name: /crear país/i }));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1);
    });

    expect(onSaved.mock.calls[0]?.[0]).toMatchObject({ code: 'ZZ', name: 'Zzzlandia' });
  });

  it('en edición bloquea el código y guarda solo el nombre', async () => {
    const country: Country = { code: 'ES', name: 'España', active: true };
    let sentBody: unknown = null;

    server.use(
      http.put(`${API}/api/country/:code`, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json({ code: 'ES', name: 'Reino de España', active: true });
      })
    );

    const { user, onSaved } = renderDialog({ mode: 'edit', country });

    const codeInput = screen.getByLabelText(/código/i);
    expect(codeInput).toHaveValue('ES');
    expect(codeInput).toHaveAttribute('readonly');

    await user.clear(screen.getByLabelText(/nombre/i));
    await user.type(screen.getByLabelText(/nombre/i), 'Reino de España');
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1);
    });

    // El payload de edición NO incluye el código.
    expect(sentBody).toEqual({ name: 'Reino de España' });
  });

  it('muestra el conflicto de código en el campo, no como error genérico', async () => {
    server.use(
      http.post(`${API}/api/country`, () =>
        HttpResponse.json({ title: 'Conflicto' }, { status: 409 })
      )
    );

    const { user, onSaved } = renderDialog();

    await user.type(screen.getByLabelText(/código/i), 'cu');
    await user.type(screen.getByLabelText(/nombre/i), 'Cuba');
    await user.click(screen.getByRole('button', { name: /crear país/i }));

    expect(await screen.findByText('Ese código ya existe. Usa otro.')).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('no cierra el diálogo al cancelar mientras guarda', async () => {
    server.use(
      http.post(`${API}/api/country`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return HttpResponse.json({ code: 'CU', name: 'Cuba', active: true });
      })
    );

    const { user, onClose } = renderDialog();

    await user.type(screen.getByLabelText(/código/i), 'zz');
    await user.type(screen.getByLabelText(/nombre/i), 'Zzzlandia');
    await user.click(screen.getByRole('button', { name: /crear país/i }));

    const cancel = screen.getByRole('button', { name: /cancelar/i });
    expect(cancel).toBeDisabled();

    await waitFor(() => {
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
