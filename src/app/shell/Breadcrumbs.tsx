import { ChevronRight } from 'lucide-react';
import { Link, useMatches } from 'react-router';

interface RouteHandle {
  readonly breadcrumb: string | undefined;
  readonly title: string | undefined;
}

/** Lee el `handle` de una ruta sin confiar en su forma (`unknown` → tipado). */
function readHandle(handle: unknown): RouteHandle {
  if (typeof handle !== 'object' || handle === null) {
    return { breadcrumb: undefined, title: undefined };
  }

  const record = handle as Record<string, unknown>;
  const breadcrumb = typeof record['breadcrumb'] === 'string' ? record['breadcrumb'] : undefined;
  const title = typeof record['title'] === 'string' ? record['title'] : undefined;

  return { breadcrumb, title };
}

/**
 * Migas de pan derivadas de las rutas activas.
 *
 * No hay estado propio: la jerarquía la declara cada ruta en `handle.breadcrumb`,
 * igual que el `data.breadcrumb` del proyecto origen.
 */
export function Breadcrumbs() {
  const matches = useMatches();

  const crumbs = matches
    .map((match) => ({ pathname: match.pathname, ...readHandle(match.handle) }))
    .filter((match) => match.breadcrumb !== undefined);

  if (crumbs.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Ruta de navegación" className="min-w-0">
      <ol className="flex items-center gap-1 text-sm text-muted-foreground">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <li key={crumb.pathname} className="flex min-w-0 items-center gap-1">
              {index > 0 && <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />}
              {isLast ? (
                <span aria-current="page" className="truncate font-medium text-foreground">
                  {crumb.breadcrumb}
                </span>
              ) : (
                <Link to={crumb.pathname} className="truncate hover:text-foreground">
                  {crumb.breadcrumb}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
