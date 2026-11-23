import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { signInAs } from '@/test-utils/auth';
import { renderWithProviders } from '@/test-utils/render';

import { RolesPage } from './RolesPage';

function renderPage(route = '/seguridad/roles') {
  return renderWithProviders(<RolesPage />, { route });
}

describe('RolesPage', () => {
  it('lista los roles con el resumen de sus permisos', async () => {
    await signInAs('admin');
    renderPage();

    expect(await screen.findByRole('cell', { name: /administrador/i })).toBeInTheDocument();
    expect(screen.getByText('3 recursos · 12 acciones')).toBeInTheDocument();
    // Consulta y Auditoría tienen el mismo resumen (un recurso, una acción).
    expect(screen.getAllByText('1 recurso · 1 acción')).toHaveLength(2);
  });

  it('marca el rol del sistema y deshabilita renombrar y eliminar', async () => {
    await signInAs('admin');
    renderPage();

    await screen.findByRole('cell', { name: /administrador/i });

    expect(screen.getByText('Sistema')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Renombrar Administrador' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Eliminar Administrador' })).toBeDisabled();
  });

  it('crea un rol nuevo', async () => {
    await signInAs('admin');
    const { user } = renderPage();

    await screen.findByRole('cell', { name: /administrador/i });
    await user.click(screen.getByRole('button', { name: /nuevo rol/i }));

    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/nombre del rol/i), 'Operador');
    await user.click(within(dialog).getByRole('button', { name: /crear rol/i }));

    expect(await screen.findByRole('cell', { name: /operador/i })).toBeInTheDocument();
  });

  it('muestra marcados solo los permisos que el rol ya tiene', async () => {
    await signInAs('admin');
    const { user } = renderPage();

    await screen.findByRole('cell', { name: /consulta/i });
    await user.click(screen.getByRole('button', { name: 'Ver permisos de Consulta' }));

    const dialog = await screen.findByRole('dialog');

    expect(
      await within(dialog).findByRole('checkbox', { name: 'Leer en Nomenclador de países' })
    ).toBeChecked();
    expect(
      within(dialog).getByRole('checkbox', { name: 'Crear en Nomenclador de países' })
    ).not.toBeChecked();
    expect(
      within(dialog).getByRole('checkbox', { name: 'Leer en Usuarios del sistema' })
    ).not.toBeChecked();
  });

  it('guarda los permisos y los conserva al volver a abrir el editor', async () => {
    await signInAs('admin');
    const { user } = renderPage();

    await screen.findByRole('cell', { name: /consulta/i });
    await user.click(screen.getByRole('button', { name: 'Ver permisos de Consulta' }));

    const dialog = await screen.findByRole('dialog');

    const create = await within(dialog).findByRole('checkbox', {
      name: 'Crear en Nomenclador de países'
    });
    await user.click(create);
    await user.click(within(dialog).getByRole('button', { name: /guardar permisos/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    // Ida y vuelta real: se relee del servidor, no del estado local.
    await user.click(screen.getByRole('button', { name: 'Ver permisos de Consulta' }));

    const reopened = await screen.findByRole('dialog');
    expect(
      await within(reopened).findByRole('checkbox', { name: 'Crear en Nomenclador de países' })
    ).toBeChecked();
    expect(screen.getByText('1 recurso · 2 acciones')).toBeInTheDocument();
  });

  it('no permite editar los permisos de un rol del sistema', async () => {
    await signInAs('admin');
    const { user } = renderPage();

    await screen.findByRole('cell', { name: /administrador/i });
    await user.click(screen.getByRole('button', { name: 'Ver permisos de Administrador' }));

    const dialog = await screen.findByRole('dialog');

    expect(
      within(dialog).getByText(
        'Este rol es del sistema: sus permisos se consultan pero no se editan.'
      )
    ).toBeInTheDocument();
    expect(
      await within(dialog).findByRole('checkbox', { name: 'Leer en Nomenclador de países' })
    ).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: /guardar permisos/i })).toBeDisabled();
  });

  it('oculta las acciones de escritura a quien solo puede leer', async () => {
    await signInAs('consulta');
    renderPage();

    await screen.findByRole('cell', { name: /consulta/i });

    expect(screen.queryByRole('button', { name: /nuevo rol/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /renombrar/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /eliminar/i })).toBeNull();
    expect(screen.getByRole('button', { name: 'Ver permisos de Consulta' })).toBeInTheDocument();
  });
});

