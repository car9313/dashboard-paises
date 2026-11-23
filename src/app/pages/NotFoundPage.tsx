import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';

import { Button } from '@/shared/ui/button';

/** Última red del router: la ruta no existe. */
export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
      <p className="text-4xl font-semibold text-muted-foreground">404</p>
      <h1 className="text-lg font-semibold text-foreground">Página no encontrada</h1>
      <p className="text-sm text-muted-foreground">
        La dirección que abriste no existe o cambió de lugar.
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
