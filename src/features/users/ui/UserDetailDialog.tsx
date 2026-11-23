import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/shared/ui/dialog';

import type { User } from '../domain/user';

export interface UserDetailDialogProps {
  readonly user: User;
  readonly onClose: () => void;
}

/**
 * Detalle de un usuario.
 *
 * @remarks
 * Se sirve de la fila ya cargada: el listado devuelve los roles embebidos, así
 * que no hace falta un `GET` extra. Los indicadores `isUnEditable` /
 * `isUnDeletable` se muestran porque explican por qué ciertas acciones no están
 * disponibles.
 */
export function UserDetailDialog({ user, onClose }: UserDetailDialogProps) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Detalle del usuario</DialogTitle>
          <DialogDescription>{user.username}</DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-3 text-sm">
          <dt className="text-muted-foreground">Usuario</dt>
          <dd className="font-mono text-foreground">{user.username}</dd>

          <dt className="text-muted-foreground">Nombre</dt>
          <dd className="font-medium text-foreground">{user.fullName}</dd>

          <dt className="text-muted-foreground">Roles</dt>
          <dd className="text-foreground">
            {user.roles.length === 0 ? (
              <span className="text-muted-foreground">Sin roles</span>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {user.roles.map((role) => (
                  <li key={role.id}>{role.name}</li>
                ))}
              </ul>
            )}
          </dd>

          <dt className="text-muted-foreground">Protección</dt>
          <dd className="text-foreground">
            {user.isUnEditable && user.isUnDeletable
              ? 'No editable ni eliminable'
              : user.isUnEditable
                ? 'No editable'
                : user.isUnDeletable
                  ? 'No eliminable'
                  : 'Sin restricciones'}
          </dd>
        </dl>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
