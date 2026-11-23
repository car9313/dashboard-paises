import { AlertTriangle, RotateCw } from 'lucide-react';

import { Button } from '@/shared/ui/button';

export interface ErrorStateProps {
  readonly message: string;
  readonly onRetry?: (() => void) | undefined;
  /** Identificador de traza del backend, útil para soporte. */
  readonly traceId?: string | undefined;
  readonly className?: string;
}

/**
 * Estado de error con salida.
 *
 * Regla: un error nunca deja al usuario sin acción. Si hay `onRetry`, se ofrece
 * «Reintentar»; el `traceId` se muestra en pequeño para poder reportarlo.
 */
export function ErrorState({ message, onRetry, traceId, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center gap-2 px-6 py-10 text-center ${className ?? ''}`}
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </span>
      <p className="text-sm font-medium text-foreground">No se pudieron cargar los datos</p>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      {onRetry !== undefined && (
        <Button variant="secondary" size="sm" className="mt-2" onClick={onRetry}>
          <RotateCw aria-hidden="true" />
          Reintentar
        </Button>
      )}
      {traceId !== undefined && (
        <p className="mt-1 font-mono text-[11px] text-subtle-foreground">traza: {traceId}</p>
      )}
    </div>
  );
}
