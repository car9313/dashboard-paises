import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';

import { env } from '@/core/config/env';
import { resolveRedirectTarget } from '@/core/auth/redirect-target';
import { login } from '@/core/auth/session.service';
import { ApiError, toUserMessage } from '@/core/http/problems';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Escribe tu usuario'),
  password: z.string().min(1, 'Escribe tu contraseña')
});

type LoginValues = z.infer<typeof loginSchema>;

/**
 * Inicio de sesión.
 *
 * @remarks
 * - La validación vive en el esquema Zod; el mensaje del servidor se muestra en
 *   un `Alert` (no en un campo) porque un 401 no dice cuál credencial falló.
 * - Tras entrar se vuelve al destino original (`?redirect=`), validado contra
 *   redirecciones externas por `resolveRedirectTarget`.
 * - El formulario conserva lo escrito si el backend falla: perder el usuario
 *   tecleado es una fricción innecesaria.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: { username: '', password: '' }
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);

    try {
      await login({ username: values.username, password: values.password });
      navigate(resolveRedirectTarget(searchParams.get('redirect')), { replace: true });
    } catch (error) {
      // Un 401 en login no significa «sesión expirada»: es credencial inválida.
      setServerError(
        error instanceof ApiError && error.status === 401
          ? 'Usuario o contraseña incorrectos.'
          : toUserMessage(error)
      );
    }
  });

  const showDevHint = env.isDev && env.apiMode === 'mock';

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex size-10 items-center justify-center rounded-sm bg-primary text-sm font-bold text-primary-foreground">
            DP
          </span>
          <h1 className="text-lg font-semibold text-foreground">Inicia sesión</h1>
          <p className="text-sm text-muted-foreground">Accede al nomenclador de países.</p>
        </div>

        <form
          className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm"
          onSubmit={onSubmit}
          noValidate
          aria-busy={isSubmitting}
        >
          {serverError !== null && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-sm border border-danger/25 bg-danger-soft p-2.5 text-sm text-danger"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {serverError}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="username" required>
              Usuario
            </Label>
            <Input
              id="username"
              autoComplete="username"
              autoFocus
              disabled={isSubmitting}
              aria-invalid={errors.username !== undefined}
              aria-describedby={errors.username !== undefined ? 'username-error' : undefined}
              {...register('username')}
            />
            {errors.username?.message !== undefined && (
              <p id="username-error" role="alert" className="text-xs text-danger">
                {errors.username.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password" required>
              Contraseña
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              disabled={isSubmitting}
              aria-invalid={errors.password !== undefined}
              aria-describedby={errors.password !== undefined ? 'password-error' : undefined}
              {...register('password')}
            />
            {errors.password?.message !== undefined && (
              <p id="password-error" role="alert" className="text-xs text-danger">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button type="submit" loading={isSubmitting} className="mt-2">
            {isSubmitting ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>

        {showDevHint && (
          <p className="mt-4 rounded-sm border border-border bg-muted p-3 text-xs text-muted-foreground">
            Modo simulado. Usuarios de prueba: <code>admin</code> / <code>Admin123$</code> (todos
            los permisos), <code>consulta</code> / <code>Consulta123$</code> (solo lectura) y{' '}
            <code>sinautorizacion</code> / <code>SinAcceso123$</code> (sin acceso a nomencladores).
          </p>
        )}
      </div>
    </div>
  );
}
