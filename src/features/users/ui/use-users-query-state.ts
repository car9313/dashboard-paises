import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { z } from 'zod';

/**
 * Estado de la lista de usuarios: **paginación de servidor** en la URL.
 *
 * @remarks
 * A diferencia de Países (ADR-013), aquí no hay catálogo completo: el backend
 * pagina de verdad con `Pag.Page`/`Pag.PageSize` (ADR-019). La búsqueda no está
 * en la URL porque no puede delegarse al servidor (BE-001).
 *
 * Los valores inválidos se corrigen (`.catch`): una URL editada a mano no deja
 * la pantalla en blanco.
 */

export const USERS_DEFAULT_PAGE_SIZE = 10;
export const USERS_PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

const querySchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  size: z.coerce
    .number()
    .int()
    .refine((value) => (USERS_PAGE_SIZE_OPTIONS as readonly number[]).includes(value))
    .catch(USERS_DEFAULT_PAGE_SIZE)
});

export type UsersQueryState = z.infer<typeof querySchema>;

export interface UsersQueryActions {
  readonly state: UsersQueryState;
  setPage: (page: number) => void;
  setSize: (size: number) => void;
}

function toSearchParams(state: UsersQueryState): URLSearchParams {
  const params = new URLSearchParams();

  if (state.page !== 1) params.set('page', String(state.page));
  if (state.size !== USERS_DEFAULT_PAGE_SIZE) params.set('size', String(state.size));

  return params;
}

export function useUsersQueryState(): UsersQueryActions {
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo(
    () => querySchema.parse(Object.fromEntries(searchParams.entries())),
    [searchParams]
  );

  const update = useCallback(
    (patch: Partial<UsersQueryState>) => {
      setSearchParams(toSearchParams({ ...state, ...patch }), { replace: false });
    },
    [state, setSearchParams]
  );

  return {
    state,
    setPage: (page) => {
      if (page !== state.page) update({ page: Math.max(1, page) });
    },
    setSize: (size) => {
      if (size !== state.size) update({ size, page: 1 });
    }
  };
}
