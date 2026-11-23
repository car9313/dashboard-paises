import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

export interface PageHeaderProps {
  readonly title: string;
  readonly description?: string | undefined;
  /** Acciones alineadas a la derecha (botón de alta, exportar…). */
  readonly actions?: ReactNode | undefined;
  readonly className?: string;
}

/**
 * Cabecera única de pantalla: título, descripción y acciones.
 *
 * Existe para que todas las pantallas se titulen igual; no acepta HTML
 * arbitrario en el título a propósito (el `h1` debe ser un texto).
 */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description !== undefined && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions !== undefined && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
