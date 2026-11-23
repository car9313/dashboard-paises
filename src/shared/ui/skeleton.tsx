import type { ComponentProps } from 'react';

import { cn } from '@/shared/lib/cn';

/**
 * Marcador de carga con la forma del contenido final.
 *
 * @remarks
 * Con `prefers-reduced-motion` la animación se detiene por la regla global:
 * el bloque gris sigue comunicando «cargando» sin movimiento.
 */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-sm bg-muted', className)}
      {...props}
    />
  );
}