describe('RolesPage · vista de árbol', () => {
  it('alterna entre tabla y árbol conservando la selección', async () => {
    await signInAs('admin');
    const { user } = renderPage();

    await screen.findByRole('cell', { name: /consulta/i });
    await user.click(screen.getByRole('button', { name: 'Ver permisos de Consulta' }));

    const dialog = await screen.findByRole('dialog');

    // Por defecto, tabla.
    expect(
      await within(dialog).findByRole('checkbox', { name: 'Leer en Nomenclador de países' })
    ).toBeChecked();
    expect(within(dialog).getByLabelText('Vista de árbol')).not.toBeChecked();

    await user.click(within(dialog).getByLabelText('Vista de árbol'));

    // La misma hoja sigue marcada, con el nombre de la vista de árbol.
    expect(
      await within(dialog).findByRole('checkbox', {
        name: 'Leer en Nomenclador de países (Nomencladores)'
      })
    ).toBeChecked();
  });

  it('propaga la selección de una categoría completa y la guarda', async () => {
    await signInAs('admin');
    const { user } = renderPage();

    await screen.findByRole('cell', { name: /consulta/i });
    await user.click(screen.getByRole('button', { name: 'Ver permisos de Consulta' }));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByLabelText('Vista de árbol'));

    await user.click(
      await within(dialog).findByRole('checkbox', { name: 'Todos los permisos de Seguridad' })
    );

    // Marcar el padre marca sus ocho acciones.
    expect(
      within(dialog).getByRole('checkbox', { name: 'Crear en Usuarios del sistema (Seguridad)' })
    ).toBeChecked();
    expect(
      within(dialog).getByRole('checkbox', { name: 'Eliminar en Roles y permisos (Seguridad)' })
    ).toBeChecked();

    await user.click(within(dialog).getByRole('button', { name: /guardar permisos/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    // La preferencia de vista sobrevive al guardado.
    await user.click(screen.getByRole('button', { name: 'Ver permisos de Consulta' }));

    const reopened = await screen.findByRole('dialog');
    expect(within(reopened).getByLabelText('Vista de árbol')).toBeChecked();
    expect(
      await within(reopened).findByRole('checkbox', {
        name: 'Crear en Usuarios del sistema (Seguridad)'
      })
    ).toBeChecked();
    expect(screen.getByText('3 recursos · 9 acciones')).toBeInTheDocument();
  });

  it('deja el grupo en estado indeterminado cuando solo se marca una hoja', async () => {
    await signInAs('admin');
    const { user } = renderPage();

    await screen.findByRole('cell', { name: /consulta/i });
    await user.click(screen.getByRole('button', { name: 'Ver permisos de Consulta' }));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByLabelText('Vista de árbol'));

    await user.click(
      await within(dialog).findByRole('checkbox', {
        name: 'Leer en Usuarios del sistema (Seguridad)'
      })
    );

    expect(
      within(dialog).getByRole('checkbox', { name: 'Todos los permisos de Usuarios del sistema' })
    ).toBePartiallyChecked();
    expect(
      within(dialog).getByRole('checkbox', { name: 'Todos los permisos de Seguridad' })
    ).toBePartiallyChecked();
  });

  it('colapsa una categoría y la saca del orden de tabulación', async () => {
    await signInAs('admin');
    const { user } = renderPage();

    await screen.findByRole('cell', { name: /consulta/i });
    await user.click(screen.getByRole('button', { name: 'Ver permisos de Consulta' }));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByLabelText('Vista de árbol'));

    const collapse = await within(dialog).findByRole('button', { name: 'Contraer Nomencladores' });
    expect(collapse).toHaveAttribute('aria-expanded', 'true');

    await user.click(collapse);

    const expand = within(dialog).getByRole('button', { name: 'Expandir Nomencladores' });
    expect(expand).toHaveAttribute('aria-expanded', 'false');

    // El contenido cerrado sigue en el DOM (para animar) pero queda inerte.
    expect(dialog.querySelector('[inert]')).not.toBeNull();
  });
});
