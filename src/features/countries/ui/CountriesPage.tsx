import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Eye, Flag, Pencil, Plus, SearchX } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { useHasPermission } from '@/core/auth/use-permission';
import { ApiError, toUserMessage } from '@/core/http/problems';
import { ACTIONS } from '@/core/rbac/actions';
import { RESOURCES } from '@/core/rbac/resources';
import { DataTable } from '@/shared/components/data-table/data-table';
import { EmptyState } from '@/shared/components/empty-state';
import { PageHeader } from '@/shared/components/page-header';
import { SearchInput } from '@/shared/components/search-input';
import { TableRowAction } from '@/shared/components/table-row-action';
import { Button } from '@/shared/ui/button';
import { Select } from '@/shared/ui/select';

import { useToggleCountry } from '../api/mutations';
import { useCountriesCatalog } from '../api/queries';
import type { Country } from '../domain/country';
import { COUNTRY_STATUS_LABEL, filterCountries, sortCountries } from '../domain/country-list';
import { CountryDetailDialog } from './CountryDetailDialog';
import { CountryFormDialog } from './CountryFormDialog';
import { CountryStatusCell } from './CountryStatusCell';
import { useCountriesQueryState } from './use-countries-query-state';

/** Referencia estable: evita recalcular la tabla mientras la consulta carga. */
const NO_COUNTRIES: readonly Country[] = [];

const STATUS_OPTIONS = ['all', 'active', 'inactive'] as const;

type DialogState =
  | { readonly mode: 'create' }
  | { readonly mode: 'edit'; country: Country }
  | { readonly mode: 'detail'; code: string }
  | null;

/**
 * Listado del nomenclador de países.
 *
 * @remarks
 * **Catálogo-first** (ADR-013): una sola petición trae los 249 países y aquí se
 * busca, se ordena y se filtra. No es una limitación de la UI sino una respuesta
 * medida al backend: su búsqueda devuelve 500 y `Sort`/`Filter` se ignoran.
 *
 * Reparto de responsabilidades:
 * - La **URL** es la fuente de verdad de búsqueda, filtro, orden y paginación.
 * - El **dominio** (`filterCountries`, `sortCountries`) hace el trabajo, con
 *   comparación consciente de acentos y locale español.
 * - La **tabla** solo pinta y avisa con números: recibe la página ya cortada.
 * - Las **escrituras** viven en `api/mutations.ts`; la página solo decide qué
 *   ofrecer según permisos (`Can`/`useHasPermission`) y abre el diálogo.
 */
