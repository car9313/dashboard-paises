import { screen, waitFor, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import { env } from '@/core/config/env';
import { server } from '@/mocks/server';
import { signInAs } from '@/test-utils/auth';
import { loadCountryFilters, saveCountryFilters } from './country-filters-storage';
import { renderWithProviders } from '@/test-utils/render';

import { CountriesPage } from './CountriesPage';

const API = env.apiBaseUrl;

/** Primer renglón del paginador, tal como lo compone `DataTable`. */
const FIRST_PAGE = 'Mostrando 1–10 de 249';

describe('CountriesPage', () => {
  it('lista la primera página del catálogo', async () => {
    renderWithProviders(<CountriesPage />);

    expect(await screen.findByText(FIRST_PAGE)).toBeInTheDocument();
    expect(screen.getByText('249 de 249 países')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Afganistán' })).toBeInTheDocument();
  });

  it('lee la búsqueda de la URL al entrar', async () => {
    renderWithProviders(<CountriesPage />, { route: '/nomencladores/paises?q=cuba' });

    expect(await screen.findByRole('cell', { name: 'Cuba' })).toBeInTheDocument();
    expect(screen.getByText('1 de 249 países')).toBeInTheDocument();
    expect(screen.getByLabelText(/buscar país/i)).toHaveValue('cuba');
  });

  it('busca sin distinguir acentos ni mayúsculas', async () => {
    const { user } = renderWithProviders(<CountriesPage />);

    await screen.findByText(FIRST_PAGE);
    await user.type(screen.getByLabelText(/buscar país/i), 'ESPANA');

    await waitFor(() => {
      expect(screen.getByRole('cell', { name: 'España' })).toBeInTheDocument();
    });
  });

  it('muestra el vacío de búsqueda y permite limpiar los filtros', async () => {
    const { user } = renderWithProviders(<CountriesPage />);

    await screen.findByText(FIRST_PAGE);
    await user.type(screen.getByLabelText(/buscar país/i), 'zzzz');

    expect(await screen.findByText('Ningún país coincide')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /limpiar filtros/i }));

    expect(await screen.findByText(FIRST_PAGE)).toBeInTheDocument();
  });

  it('filtra por estado y explica el vacío', async () => {
    const { user } = renderWithProviders(<CountriesPage />);

    await screen.findByText(FIRST_PAGE);
    await user.selectOptions(screen.getByLabelText(/filtrar por estado/i), 'inactive');

    expect(
      await screen.findByText('No hay países con el estado seleccionado.')
    ).toBeInTheDocument();
  });

  it('pagina al avanzar y vuelve a la página 1 al cambiar el tamaño', async () => {
    const { user } = renderWithProviders(<CountriesPage />);

    await screen.findByText(FIRST_PAGE);

    await user.click(screen.getByRole('button', { name: /página siguiente/i }));

    expect(await screen.findByText('Mostrando 11–20 de 249')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/filas/i), '25');

    expect(await screen.findByText('Mostrando 1–25 de 249')).toBeInTheDocument();
  });

  it('muestra el error y reintenta', async () => {
    server.use(
      http.get(`${API}/api/country/all`, () =>
        HttpResponse.json({ title: 'Fallo interno' }, { status: 500 })
      )
    );

    const { user } = renderWithProviders(<CountriesPage />);

    expect(await screen.findByText(/no se pudieron cargar los datos/i)).toBeInTheDocument();

    server.resetHandlers();
    await user.click(screen.getByRole('button', { name: /reintentar/i }));

    expect(await screen.findByText(FIRST_PAGE)).toBeInTheDocument();
  });

  it('ordena por nombre al pulsar la cabecera', async () => {
    const { user } = renderWithProviders(<CountriesPage />);

    await screen.findByText(FIRST_PAGE);

    // La vista arranca en orden ascendente: el primer clic invierte a descendente.
    await user.click(screen.getByRole('button', { name: /nombre/i }));

    await waitFor(() => {
      expect(screen.getAllByRole('cell')[0]).toHaveTextContent('Zimbabue');
    });
  });
});

