import { AlertTriangle } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/shared/ui/dialog';

export interface ConfirmDialogProps {
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly isPending?: boolean;
  /** Tono del botón de confirmación; `danger` para acciones destructivas. */
  readonly tone?: 'danger' | 'primary';
}

/**
 * Confirmación de una acción destructiva.
 *
 * @remarks
 * No usa `window.confirm`: bloquea el hilo, no se puede estilar y no respeta el
 * tema. El texto de confirmación nombra la acción concreta («Eliminar a Marta»),
 * no «Aceptar», para que el usuario sepa qué está autorizando.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  isPending = false,
  tone = 'danger'
}: ConfirmDialogProps) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isPending) {
          onCancel();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <p className="flex items-start gap-2 rounded-sm border border-danger/25 bg-danger-soft p-2.5 text-sm text-danger">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Esta acción no se puede deshacer.
        </p>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant={tone === 'danger' ? 'danger' : 'primary'}
            loading={isPending}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
