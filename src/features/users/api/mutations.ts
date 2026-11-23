import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { toUserMessage } from '@/core/http/problems';
import { queryKeys } from '@/core/query/keys';

import type { CreateUserInput, UpdateUserInput, User } from '../domain/user';
import { usersRepository } from './repositories';

/**
 * Escrituras de usuarios.
 *
 * @remarks
 * Los errores de alta y edición **no** se notifican con toast: el diálogo los
 * muestra en contexto (campo o alerta). Solo el borrado y el restablecimiento de
 * contraseña, que no tienen formulario, usan toast.
 */

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation<User, Error, CreateUserInput>({
    mutationFn: (input) => usersRepository.create(input),
    onSuccess: async (user) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success(`Usuario «${user.username}» creado.`);
    }
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation<User, Error, UpdateUserInput>({
    mutationFn: (input) => usersRepository.update(input),
    onSuccess: async (user) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success(`Usuario «${user.username}» actualizado.`);
    }
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { readonly id: number; readonly username: string }>({
    mutationFn: ({ id }) => usersRepository.remove(id),
    onSuccess: async (_data, { username }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success(`Usuario «${username}» eliminado.`);
    },
    onError: (error) => {
      toast.error(toUserMessage(error));
    }
  });
}

export function useResetUserPassword() {
  const queryClient = useQueryClient();

  return useMutation<string | null, Error, { readonly id: number; readonly username: string }>({
    mutationFn: ({ id }) => usersRepository.resetPassword(id),
    onSuccess: async (temporary, { username }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success(
        temporary === null
          ? `Contraseña de «${username}» restablecida.`
          : `Contraseña temporal de «${username}»: ${temporary}`
      );
    },
    onError: (error) => {
      toast.error(toUserMessage(error));
    }
  });
}
