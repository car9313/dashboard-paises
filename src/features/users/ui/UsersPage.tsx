import type { ColumnDef } from '@tanstack/react-table';
import { Eye, KeyRound, Pencil, Plus, SearchX, Trash2, UsersRound } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { useHasPermission } from '@/core/auth/use-permission';
import { ApiError, toUserMessage } from '@/core/http/problems';
import { ACTIONS } from '@/core/rbac/actions';
import { RESOURCES } from '@/core/rbac/resources';
import { ConfirmDialog } from '@/shared/components/confirm-dialog';
import { DataTable } from '@/shared/components/data-table/data-table';
import { EmptyState } from '@/shared/components/empty-state';
import { PageHeader } from '@/shared/components/page-header';
import { SearchInput } from '@/shared/components/search-input';
import { TableRowAction } from '@/shared/components/table-row-action';
import { Button } from '@/shared/ui/button';

import { useDeleteUser, useResetUserPassword } from '../api/mutations';
import { useUsersPage } from '../api/queries';
import { formatRoles, type User } from '../domain/user';
import { UserDetailDialog } from './UserDetailDialog';
import { UserFormDialog } from './UserFormDialog';
import { useUsersQueryState } from './use-users-query-state';

const NO_USERS: readonly User[] = [];

type DialogState =
  | { readonly mode: 'create' }
  | { readonly mode: 'edit'; readonly user: User }
  | { readonly mode: 'detail'; readonly user: User }
  | { readonly mode: 'delete'; readonly user: User }
  | null;

/**
 * Listado de usuarios del sistema.
 *
 * @remarks
 * **Paginación de servidor** (`Pag.Page`), no catálogo: a diferencia de Países,
 * aquí el backend pagina de verdad y el volumen puede crecer.
 *
 * La búsqueda se aplica **en cliente sobre la página cargada**, porque
 * `Search.SearchText` devuelve 500 en este backend (BE-001). La interfaz lo dice
 * en lugar de fingir que busca en todo el conjunto.
 *
 * Las acciones se ofrecen según permisos **y** según los indicadores del
 * servidor (`isUnEditable` / `isUnDeletable`): la fila sigue visible para no
 * descuadrar el total, pero sus botones se deshabilitan.
 */
