import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DesignSystemPage } from '@/design-system/catalog/DesignSystemPage';
import { LoginPage } from '@/features/auth/ui/LoginPage';
import { DashboardView } from '@/features/dashboard/ui/DashboardView';
import { RolesPage } from '@/features/roles';
import { UsersPage } from '@/features/users';
import { expectNoA11yViolations, findA11yViolations } from '@/test-utils/a11y';
import { signInAs } from '@/test-utils/auth';
import { renderWithProviders } from '@/test-utils/render';

import { CountriesPage } from '@/features/countries/ui/CountriesPage';

/**
 * Auditoría de accesibilidad de las pantallas.
 *
 * Es una red automática, no un sustituto de la revisión manual: axe detecta
 * nombres accesibles ausentes, roles incorrectos y `aria-*` inválidos, pero no
 * si la experiencia con teclado es razonable.
 */
describe('accesibilidad', () => {
  it('el verificador detecta una violación real (control de la herramienta)', async () => {
    const { container } = render(<button type="button" />);

    const violations = await findA11yViolations(container);

    expect(violations.map((violation) => violation.id)).toContain('button-name');
  });

  it('pantalla de inicio de sesión', async () => {
    renderWithProviders(<LoginPage />, { route: '/login' });

    expect(await screen.findByRole('heading', { name: /inicia sesión/i })).toBeInTheDocument();

    await expectNoA11yViolations(document.body);
  });

  it('listado de países con datos', async () => {
    await signInAs('admin');

    renderWithProviders(<CountriesPage />, { route: '/nomencladores/paises' });

    expect(await screen.findByText('Mostrando 1–10 de 249')).toBeInTheDocument();

    await expectNoA11yViolations(document.body);
  });

  it('inicio con métricas', async () => {
    renderWithProviders(
      <DashboardView
        countries={[
          { code: 'CU', name: 'Cuba', active: true },
          { code: 'ES', name: 'España', active: false }
        ]}
        isPending={false}
        errorMessage={null}
        onRetry={vi.fn()}
      />
    );

    expect(await screen.findByText('Total del nomenclador')).toBeInTheDocument();

    await expectNoA11yViolations(document.body);
  });

  it('listado de usuarios', async () => {
    await signInAs('admin');

    renderWithProviders(<UsersPage />, { route: '/seguridad/usuarios' });

    expect(await screen.findByText('12 usuarios')).toBeInTheDocument();

    await expectNoA11yViolations(document.body);
  });

  it('editor de permisos abierto', async () => {
    await signInAs('admin');

    renderWithProviders(<RolesPage />, { route: '/seguridad/roles' });

    const { user } = { user: userEvent.setup() };
    await screen.findByRole('cell', { name: /consulta/i });
    await user.click(screen.getByRole('button', { name: 'Ver permisos de Consulta' }));
    await screen.findByRole('dialog');

    await expectNoA11yViolations(document.body);
  });
  it('catálogo del sistema de diseño', async () => {
    renderWithProviders(<DesignSystemPage />, { route: '/design-system' });

    expect(await screen.findByRole('heading', { name: /sistema de diseño/i })).toBeInTheDocument();

    await expectNoA11yViolations(document.body);
  });
});
