import type { Country } from '../domain/country';
import { StatusBadge } from '@/shared/components/status-badge';
import { Switch } from '@/shared/ui/switch';

export interface CountryStatusCellProps {
  readonly country: Country;
  /** Sin `Actualizar` se muestra solo la insignia: no se ofrece lo que dará 403. */
  readonly canToggle: boolean;
  /** La fila tiene una petición en vuelo. */
  readonly pending: boolean;
  readonly onToggle: (country: Country, active: boolean) => void;
}

/**
 * Celda de estado: interruptor para quien puede cambiar el estado, insignia para
 * quien solo consulta.
 *
 * @remarks
 * El nombre accesible describe la **acción**, no el valor («Desactivar Cuba»),
 * porque un interruptor ya comunica su estado por `aria-checked`. Mientras hay
 * una petición en vuelo se deshabilita y se marca `aria-busy`; las demás filas
 * siguen operables.
 */
export function CountryStatusCell({
  country,
  canToggle,
  pending,
  onToggle
}: CountryStatusCellProps) {
  if (!canToggle) {
    return <StatusBadge active={country.active} />;
  }

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={country.active}
        disabled={pending}
        aria-busy={pending || undefined}
        aria-label={`${country.active ? 'Desactivar' : 'Activar'} ${country.name}`}
        onCheckedChange={(checked) => {
          onToggle(country, checked);
        }}
      />
      <span className="text-xs text-muted-foreground">
        {country.active ? 'Activo' : 'Inactivo'}
      </span>
    </div>
  );
}
