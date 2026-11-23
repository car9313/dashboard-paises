import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { toUserMessage } from '@/core/http/problems';
import { queryKeys } from '@/core/query/keys';

import {
  patchCountry,
  patchCountryActive,
  type Country,
  type CountryCatalog,
  type CountryInput
} from '../domain/country';
import { countriesRepository } from './repositories';

/**
 * Escrituras del nomenclador.
 *
 * @remarks
 * - **Invalidación, no parcheo manual**, salvo en el *toggle*: tras crear o
 *   editar, el servidor es la verdad y se recarga el catálogo.
 * - El *toggle* es **optimista con rollback**: el interruptor responde al
 *   instante y, si el backend falla, la fila vuelve a su estado anterior y se
 *   avisa. Es el equivalente de `createActiveToggle` del proyecto origen.
 * - Los errores de alta/edición **no** se notifican con toast: el diálogo los
 *   muestra en contexto (campo o alerta) y un toast simultáneo sería ruido.
 */

interface UpdateVariables {
  readonly code: string;
  readonly name: string;
}

export function useCreateCountry() {
  const queryClient = useQueryClient();

  return useMutation<Country, Error, CountryInput>({
    mutationFn: (input) => countriesRepository.create(input),
    onSuccess: async (country) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.countries.all });
      toast.success(`País «${country.name}» creado.`);
    }
  });
}

export function useUpdateCountry() {
  const queryClient = useQueryClient();

  return useMutation<Country, Error, UpdateVariables>({
    mutationFn: ({ code, name }) => countriesRepository.update(code, name),
    onSuccess: async (country) => {
      const cached = queryClient.getQueryData<CountryCatalog>(queryKeys.countries.catalog());

      // Parchea la fila antes de revalidar para que la tabla no parpadee.
      if (cached !== undefined) {
        queryClient.setQueryData(queryKeys.countries.catalog(), patchCountry(cached, country));
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.countries.all });
      toast.success(`País «${country.name}» actualizado.`);
    }
  });
}

interface ToggleVariables {
  readonly country: Country;
  readonly active: boolean;
}

interface ToggleContext {
  readonly previous: CountryCatalog | undefined;
}

/**
 * Activa o desactiva un país.
 *
 * @remarks
 * `onMutate` guarda el catálogo previo y aplica el cambio; `onError` restaura el
 * snapshot. `cancelQueries` evita que una revalidación en vuelo pise el valor
 * optimista.
 */
export function useToggleCountry() {
  const queryClient = useQueryClient();
  const catalogKey = queryKeys.countries.catalog();

  return useMutation<void, Error, ToggleVariables, ToggleContext>({
    mutationFn: ({ country, active }) => countriesRepository.setActive(country.code, active),

    onMutate: async ({ country, active }) => {
      await queryClient.cancelQueries({ queryKey: catalogKey });

      const previous = queryClient.getQueryData<CountryCatalog>(catalogKey);

      if (previous !== undefined) {
        queryClient.setQueryData(catalogKey, patchCountryActive(previous, country.code, active));
      }

      return { previous };
    },

    onError: (error, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(catalogKey, context.previous);
      }

      toast.error(toUserMessage(error));
    },

    onSuccess: (_data, { country, active }) => {
      toast.success(active ? `«${country.name}» activado.` : `«${country.name}» desactivado.`);
    },

    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.countries.all });
    }
  });
}
