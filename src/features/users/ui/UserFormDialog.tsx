import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';

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

import { useRolesCatalog } from '@/features/roles';

import { useCreateUser, useUpdateUser } from '../api/mutations';
import type { User } from '../domain/user';
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserSubmit,
  type CreateUserValues,
  type UpdateUserSubmit,
  type UpdateUserValues
} from '../domain/schemas';

export interface UserFormDialogProps {
  readonly mode: 'create' | 'edit';
  readonly user?: User | undefined;
  readonly onClose: () => void;
  readonly onSaved: (user: User) => void;
}

/**
 * Alta y edición de usuarios.
 *
 * @remarks
 * - **Alta**: usuario, nombre, contraseña con confirmación y al menos un rol.
 * - **Edición**: el usuario no se edita (el backend no lo acepta) y la contraseña
 *   es opcional; vacía significa «no cambiarla».
 * - Los roles se cargan del catálogo cacheado de `roles` (ADR-020) y se eligen con
 *   casillas, que son accesibles con teclado sin inventar un multiselect.
 * - Un `409` se pinta en el campo que lo provoca (usuario duplicado) o en la
 *   alerta del diálogo si es una restricción del servidor.
 */
export function UserFormDialog({ mode, user, onClose, onSaved }: UserFormDialogProps) {
  const isEdit = mode === 'edit';
  const roles = useRolesCatalog();
  const create = useCreateUser();
  const update = useUpdateUser();

  const createForm = useForm<CreateUserValues, unknown, CreateUserSubmit>({
    resolver: zodResolver(createUserSchema),
    mode: 'onTouched',
    defaultValues: {
      username: '',
      fullName: '',
      password: '',
      passwordConfirmation: '',
      roleIds: []
    }
  });

  const editForm = useForm<UpdateUserValues, unknown, UpdateUserSubmit>({
    resolver: zodResolver(updateUserSchema),
    mode: 'onTouched',
    defaultValues: {
      fullName: user?.fullName ?? '',
      password: '',
      passwordConfirmation: '',
      roleIds: user?.roles.map((role) => role.id) ?? []
    }
  });

  const saving = isEdit ? editForm.formState.isSubmitting : createForm.formState.isSubmitting;

  const roleOptions = roles.data ?? [];

  const submitCreate = createForm.handleSubmit(async (values) => {
    try {
      const saved = await create.mutateAsync({
        username: values.username,
        fullName: values.fullName,
        password: values.password,
        passwordConfirmation: values.passwordConfirmation,
        roleIds: values.roleIds
      });
      onSaved(saved);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        createForm.setError(
          'username',
          { type: 'server', message: 'Ese usuario ya existe.' },
          { shouldFocus: true }
        );
        return;
      }
      createForm.setError('root', { type: 'server', message: toUserMessage(error) });
    }
  });

  const submitEdit = editForm.handleSubmit(async (values) => {
    if (user === undefined) {
      return;
    }

    try {
      const saved = await update.mutateAsync({
        id: user.id,
        fullName: values.fullName,
        password: values.password,
        passwordConfirmation: values.passwordConfirmation,
        roleIds: values.roleIds
      });
      onSaved(saved);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        editForm.setError('root', {
          type: 'server',
          message: 'El servidor rechazó el cambio: el usuario está protegido.'
        });
        return;
      }
      editForm.setError('root', { type: 'server', message: toUserMessage(error) });
    }
  });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) {
          onClose();
        }
      }}
    >
      <DialogContent
        className="max-w-lg"
        onEscapeKeyDown={(event) => {
          if (saving) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (saving) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'El nombre de usuario no se puede cambiar.'
              : 'La contraseña debe tener al menos 8 caracteres, con mayúscula, minúscula, número y símbolo.'}
          </DialogDescription>
        </DialogHeader>

        {isEdit ? (
          <form className="flex flex-col gap-4" onSubmit={submitEdit} noValidate aria-busy={saving}>
            {editForm.formState.errors.root?.message !== undefined && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-sm border border-danger/25 bg-danger-soft p-2.5 text-sm text-danger"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {editForm.formState.errors.root.message}
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="user-username">Usuario</Label>
              <Input id="user-username" value={user?.username ?? ''} readOnly disabled />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="user-fullname" required>
                Nombre completo
              </Label>
              <Input
                id="user-fullname"
                autoComplete="off"
                autoFocus
                disabled={saving}
                aria-invalid={editForm.formState.errors.fullName !== undefined}
                aria-describedby={
                  editForm.formState.errors.fullName !== undefined
                    ? 'user-fullname-error'
                    : undefined
                }
                {...editForm.register('fullName')}
              />
              {editForm.formState.errors.fullName?.message !== undefined && (
                <p id="user-fullname-error" role="alert" className="text-xs text-danger">
                  {editForm.formState.errors.fullName.message}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="user-password">Contraseña</Label>
                <Input
                  id="user-password"
                  type="password"
                  autoComplete="new-password"
                  disabled={saving}
                  placeholder="Sin cambios"
                  aria-invalid={editForm.formState.errors.password !== undefined}
                  {...editForm.register('password')}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="user-password-confirmation">Confirmar contraseña</Label>
                <Input
                  id="user-password-confirmation"
                  type="password"
                  autoComplete="new-password"
                  disabled={saving}
                  aria-invalid={editForm.formState.errors.passwordConfirmation !== undefined}
                  {...editForm.register('passwordConfirmation')}
                />
              </div>
            </div>

            {editForm.formState.errors.password?.message !== undefined && (
              <p role="alert" className="text-xs text-danger">
                {editForm.formState.errors.password.message}
              </p>
            )}
            {editForm.formState.errors.passwordConfirmation?.message !== undefined && (
              <p role="alert" className="text-xs text-danger">
                {editForm.formState.errors.passwordConfirmation.message}
              </p>
            )}

            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium text-foreground">Roles</legend>
              {roleOptions.length === 0 && (
                <p className="text-xs text-muted-foreground">Cargando roles…</p>
              )}
              {roleOptions.map((role) => (
                <label key={role.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" value={role.id} {...editForm.register('roleIds')} />
                  {role.name}
                </label>
              ))}
              {editForm.formState.errors.roleIds?.message !== undefined && (
                <p role="alert" className="text-xs text-danger">
                  {editForm.formState.errors.roleIds.message}
                </p>
              )}
            </fieldset>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={submitCreate}
            noValidate
            aria-busy={saving}
          >
            {createForm.formState.errors.root?.message !== undefined && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-sm border border-danger/25 bg-danger-soft p-2.5 text-sm text-danger"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {createForm.formState.errors.root.message}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="user-username" required>
                  Usuario
                </Label>
                <Input
                  id="user-username"
                  autoComplete="off"
                  autoFocus
                  disabled={saving}
                  aria-invalid={createForm.formState.errors.username !== undefined}
                  aria-describedby={
                    createForm.formState.errors.username !== undefined
                      ? 'user-username-error'
                      : undefined
                  }
                  {...createForm.register('username')}
                />
                {createForm.formState.errors.username?.message !== undefined && (
                  <p id="user-username-error" role="alert" className="text-xs text-danger">
                    {createForm.formState.errors.username.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="user-fullname" required>
                  Nombre completo
                </Label>
                <Input
                  id="user-fullname"
                  autoComplete="off"
                  disabled={saving}
                  aria-invalid={createForm.formState.errors.fullName !== undefined}
                  {...createForm.register('fullName')}
                />
                {createForm.formState.errors.fullName?.message !== undefined && (
                  <p role="alert" className="text-xs text-danger">
                    {createForm.formState.errors.fullName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="user-password" required>
                  Contraseña
                </Label>
                <Input
                  id="user-password"
                  type="password"
                  autoComplete="new-password"
                  disabled={saving}
                  aria-invalid={createForm.formState.errors.password !== undefined}
                  {...createForm.register('password')}
                />
                {createForm.formState.errors.password?.message !== undefined && (
                  <p role="alert" className="text-xs text-danger">
                    {createForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="user-password-confirmation" required>
                  Confirmar contraseña
                </Label>
                <Input
                  id="user-password-confirmation"
                  type="password"
                  autoComplete="new-password"
                  disabled={saving}
                  aria-invalid={createForm.formState.errors.passwordConfirmation !== undefined}
                  {...createForm.register('passwordConfirmation')}
                />
                {createForm.formState.errors.passwordConfirmation?.message !== undefined && (
                  <p role="alert" className="text-xs text-danger">
                    {createForm.formState.errors.passwordConfirmation.message}
                  </p>
                )}
              </div>
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium text-foreground">
                Roles <span aria-hidden="true">*</span>
              </legend>
              {roleOptions.length === 0 && (
                <p className="text-xs text-muted-foreground">Cargando roles…</p>
              )}
              {roleOptions.map((role) => (
                <label key={role.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" value={role.id} {...createForm.register('roleIds')} />
                  {role.name}
                </label>
              ))}
              {createForm.formState.errors.roleIds?.message !== undefined && (
                <p role="alert" className="text-xs text-danger">
                  {createForm.formState.errors.roleIds.message}
                </p>
              )}
            </fieldset>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                Crear usuario
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
