import { useCountriesCatalog } from '@/features/countries';
import { DashboardView } from '@/features/dashboard';

import { toUserMessage } from '@/core/http/problems';

/**
 * Contenedor del inicio.
 *
 * Vive en `app/` porque es el único lugar con permiso para componer **dos
 * features**: la de Países (que aporta los datos) y la del dashboard (que los
 * pinta). Así ninguna feature conoce a otra y el cálculo sigue siendo dominio
 * puro de la feature de dashboard.
 */
export function HomePage() {
  const catalog = useCountriesCatalog();

  return (
    <DashboardView
      countries={catalog.data?.countries ?? []}
      isPending={catalog.isPending}
      errorMessage={catalog.error === null ? null : toUserMessage(catalog.error)}
      onRetry={() => {
        void catalog.refetch();
      }}
    />
  );
}