export function CountriesPage() {
  const { state, hasFilters, setQuery, setStatus, setSort, setPage, setSize, reset } =
    useCountriesQueryState();

  const catalog = useCountriesCatalog();
  const toggle = useToggleCountry();

  const [dialog, setDialog] = useState<DialogState>(null);

  const canCreate = useHasPermission(RESOURCES.Nomenclators, [ACTIONS.Create]);
  const canUpdate = useHasPermission(RESOURCES.Nomenclators, [ACTIONS.Update]);

  const countries = catalog.data?.countries ?? NO_COUNTRIES;

  const filtered = useMemo(
    () => filterCountries(countries, { query: state.q, status: state.status }),
    [countries, state.q, state.status]
  );

  const sorted = useMemo(
    () => sortCountries(filtered, state.sort, state.dir),
    [filtered, state.sort, state.dir]
  );

  const pageCount = Math.max(1, Math.ceil(sorted.length / state.size));
  const pageIndex = Math.min(Math.max(state.page - 1, 0), pageCount - 1);

  const pageRows = useMemo(() => {
    const start = pageIndex * state.size;
    return sorted.slice(start, start + state.size);
  }, [sorted, pageIndex, state.size]);

  const sorting: SortingState = useMemo(
    () => [{ id: state.sort, desc: state.dir === 'desc' }],
    [state.sort, state.dir]
  );

  /** Solo la fila en vuelo queda bloqueada; el resto de la tabla sigue viva. */
  const pendingCode = toggle.isPending ? (toggle.variables?.country.code ?? null) : null;

  const openEdit = useCallback((country: Country) => {
    setDialog({ mode: 'edit', country });
  }, []);

  const openDetail = useCallback((code: string) => {
    setDialog({ mode: 'detail', code });
  }, []);

  const handleToggle = useCallback(
    (country: Country, active: boolean) => {
      if (pendingCode !== null) {
        return;
      }

      toggle.mutate({ country, active });
    },
    [pendingCode, toggle]
  );

  const closeDialog = useCallback(() => {
    setDialog(null);
  }, []);

  const columns = useMemo<ColumnDef<Country, unknown>[]>(() => {
    const base: ColumnDef<Country, unknown>[] = [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Nombre',
        enableSorting: true,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>
      },
      {
        id: 'code',
        accessorKey: 'code',
        header: 'Código',
        enableSorting: true,
        cell: ({ row }) => (
          <span className="font-mono text-[13px] tracking-wide text-muted-foreground">
            {row.original.code}
          </span>
        )
      },
      {
        id: 'active',
        header: 'Estado',
        enableSorting: false,
        cell: ({ row }) => (
          <CountryStatusCell
            country={row.original}
            canToggle={canUpdate}
            pending={pendingCode === row.original.code}
            onToggle={handleToggle}
          />
        )
      }
    ];

    base.push({
      id: 'actions',
      header: 'Acciones',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-0.5">
          <TableRowAction
            icon={Eye}
            label={`Ver ${row.original.name}`}
            onClick={() => {
              openDetail(row.original.code);
            }}
          />

          {canUpdate && (
            <TableRowAction
              icon={Pencil}
              tone="primary"
              label={`Editar ${row.original.name}`}
              onClick={() => {
                openEdit(row.original);
              }}
            />
          )}
        </div>
      )
    });

    return base;
  }, [canUpdate, pendingCode, handleToggle, openDetail, openEdit]);

  const errorMessage = catalog.error === null ? null : toUserMessage(catalog.error);
  const errorTraceId = catalog.error instanceof ApiError ? catalog.error.traceId : undefined;

  const emptyState = hasFilters ? (
    <EmptyState
      icon={SearchX}
      title="Ningún país coincide"
      description={
        state.q.length > 0
          ? `No hay resultados para «${state.q}». Prueba con otro nombre o código.`
          : 'No hay países con el estado seleccionado.'
      }
      action={
        <Button variant="secondary" size="sm" onClick={reset}>
          Limpiar filtros
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={Flag}
      title="No hay países registrados"
      description="Crea el primer país del nomenclador."
      action={
        canCreate ? (
          <Button
            size="sm"
            onClick={() => {
              setDialog({ mode: 'create' });
            }}
          >
            <Plus aria-hidden="true" />
            Nuevo país
          </Button>
        ) : undefined
      }
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Países"
        description="Nomenclador de países: consulta, orden y estado."
        actions={
          canCreate ? (
            <Button
              onClick={() => {
                setDialog({ mode: 'create' });
              }}
            >
              <Plus aria-hidden="true" />
              Nuevo país
            </Button>
          ) : undefined
        }
      />

      <div className="rounded-lg border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <SearchInput
              value={state.q}
              onChange={setQuery}
              label="Buscar país"
              placeholder="Buscar por nombre o código…"
              className="w-full sm:max-w-xs"
            />

            <Select
              aria-label="Filtrar por estado"
              value={state.status}
              onChange={(event) => {
                const value = event.target.value;
                if (value === 'all' || value === 'active' || value === 'inactive') {
                  setStatus(value);
                }
              }}
              className="sm:w-40"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {COUNTRY_STATUS_LABEL[option]}
                </option>
              ))}
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={reset}>
                Limpiar
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
            {`${String(sorted.length)} de ${String(countries.length)} países`}
          </p>
        </div>

        <DataTable
          data={pageRows}
          columns={columns}
          caption="Listado de países del nomenclador"
          getRowId={(country) => country.code}
          sorting={sorting}
          onSortToggle={(columnId) => {
            if (columnId === 'name' || columnId === 'code') {
              setSort(columnId);
            }
          }}
          pageIndex={pageIndex}
          pageSize={state.size}
          totalRows={sorted.length}
          onPageChange={(index) => {
            setPage(index + 1);
          }}
          onPageSizeChange={setSize}
          isPending={catalog.isPending}
          errorMessage={errorMessage}
          errorTraceId={errorTraceId}
          onRetry={() => {
            void catalog.refetch();
          }}
          emptyState={emptyState}
        />
      </div>

      {dialog?.mode === 'create' && (
        <CountryFormDialog mode="create" onClose={closeDialog} onSaved={closeDialog} />
      )}

      {dialog?.mode === 'edit' && (
        <CountryFormDialog
          mode="edit"
          country={dialog.country}
          onClose={closeDialog}
          onSaved={closeDialog}
        />
      )}

      {dialog?.mode === 'detail' && (
        <CountryDetailDialog
          code={dialog.code}
          onClose={closeDialog}
          {...(canUpdate
            ? {
                onEdit: (country: Country) => {
                  setDialog({ mode: 'edit', country });
                }
              }
            : {})}
        />
      )}
    </div>
  );
}
