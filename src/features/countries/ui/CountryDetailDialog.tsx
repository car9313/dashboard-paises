import { Pencil } from 'lucide-react';

import { ApiError, toUserMessage } from '@/core/http/problems';
import { ErrorState } from '@/shared/components/error-state';
import { StatusBadge } from '@/shared/components/status-badge';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/shared/ui/dialog';
import { Skeleton } from '@/shared/ui/skeleton';

import { useCountriesCatalog, useCountry } from '../api/queries';
import type { Country } from '../domain/country';

export interface CountryDetailDialogProps {
  readonly code: string;
  readonly onClose: () => void;
  /** Si se provee, el detalle ofrece «Editar». */
  readonly onEdit?: ((country: Country) => void) | undefined;
}

/**
 * Detalle de un país.
 *
 * @remarks
 * **Se sirve del catálogo en caché** (ADR-013): la fila ya está en memoria, así
 * que abrir el detalle no genera ninguna petición. El endpoint
 * `GET /api/country/{code}` queda como respaldo para un enlace directo cuyo
 * código no esté en el catálogo — y ese camino sí muestra su propio error con
 * reintento, porque el backend respondió 404 en la última verificación (BE-005).
 */
export function CountryDetailDialog({ code, onClose, onEdit }: CountryDetailDialogProps) {
  const catalog = useCountriesCatalog();
  const cached = catalog.data?.countries.find((country) => country.code === code);

  // Solo se consulta al servidor si el catálogo ya cargó y no contiene el código.
  const needsRemote = catalog.data !== undefined && cached === undefined;
  const remote = useCountry(needsRemote ? code : null);

  const country = cached ?? remote.data ?? null;
  const isPending = country === null && (catalog.isPending || remote.isPending);
  const error = country === null && remote.error !== null ? remote.error : null;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Detalle del país</DialogTitle>
          <DialogDescription>Código {code}</DialogDescription>
        </DialogHeader>

        {isPending && (
          <div className="flex flex-col gap-3" aria-busy="true">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        )}

        {error !== null && (
          <ErrorState
            message={toUserMessage(error)}
            traceId={error instanceof ApiError ? error.traceId : undefined}
            onRetry={() => {
              void remote.refetch();
            }}
          />
        )}

        {country !== null && (
          <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Nombre</dt>
            <dd className="font-medium text-foreground">{country.name}</dd>

            <dt className="text-muted-foreground">Código</dt>
            <dd className="font-mono tracking-wide text-foreground">{country.code}</dd>

            <dt className="text-muted-foreground">Estado</dt>
            <dd>
              <StatusBadge active={country.active} />
            </dd>
          </dl>
        )}

        <DialogFooter>
          {onEdit !== undefined && country !== null && (
            <Button variant="secondary" onClick={() => onEdit(country)}>
              <Pencil aria-hidden="true" />
              Editar
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
