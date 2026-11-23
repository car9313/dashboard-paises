import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AccessDeniedPage } from './AccessDeniedPage';
import { NotFoundPage } from './NotFoundPage';
import { renderWithProviders } from '@/test-utils/render';

describe('AccessDeniedPage', () => {
  it('explica que la sesión es válida y falta el permiso, y ofrece volver', () => {
    renderWithProviders(<AccessDeniedPage />, { route: '/' });

    expect(screen.getByRole('heading', { name: /acceso denegado/i })).toBeInTheDocument();
    expect(screen.getByText(/tu usuario no tiene permisos/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /volver al inicio/i })).toHaveAttribute('href', '/');
  });
});

describe('NotFoundPage', () => {
  it('muestra el 404 con salida al inicio', () => {
    renderWithProviders(<NotFoundPage />, { route: '/' });

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /inicio|volver/i })).toBeInTheDocument();
  });
});