export function UsersPage() {
  const { state, setPage, setSize } = useUsersQueryState();
  const page = useUsersPage(state.page, state.size);

  const canCreate = useHasPermission(RESOURCES.User, [ACTIONS.Create]);
  const canUpdate = useHasPermission(RESOURCES.User, [ACTIONS.Update]);
  const canDelete = useHasPermission(RESOURCES.User, [ACTIONS.Delete]);

  const remove = useDeleteUser();
  const resetPassword = useResetUserPassword();

  const [dialog, setDialog] = useState<DialogState>(null);
  const [filter, setFilter] = useState('');

  const users = page.data?.users ?? NO_USERS;
  const totalCount = page.data?.meta.totalCount ?? 0;

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();

    if (needle.length === 0) {
      return [...users];
    }

    return users.filter(
      (user) =>
        user.username.toLowerCase().includes(needle) || user.fullName.toLowerCase().includes(needle)
    );
  }, [users, filter]);

  const closeDialog = useCallback(() => {
    setDialog(null);
  }, []);

  const columns = useMemo<ColumnDef<User, unknown>[]>(
    () => [
      {
        id: 'username',
        accessorKey: 'username',
        header: 'Usuario',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-mono text-[13px] text-foreground">{row.original.username}</span>
        )
      },
      {
        id: 'fullName',
        accessorKey: 'fullName',
        header: 'Nombre completo',
        enableSorting: false,
        cell: ({ row }) => <span className="font-medium">{row.original.fullName}</span>
      },
      {
        id: 'roles',
        header: 'Roles',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{formatRoles(row.original)}</span>
        )
      },
      {
        id: 'actions',
        header: 'Acciones',
        enableSorting: false,
        cell: ({ row }) => {
          const user = row.original;

          return (
            <div className="flex items-center gap-0.5">
              <TableRowAction
                icon={Eye}
                label={`Ver ${user.username}`}
                onClick={() => {
                  setDialog({ mode: 'detail', user });
                }}
              />

              {canUpdate && (
                <TableRowAction
                  icon={Pencil}
                  tone="primary"
                  label={`Editar ${user.username}`}
                  disabled={user.isUnEditable}
                  onClick={() => {
                    setDialog({ mode: 'edit', user });
                  }}
                />
              )}

              {canUpdate && (
                <TableRowAction
                  icon={KeyRound}
                  tone="primary"
                  label={`Restablecer contraseña de ${user.username}`}
                  disabled={user.isUnEditable}
                  onClick={() => {
                    resetPassword.mutate({ id: user.id, username: user.username });
                  }}
                />
              )}

              {canDelete && (
                <TableRowAction
                  icon={Trash2}
                  tone="danger"
                  label={`Eliminar ${user.username}`}
                  disabled={user.isUnDeletable}
                  onClick={() => {
                    setDialog({ mode: 'delete', user });
                  }}
                />
              )}
            </div>
          );
        }
      }
    ],
    [canDelete, canUpdate, resetPassword]
  );

  const errorMessage = page.error === null ? null : toUserMessage(page.error);
  const errorTraceId = page.error instanceof ApiError ? page.error.traceId : undefined;

  const emptyState =
    filter.length > 0 ? (
      <EmptyState
        icon={SearchX}
        title="Ningún usuario coincide"
        description={`No hay resultados para «${filter}» en esta página.`}
        action={
          <Button variant="secondary" size="sm" onClick={() => setFilter('')}>
            Limpiar búsqueda
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={UsersRound}
        title="No hay usuarios"
        description="Crea el primer usuario del sistema."
      />
    );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Usuarios"
        description="Cuentas del sistema y los roles que tienen asignados."
        actions={
          canCreate ? (
            <Button
              onClick={() => {
                setDialog({ mode: 'create' });
              }}
            >
              <Plus aria-hidden="true" />
              Nuevo usuario
            </Button>
          ) : undefined
        }
      />

      <div className="rounded-lg border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center">
            <SearchInput
              value={filter}
              onChange={setFilter}
              label="Buscar usuario"
              placeholder="Buscar por usuario o nombre…"
              className="w-full sm:max-w-xs"
            />
            <p className="text-xs text-subtle-foreground">
              Busca en la página actual: el servidor no admite búsqueda.
            </p>
          </div>

          <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
            {`${String(totalCount)} usuarios`}
          </p>
        </div>

        <DataTable
          data={visible}
          columns={columns}
          caption="Listado de usuarios del sistema"
          getRowId={(user) => String(user.id)}
          sorting={[]}
          onSortToggle={() => undefined}
          pageIndex={state.page - 1}
          pageSize={state.size}
          totalRows={totalCount}
          onPageChange={(index) => {
            setPage(index + 1);
          }}
          onPageSizeChange={setSize}
          isPending={page.isPending}
          errorMessage={errorMessage}
          errorTraceId={errorTraceId}
          onRetry={() => {
            void page.refetch();
          }}
          emptyState={emptyState}
        />
      </div>

      {dialog?.mode === 'create' && (
        <UserFormDialog mode="create" onClose={closeDialog} onSaved={closeDialog} />
      )}

      {dialog?.mode === 'edit' && (
        <UserFormDialog
          mode="edit"
          user={dialog.user}
          onClose={closeDialog}
          onSaved={closeDialog}
        />
      )}

      {dialog?.mode === 'detail' && <UserDetailDialog user={dialog.user} onClose={closeDialog} />}

      {dialog?.mode === 'delete' && (
        <ConfirmDialog
          title="Eliminar usuario"
          description={`Se eliminará la cuenta «${dialog.user.username}» y no podrá volver a iniciar sesión.`}
          confirmLabel="Eliminar usuario"
          isPending={remove.isPending}
          onCancel={closeDialog}
          onConfirm={() => {
            remove.mutate({ id: dialog.user.id, username: dialog.user.username });
            closeDialog();
          }}
        />
      )}
    </div>
  );
}
