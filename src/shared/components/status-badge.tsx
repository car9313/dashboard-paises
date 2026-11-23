import { Badge } from '@/shared/ui/badge';

export interface StatusBadgeProps {
  readonly active: boolean;
}

/**
 * Insignia de estado del nomenclador.
 *
 * «Inactivo» no es «eliminado»: el registro sigue existiendo y se puede
 * reactivar. El color lo dice (rojo tenue), el texto no miente.
 */
export function StatusBadge({ active }: StatusBadgeProps) {
  return (
    <Badge variant={active ? 'success' : 'danger'}>
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${active ? 'bg-success' : 'bg-danger'}`}
      />
      {active ? 'Activo' : 'Inactivo'}
    </Badge>
  );
}
