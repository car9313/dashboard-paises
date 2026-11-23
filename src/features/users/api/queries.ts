import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/core/query/keys';

import type { UserPage } from '../domain/user';
import { usersRepository } from './repositories';

/**
 * Página de usuarios.
 *
 * @remarks
 * `placeholderData: keepPreviousData` mantiene las filas anteriores mientras
 * llega la siguiente página: sin eso, cada cambio de página vacía la tabla y
 * provoca un salto de layout.
 *
 * El tamaño de página es parte de la clave porque el backend pagina de verdad;
 * mezclar dos tamaños en la misma entrada devolvería filas de otra página.
 */
export function useUsersPage(page: number, pageSize: number) {
  return useQuery<UserPage>({
    queryKey: queryKeys.users.list(page, pageSize),
    queryFn: ({ signal }) => usersRepository.list({ page, pageSize }, signal),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000
  });
}
