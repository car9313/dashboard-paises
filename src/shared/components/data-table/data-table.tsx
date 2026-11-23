import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { ErrorState } from '@/shared/components/error-state';
import { DEFAULT_PAGE_SIZE_OPTIONS } from './page-size-options';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';

export interface DataTableProps<T> {
  /** Filas de la página actual (ya filtradas, ordenadas y cortadas). */
  readonly data: T[];
  readonly columns: ColumnDef<T, unknown>[];
  /** Descripción para lectores de pantalla (`<caption>`). */
  readonly caption: string;
  readonly getRowId: (row: T) => string;
  /** Solo para pintar el indicador de la columna ordenada. */
  readonly sorting: SortingState;
  /** El consumidor decide la nueva columna/dirección. */
  readonly onSortToggle: (columnId: string) => void;
  readonly pageIndex: number;
  readonly pageSize: number;
  /** Total de filas tras aplicar filtros (no solo las de esta página). */
  readonly totalRows: number;
  readonly onPageChange: (pageIndex: number) => void;
  readonly onPageSizeChange: (pageSize: number) => void;
  readonly isPending?: boolean;
  readonly errorMessage?: string | null;
  readonly errorTraceId?: string | undefined;
  readonly onRetry?: () => void;
  /** Qué mostrar cuando no hay filas (distingue «vacío» de «sin resultados»). */
  readonly emptyState: ReactNode;
  readonly pageSizeOptions?: readonly number[];
}

/**
 * Tabla de datos con el contrato del `app-data-table` del proyecto origen:
 * cabecera y paginador que **sobreviven** a la recarga, esqueleto de filas
 * mientras carga y errores con reintento en el cuerpo.
 *
 * @remarks
 * La tabla es **totalmente controlada**: recibe la página ya cortada y avisa de
 * las acciones con números, no con *updaters*.
 *
 * Eso no es un detalle de estilo: TanStack reenvía un `updater` que se aplica al
 * estado anterior. Al combinar eso con paginación derivada de la URL se producía
 * un bucle real (clic en «siguiente» → pedía página 2 → el updater devolvía la 1).
 * Con props numéricas el flujo es unidireccional y no hay carrera.
 */
export function DataTable<T>({
  data,
  columns,
  caption,
  getRowId,
  sorting,
  onSortToggle,
  pageIndex,
  pageSize,
  totalRows,
  onPageChange,
  onPageSizeChange,
  isPending = false,
  errorMessage = null,
  errorTraceId,
  onRetry,
  emptyState,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS
}: DataTableProps<T>) {
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));

  /*
   * TanStack Table devuelve funciones no memoizables; el proyecto no usa el
   * compilador de React, así que la advertencia de `react-hooks` no aplica.
   */
  // eslint-disable-next-line react-hooks/incompatible-library -- ver comentario
  const table = useReactTable<T>({
    data,
    columns,
    getRowId,
    state: { sorting },
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    pageCount
  });

  const firstRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const lastRow = Math.min((pageIndex + 1) * pageSize, totalRows);

  const hasError = errorMessage !== null;
  const rows = table.getRowModel().rows;
  const columnCount = columns.length;

  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>

          <thead className="bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort() && header.column.id !== 'actions';
                  const sorted = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={
                        sorted === 'asc'
                          ? 'ascending'
                          : sorted === 'desc'
                            ? 'descending'
                            : canSort
                              ? 'none'
                              : undefined
                      }
                      className="border-b border-border px-4 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={() => {
                            onSortToggle(header.column.id);
                          }}
                          className="inline-flex items-center gap-1 rounded-xs hover:text-foreground focus-visible:text-foreground"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <span aria-hidden="true" className="text-[10px]">
                            {sorted === 'asc' ? '▲' : sorted === 'desc' ? '▼' : '↕'}
                          </span>
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody>
            {hasError && (
              <tr>
                <td colSpan={columnCount}>
                  <ErrorState message={errorMessage} onRetry={onRetry} traceId={errorTraceId} />
                </td>
              </tr>
            )}

            {!hasError &&
              isPending &&
              Array.from({ length: 5 }, (_, index) => (
                <tr key={`skeleton-${String(index)}`} aria-hidden="true">
                  {Array.from({ length: columnCount }, (_, cellIndex) => (
                    <td key={`cell-${String(cellIndex)}`} className="px-4 py-3">
                      <Skeleton className="h-4 w-full max-w-40" />
                    </td>
                  ))}
                </tr>
              ))}

            {!hasError && !isPending && rows.length === 0 && (
              <tr>
                <td colSpan={columnCount}>{emptyState}</td>
              </tr>
            )}

            {!hasError &&
              !isPending &&
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border transition-colors duration-[var(--duration-fast)] last:border-b-0 hover:bg-muted/60"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-middle text-foreground">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!hasError && !isPending && totalRows > 0 && (
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
            {`Mostrando ${String(firstRow)}–${String(lastRow)} de ${String(totalRows)}`}
          </p>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Filas
              <select
                className="h-8 rounded-sm border border-border-strong bg-card px-2 text-xs text-foreground"
                value={pageSize}
                onChange={(event) => {
                  onPageSizeChange(Number(event.target.value));
                }}
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                aria-label="Página anterior"
                disabled={pageIndex === 0}
                onClick={() => {
                  onPageChange(pageIndex - 1);
                }}
              >
                <ChevronLeft aria-hidden="true" />
              </Button>

              <span className="min-w-24 text-center text-xs text-muted-foreground">
                {`Página ${String(pageIndex + 1)} de ${String(pageCount)}`}
              </span>

              <Button
                variant="outline"
                size="icon"
                aria-label="Página siguiente"
                disabled={pageIndex >= pageCount - 1}
                onClick={() => {
                  onPageChange(pageIndex + 1);
                }}
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
