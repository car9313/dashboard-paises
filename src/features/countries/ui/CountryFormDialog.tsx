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

import type { Country } from '../domain/country';
import { countryInputSchema, type CountryInputValues } from '../domain/schemas';
import { useCreateCountry, useUpdateCountry } from '../api/mutations';

type FormValues = CountryInputValues;

export interface CountryFormDialogProps {
  readonly mode: 'create' | 'edit';
  /** Obligatorio en `edit`; el código se muestra bloqueado. */
  readonly country?: Country | undefined;
  readonly onClose: () => void;
  readonly onSaved: (country: Country) => void;
}

/**
 * Alta y edición de un país.
 *
 * @remarks
 * - Un solo formulario para los dos modos: en edición el `code` se muestra
 *   bloqueado porque el backend solo acepta `name` (`UpdateCountryCommand`).
 *   La mutación usa el código original, nunca el del input.
 * - La validación vive en el esquema Zod compartido con el dominio, así que el
 *   mensaje que ve el usuario es el mismo que se prueba.
 * - Un `409` se pinta **en el campo `code`**: el usuario necesita saber qué
 *   corregir, no un mensaje genérico de conflicto.
 * - Mientras guarda, el diálogo no se puede cerrar (ni con Escape ni clic
 *   fuera): perder los datos a medio guardar es peor que esperar.
 */
export function CountryFormDialog({ mode, country, onClose, onSaved }: CountryFormDialogProps) {
  const isEdit = mode === 'edit';
  const create = useCreateCountry();
  const update = useUpdateCountry();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(countryInputSchema),
    mode: 'onTouched',
    defaultValues:
      isEdit && country !== undefined
        ? { code: country.code, name: country.name }
        : { code: '', name: '' }
  });

  const saving = isSubmitting;

  const submit = handleSubmit(async (values) => {
    try {
      const saved =
        isEdit && country !== undefined
          ? await update.mutateAsync({ code: country.code, name: values.name })
          : await create.mutateAsync({ code: values.code, name: values.name });

      onSaved(saved);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setError(
          'code',
          { type: 'server', message: 'Ese código ya existe. Usa otro.' },
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
        if (!open && !saving) {
          onClose();
        }
      }}
    >
      <DialogContent
        onEscapeKeyDown={(event) => {
          if (saving) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (saving) event.preventDefault();
        }}
        aria-describedby="country-form-description"
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar país' : 'Nuevo país'}</DialogTitle>
          <DialogDescription id="country-form-description">
            {isEdit
              ? 'El código identifica al país y no se puede cambiar.'
              : 'El código ISO de dos letras identifica al país y no se podrá cambiar después.'}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={submit} noValidate aria-busy={saving}>
          {errors.root?.message !== undefined && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-sm border border-danger/25 bg-danger-soft p-2.5 text-sm text-danger"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {errors.root.message}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="country-code" required={!isEdit}>
              Código
            </Label>
            <Input
              id="country-code"
              maxLength={2}
              autoComplete="off"
              autoFocus={!isEdit}
              readOnly={isEdit}
              disabled={saving}
              className="w-24 font-mono uppercase"
              aria-invalid={errors.code !== undefined}
              aria-describedby={errors.code !== undefined ? 'country-code-error' : undefined}
              {...register('code')}
            />
            {isEdit ? (
              <p className="text-xs text-muted-foreground">El código no se puede modificar.</p>
            ) : (
              <p className="text-xs text-muted-foreground">Dos letras, por ejemplo CU.</p>
            )}
            {errors.code?.message !== undefined && (
              <p id="country-code-error" role="alert" className="text-xs text-danger">
                {errors.code.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="country-name" required>
              Nombre
            </Label>
            <Input
              id="country-name"
              autoComplete="off"
              autoFocus={isEdit}
              disabled={saving}
              aria-invalid={errors.name !== undefined}
              aria-describedby={errors.name !== undefined ? 'country-name-error' : undefined}
              {...register('name')}
            />
            {errors.name?.message !== undefined && (
              <p id="country-name-error" role="alert" className="text-xs text-danger">
                {errors.name.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {isEdit ? 'Guardar cambios' : 'Crear país'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
