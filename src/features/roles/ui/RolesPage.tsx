import type { ColumnDef } from '@tanstack/react-table';
import { KeyRound, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { useHasPermission } from '@/core/auth/use-permission';
import { ApiError, toUserMessage } from '@/core/http/problems';
import { ACTIONS } from '@/core/rbac/actions';
import { RESOURCES } from '@/core/rbac/resources';
import { ConfirmDialog } from '@/shared/components/confirm-dialog';
import { DataTable } from '@/shared/components/data-table/data-table';
import { EmptyState } from '@/shared/components/empty-state';
import { PageHeader } from '@/shared/components/page-header';
import { TableRowAction } from '@/shared/components/table-row-action';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';

import { useDeleteRole } from '../api/mutations';
import { useRolesCatalog } from '../api/queries';
import type { Role } from '../domain/role';
import { RoleFormDialog } from './RoleFormDialog';
import { RolePermissionsDialog } from './RolePermissionsDialog';

const NO_ROLES: readonly Role[] = [];

type DialogState =
  | { readonly mode: 'create' }
  | { readonly mode: 'edit'; readonly role: Role }
  | { readonly mode: 'permissions'; readonly role: Role }
  | { readonly mode: 'delete'; readonly role: Role }
  | null;

/** Resumen legible del alcance de un rol. */
function summarize(role: Role): string {
  const resources = role.permissions.length;
  const actions = role.permissions.reduce(
    (total, permission) => total + permission.actions.length,
    0
  );

  if (resources === 0) {
    return 'Sin permisos';
  }

  return `${String(resources)} ${resources === 1 ? 'recurso' : 'recursos'} · ${String(actions)} ${actions === 1 ? 'acción' : 'acciones'}`;
}

/**
 * Listado de roles con acceso al editor de permisos.
 *
 * @remarks
 * Se sirve del **catálogo** de roles (ADR-019): son pocos y se necesitan
 * completos para el editor y para el multiselect de usuarios. Por eso aquí no
 * hay paginación de servidor: la tabla pagina en cliente sobre lo cargado.
 *
 * `isUnEditable` / `isUnDeletable` vienen del servidor y deshabilitan las
 * acciones del rol de sistema; la fila sigue visible.
 */
export function RolesPage() {
  const roles = useRolesCatalog();
  const remove = useDeleteRole();

  const canCreate = useHasPermission(RESOURCES.Role, [ACTIONS.Create]);
  const canUpdate = useHasPermission(RESOURCES.Role, [ACTIONS.Update]);
  const canDelete = useHasPermission(RESOURCES.Role, [ACTIONS.Delete]);

  const [dialog, setDialog] = useState<DialogState>(null);

  const closeDialog = useCallback(() => {
    setDialog(null);
  }, []);

  const data = roles.data ?? NO_ROLES;

  const columns = useMemo<ColumnDef<Role, unknown>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Rol',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="flex items-center gap-2 font-medium">
            {row.original.name}
            {row.original.isUnEditable && <Badge variant="neutral">Sistema</Badge>}
          </span>
        )
      },
      {
        id: 'permissions',
        header: 'Permisos',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{summarize(row.original)}</span>
        )
      },
      {
        id: 'actions',
        header: 'Acciones',
        enableSorting: false,
        cell: ({ row }) => {
          const role = row.original;

          return (
            <div className="flex items-center gap-0.5">
              <TableRowAction
                icon={KeyRound}
                tone="primary"
                label={`Ver permisos de ${role.name}`}
                onClick={() => {
                  setDialog({ mode: 'permissions', role });
                }}
              />

              {canUpdate && (
                <TableRowAction
                  icon={Pencil}
                  tone="primary"
                  label={`Renombrar ${role.name}`}
                  disabled={role.isUnEditable}
                  onClick={() => {
                    setDialog({ mode: 'edit', role });
                  }}
                />
              )}

              {canDelete && (
                <TableRowAction
                  icon={Trash2}
                  tone="danger"
                  label={`Eliminar ${role.name}`}
                  disabled={role.isUnDeletable}
                  onClick={() => {
                    setDialog({ mode: 'delete', role });
                  }}
                />
              )}
            </div>
          );
        }
      }
    ],
    [canDelete, canUpdate]
  );

  const errorMessage = roles.error === null ? null : toUserMessage(roles.error);
  const errorTraceId = roles.error instanceof ApiError ? roles.error.traceId : undefined;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Roles"
        description="Perfiles de permisos que se asignan a los usuarios."
        actions={
          canCreate ? (
            <Button
              onClick={() => {
                setDialog({ mode: 'create' });
              }}
            >
              <Plus aria-hidden="true" />
              Nuevo rol
            </Button>
          ) : undefined
        }
      />

      <div className="rounded-lg border border-border bg-card">
        <DataTable
          data={[...data]}
          columns={columns}
          caption="Listado de roles del sistema"
          getRowId={(role) => String(role.id)}
          sorting={[]}
          onSortToggle={() => undefined}
          pageIndex={0}
          pageSize={50}
          totalRows={data.length}
          onPageChange={() => undefined}
          onPageSizeChange={() => undefined}
          isPending={roles.isPending}
          errorMessage={errorMessage}
          errorTraceId={errorTraceId}
          onRetry={() => {
            void roles.refetch();
          }}
          emptyState={
            <EmptyState
              icon={ShieldCheck}
              title="No hay roles"
              description="Crea el primer rol para repartir permisos."
            />
          }
        />
      </div>

      {dialog?.mode === 'create' && (
        <RoleFormDialog mode="create" onClose={closeDialog} onSaved={closeDialog} />
      )}

      {dialog?.mode === 'edit' && (
        <RoleFormDialog
          mode="edit"
          role={dialog.role}
          onClose={closeDialog}
          onSaved={closeDialog}
        />
      )}

      {dialog?.mode === 'permissions' && (
        <RolePermissionsDialog role={dialog.role} onClose={closeDialog} />
      )}

      {dialog?.mode === 'delete' && (
        <ConfirmDialog
          title="Eliminar rol"
          description={`Se eliminará el rol «${dialog.role.name}». Los usuarios que lo tengan se quedarán sin esos permisos.`}
          confirmLabel="Eliminar rol"
          isPending={remove.isPending}
          onCancel={closeDialog}
          onConfirm={() => {
            remove.mutate({ id: dialog.role.id, name: dialog.role.name });
            closeDialog();
          }}
        />
      )}
    </div>
  );
}