describe('CountriesPage · escritura', () => {
  it('crea un país y lo muestra sin recargar', async () => {
    await signInAs('admin');

    const { user } = renderWithProviders(<CountriesPage />, {
      route: '/nomencladores/paises'
    });

    await screen.findByText(FIRST_PAGE);
    await user.click(screen.getByRole('button', { name: /nuevo país/i }));

    await user.type(screen.getByLabelText(/código/i), 'ZZ');
    await user.type(screen.getByLabelText(/nombre/i), 'Aaa Test');
    await user.click(screen.getByRole('button', { name: /crear país/i }));

    expect(await screen.findByRole('cell', { name: 'Aaa Test' })).toBeInTheDocument();
    expect(screen.getByText('250 de 250 países')).toBeInTheDocument();
  });

  it('alterna el estado de una fila de forma optimista', async () => {
    await signInAs('admin');

    const { user } = renderWithProviders(<CountriesPage />, { route: '/nomencladores/paises' });

    await screen.findByText(FIRST_PAGE);

    await user.click(screen.getByRole('switch', { name: /desactivar afganistán/i }));

    // La fila cambia de acción disponible: el estado ya es «inactivo».
    expect(await screen.findByRole('switch', { name: /activar afganistán/i })).toBeInTheDocument();
  });

  it('oculta las acciones de escritura a quien solo puede leer', async () => {
    await signInAs('consulta');

    renderWithProviders(<CountriesPage />, { route: '/nomencladores/paises' });

    await screen.findByText(FIRST_PAGE);

    expect(screen.queryByRole('button', { name: /nuevo país/i })).toBeNull();
    expect(screen.queryByRole('switch', { name: /afganistán/i })).toBeNull();
    expect(screen.getAllByText('Activo').length).toBeGreaterThan(0);
  });
});

describe('CountriesPage · detalle', () => {
  it('abre el detalle de la fila sin pedir el endpoint', async () => {
    let detailCalls = 0;

    server.use(
      http.get(`${API}/api/country/:code`, ({ params }) => {
        if (params['code'] === 'all') return undefined;
        detailCalls += 1;
        return HttpResponse.json({ code: 'AF', name: 'Afganistán', active: true });
      })
    );

    const { user } = renderWithProviders(<CountriesPage />, {
      route: '/nomencladores/paises'
    });

    await screen.findByText(FIRST_PAGE);
    await user.click(screen.getByRole('button', { name: /ver afganistán/i }));

    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByText('Detalle del país')).toBeInTheDocument();
    expect(within(dialog).getByText('Afganistán')).toBeInTheDocument();
    expect(detailCalls).toBe(0);
  });
});

describe('CountriesPage · persistencia de filtros', () => {
  it('restaura los filtros de la sesión anterior al entrar sin parámetros', async () => {
    saveCountryFilters('anon', {
      q: 'cuba',
      status: 'all',
      sort: 'name',
      dir: 'asc',
      page: 1,
      size: 10
    });

    renderWithProviders(<CountriesPage />, { route: '/nomencladores/paises' });

    expect(await screen.findByText('1 de 249 países')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /^Cuba$/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Buscar país')).toHaveValue('cuba');
  });

  it('la URL manda sobre lo guardado', async () => {
    saveCountryFilters('anon', {
      q: 'cuba',
      status: 'all',
      sort: 'name',
      dir: 'asc',
      page: 1,
      size: 10
    });

    renderWithProviders(<CountriesPage />, { route: '/nomencladores/paises?q=espana' });

    expect(await screen.findByRole('cell', { name: /^España$/ })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: /^Cuba$/ })).toBeNull();
    expect(screen.getByLabelText('Buscar país')).toHaveValue('espana');
  });

  it('limpiar los filtros borra lo guardado', async () => {
    const { user } = renderWithProviders(<CountriesPage />, {
      route: '/nomencladores/paises?q=cuba'
    });

    await screen.findByRole('cell', { name: /^Cuba$/ });
    expect(loadCountryFilters('anon')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: /^limpiar$/i }));

    await waitFor(() => {
      expect(loadCountryFilters('anon')).toBeNull();
    });
  });

  it('guarda la última vista para la próxima entrada', async () => {
    const { user } = renderWithProviders(<CountriesPage />, {
      route: '/nomencladores/paises'
    });

    await screen.findByText(FIRST_PAGE);

    await user.type(screen.getByLabelText('Buscar país'), 'cuba');

    await waitFor(() => {
      expect(loadCountryFilters('anon')?.q).toBe('cuba');
    });
  });
});
