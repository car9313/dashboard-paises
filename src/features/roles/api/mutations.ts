import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { toUserMessage } from '@/core/http/problems';
import { queryKeys } from '@/core/query/keys';

import type { ActionCommand, Role } from '../domain/role';
import { rolesRepository } from './repositories';

/**
 * Escrituras de roles.
 *
 * @remarks
 * Guardar permisos invalida también los del rol concreto: la siguiente apertura
 * del editor debe leer lo que quedó en el servidor, no lo de la caché anterior.
 *
 * Aviso deliberado en el toast: cambiar los permisos de un rol **no** refresca la
 * sesión de quien lo tiene activo. Se aplica en su próximo inicio de sesión o
 * restauración de sesión, y conviene que quien administra lo sepa.
 */

export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation<Role, Error, string>({
    mutationFn: (name) => rolesRepository.create(name),
    onSuccess: async (role) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
      toast.success(`Rol «${role.name}» creado.`);
    }
  });
}

export function useRenameRole() {
  const queryClient = useQueryClient();

  return useMutation<Role, Error, { readonly id: number; readonly name: string }>({
    mutationFn: ({ id, name }) => rolesRepository.rename(id, name),
    onSuccess: async (role) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success(`Rol renombrado a «${role.name}».`);
    }
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { readonly id: number; readonly name: string }>({
    mutationFn: ({ id }) => rolesRepository.remove(id),
    onSuccess: async (_data, { name }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success(`Rol «${name}» eliminado.`);
    },
    onError: (error) => {
      toast.error(toUserMessage(error));
    }
  });
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { readonly roleId: number; readonly actions: readonly ActionCommand[] }
  >({
    mutationFn: ({ roleId, actions }) => rolesRepository.updatePermissions(roleId, actions),
    onSuccess: async (_data, { roleId }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.roles.permissions(roleId) });
      toast.success('Permisos guardados. Se aplican en el próximo inicio de sesión del usuario.');
    },
    onError: (error) => {
      toast.error(toUserMessage(error));
    }
  });
}
