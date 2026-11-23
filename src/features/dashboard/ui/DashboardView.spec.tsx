import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test-utils/render';

import type { DashboardCountry } from '../domain/metrics';
import { DashboardView } from './DashboardView';

const countries: readonly DashboardCountry[] = [
  { code: 'CU', name: 'Cuba', active: true },
  { code: 'ES', name: 'España', active: true },
  { code: 'MX', name: 'México', active: false },
  { code: 'AR', name: 'Argentina', active: true }
];

function renderView(overrides: Partial<Parameters<typeof DashboardView>[0]> = {}) {
  return renderWithProviders(
    <DashboardView
      countries={countries}
      isPending={false}
      errorMessage={null}
      onRetry={vi.fn()}
      {...overrides}
    />
  );
}

describe('DashboardView', () => {
  it('muestra los indicadores derivados del catálogo', () => {
    renderView();

    expect(screen.getByText('Total del nomenclador')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    // «Inactivos» y los contadores de las barras comparten el literal «1».
    expect(screen.getByText('Inactivos')).toBeInTheDocument();
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    expect(screen.getByText('75 %')).toBeInTheDocument();
  });

  it('pinta la distribución por letra inicial', () => {
    renderView();

    expect(screen.getByText('Países por letra inicial')).toBeInTheDocument();
    // Cuba y España no comparten inicial; Argentina y México sí aportan A y M.
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('E')).toBeInTheDocument();
  });

  it('muestra esqueletos mientras carga y no inventa cifras', () => {
    renderView({ isPending: true, countries: [] });

    expect(screen.queryByText('4')).toBeNull();
    expect(screen.getAllByText('Países').length).toBeGreaterThan(0);
  });

  it('muestra el error con reintento y oculta los indicadores', () => {
    const onRetry = vi.fn();

    renderView({ errorMessage: 'El servidor no está disponible.', onRetry });

    expect(screen.getByText('No se pudieron cargar los datos')).toBeInTheDocument();
    expect(screen.queryByText('Total del nomenclador')).toBeNull();
  });

  it('invita a crear el primer país cuando el catálogo está vacío', () => {
    renderView({ countries: [] });

    expect(screen.getByText('Sin datos para mostrar.')).toBeInTheDocument();
  });
});
