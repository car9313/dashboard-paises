import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';

import { Button } from '@/shared/ui/button';

/**
 * Pantalla de acceso denegado (capa 2 del RBAC: la ruta exige un permiso).
 *
 * @remarks
 * No es un 401: la sesión es válida y el usuario existe, lo que falta es el
 * permiso. Por eso no se ofrece «iniciar sesión» sino volver al inicio.
 */
export function AccessDeniedPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
      <p className="text-4xl font-semibold text-muted-foreground">403</p>
      <h1 className="text-lg font-semibold text-foreground">Acceso denegado</h1>
      <p className="text-sm text-muted-foreground">
        Tu usuario no tiene permisos para esta pantalla. Si crees que es un error, contacta al
        administrador.
      </p>
      <Button asChild variant="secondary" className="mt-2">
        <Link to="/">
          <ArrowLeft aria-hidden="true" />
          Volver al inicio
        </Link>
      </Button>
    </div>
  );
}
