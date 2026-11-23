import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ApiError, toUserMessage } from '@/core/http/problems';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

import { useCreateRole, useRenameRole } from '../api/mutations';
import type { Role } from '../domain/role';

const roleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(60, 'El nombre no puede pasar de 60 caracteres')
});

type RoleValues = z.infer<typeof roleSchema>;

export interface RoleFormDialogProps {
  readonly mode: 'create' | 'edit';
  readonly role?: Role | undefined;
  readonly onClose: () => void;
  readonly onSaved: (role: Role) => void;
}

/**
 * Alta y renombrado de roles.
 *
 * @remarks
 * Los permisos **no** se editan aquí: son otro recurso y se guardan aparte con
 * `PUT /api/roles/{id}/permissions` (ADR-019). Separarlo evita mandar un payload
 * grande en un renombrado.
 */
export function RoleFormDialog({ mode, role, onClose, onSaved }: RoleFormDialogProps) {
  const isEdit = mode === 'edit';
  const create = useCreateRole();
  const rename = useRenameRole();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting }
  } = useForm<RoleValues>({
    resolver: zodResolver(roleSchema),
    mode: 'onTouched',
    defaultValues: { name: role?.name ?? '' }
  });

  const saving = isSubmitting;

  const submit = handleSubmit(async (values) => {
    try {
      const saved =
        isEdit && role !== undefined
          ? await rename.mutateAsync({ id: role.id, name: values.name })
          : await create.mutateAsync(values.name);

      onSaved(saved);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setError(
          'name',
          { type: 'server', message: 'Ya existe un rol con ese nombre.' },
          { shouldFocus: true }
        );
        return;
      }

      setError('root', { type: 'server', message: toUserMessage(error) });
    }
  });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <DialogContent
        className="max-w-md"
        onEscapeKeyDown={(event) => {
          if (saving) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (saving) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Renombrar rol' : 'Nuevo rol'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Cambiar el nombre no altera los permisos ya asignados.'
              : 'Después de crearlo podrás asignarle permisos.'}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={submit} noValidate aria-busy={saving}>
          {errors.root?.message !== undefined && (
            <p
              role="alert"
              className="rounded-sm border border-danger/25 bg-danger-soft p-2.5 text-sm text-danger"
            >
              {errors.root.message}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role-name" required>
              Nombre del rol
            </Label>
            <Input
              id="role-name"
              autoComplete="off"
              autoFocus
              disabled={saving}
              aria-invalid={errors.name !== undefined}
              aria-describedby={errors.name !== undefined ? 'role-name-error' : undefined}
              {...register('name')}
            />
            {errors.name?.message !== undefined && (
              <p id="role-name-error" role="alert" className="text-xs text-danger">
                {errors.name.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {isEdit ? 'Guardar nombre' : 'Crear rol'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
