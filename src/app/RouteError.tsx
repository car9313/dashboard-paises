import { isRouteErrorResponse, useRouteError } from 'react-router';

import { Button } from '@/shared/ui/button';

/**
 * Frontera de error de las rutas.
 *
 * React Router la monta cuando un `loader` o el render de una ruta lanzan. Es el
 * último recurso: los errores esperables (red, 404, permisos) se tratan con
 * `ContentState` dentro de cada pantalla.
 */
export function RouteError() {
  const error = useRouteError();

  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Error inesperado';

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
      <h1 className="text-lg font-semibold text-foreground">Algo salió mal</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button variant="secondary" onClick={() => window.location.reload()}>
        Recargar
      </Button>
    </div>
  );
}
