import type { LucideIcon } from 'lucide-react';

import { cn } from '@/shared/lib/cn';

export type RowActionTone = 'default' | 'primary' | 'danger';

const TONES: Record<RowActionTone, string> = {
  default: 'hover:bg-muted hover:text-foreground',
  primary: 'hover:bg-primary-soft hover:text-primary-soft-foreground',
  danger: 'hover:bg-danger-soft hover:text-danger'
};

export interface TableRowActionProps {
  readonly icon: LucideIcon;
  /** Texto accesible y tooltip nativo; describe la acción y la fila. */
  readonly label: string;
  readonly onClick: () => void;
  readonly tone?: RowActionTone;
  readonly disabled?: boolean;
}

/**
 * Botón de acción dentro de una celda de tabla.
 *
 * @remarks
 * Existe para que las tres tablas (Países, Usuarios, Roles) tengan el mismo
 * comportamiento y se vean igual, en lugar de repetir clases en cada `cell`.
 *
 * Decisiones de interacción:
 * - Icono de 16 px en un área de 32 px: el tamaño mínimo cómodo para puntero sin
 *   inflar la fila.
 * - El color aparece **en hover** y es semántico: eliminar se tiñe de peligro,
 *   editar de marca. Así el usuario puede distinguir la acción destructiva antes
 *   de pulsarla sin llenar la tabla de colores.
 * - Se eleva 1 px al pasar el ratón: una pista sutil de que es clicable.
 * - `title` además de `aria-label`: el tooltip nativo da el texto a quien usa
 *   ratón sin añadir un portal ni una dependencia.
 * - Deshabilitado no cambia de color al hover, para no sugerir que se puede.
 */
export function TableRowAction({
  icon: Icon,
  label,
  onClick,
  tone = 'default',
  disabled = false
}: TableRowActionProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-sm text-muted-foreground',
        'transition-[background-color,color,transform] duration-[var(--duration-fast)]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        disabled
          ? 'cursor-not-allowed opacity-35'
          : cn('hover:-translate-y-px active:translate-y-0', TONES[tone])
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}
