import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

export interface EmptyStateProps {
  readonly title: string;
  readonly description?: string | undefined;
  /** Acción sugerida (crear el primer registro, limpiar filtros…). */
  readonly action?: ReactNode | undefined;
  readonly icon?: LucideIcon;
  readonly className?: string;
}

/**
 * Estado vacío con una salida.
 *
 * Regla de producto: un vacío sin acción es un callejón sin salida. Por eso el
 * componente exige `title` y ofrece `action`; el texto por defecto nunca es
 * «No hay datos».
 */
export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
  className
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 px-6 py-12 text-center',
        className
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description !== undefined && (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action !== undefined && <div className="mt-2">{action}</div>}
    </div>
  );
}
