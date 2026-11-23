import { Check, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useUiStore } from '@/core/ui/ui.store';

import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/shared/ui/dialog';

import { usePermissionsCatalog, useRolePermissions } from '../api/queries';
import { useUpdateRolePermissions } from '../api/mutations';
import type { Role } from '../domain/role';
import { RolePermissionsTree } from './RolePermissionsTree';
import { hasChanges, permissionKey, toActionCommands, toSelectedKeys } from './role-permissions';

export interface RolePermissionsDialogProps {
  readonly role: Role;
  readonly onClose: () => void;
}

/**
 * Editor de la matriz de permisos de un rol.
 *
 * @remarks
 * **Estado derivado, no sincronizado**: la selección inicial se calcula desde los
 * permisos del servidor y los clics viven en un mapa de *overrides*. Así no hace
 * falta un `useEffect` que copie datos remotos a estado local (ni el clásico bug
 * de «el diálogo se queda con los permisos del rol anterior»).
 *
 * El catálogo define **qué casillas existen**; los permisos del rol, cuáles están
 * marcadas. La matriz no inventa columnas: un recurso que solo admite `Leer`
 * muestra una sola casilla.
 */
export function RolePermissionsDialog({ role, onClose }: RolePermissionsDialogProps) {
  const catalog = usePermissionsCatalog();
  const assigned = useRolePermissions(role.id);
  const update = useUpdateRolePermissions();

  const [overrides, setOverrides] = useState<ReadonlyMap<string, boolean>>(new Map());

  const view = useUiStore((state) => state.permissionsView);
  const setView = useUiStore((state) => state.setPermissionsView);

  const initial = useMemo(() => toSelectedKeys(assigned.data ?? []), [assigned.data]);

  const selected = useMemo(() => {
    const next = new Set(initial);

    for (const [key, checked] of overrides) {
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
    }

    return next;
  }, [initial, overrides]);

  const readOnly = role.isUnEditable;
  const dirty = !readOnly && hasChanges(initial, selected);
  const loading = catalog.isPending || assigned.isPending;
  const saving = update.isPending;

  /**
   * La vista de árbol trabaja con el conjunto completo; se traduce a overrides
   * respecto a lo que hay en el servidor para mantener un único modelo de estado.
   */
  const replaceSelection = (next: ReadonlySet<string>) => {
    const changes = new Map<string, boolean>();

    for (const key of initial) {
      if (!next.has(key)) changes.set(key, false);
    }

    for (const key of next) {
      if (!initial.has(key)) changes.set(key, true);
    }

    setOverrides(changes);
  };

  const toggle = (key: string, checked: boolean) => {
    setOverrides((previous) => {
      const next = new Map(previous);
      next.set(key, checked);
      return next;
    });
  };

  const save = () => {
    update.mutate(
      { roleId: role.id, actions: toActionCommands(selected) },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <DialogContent
        className="max-h-[85vh] max-w-3xl overflow-y-auto"
        onEscapeKeyDown={(event) => {
          if (saving) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (saving) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{`Permisos de «${role.name}»`}</DialogTitle>
          <DialogDescription>
            {readOnly
              ? 'Este rol es del sistema: sus permisos se consultan pero no se editan.'
              : 'Marca las acciones que este rol concede. Los cambios se aplican en el próximo inicio de sesión de cada usuario con el rol.'}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-busy="true">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Cargando catálogo de permisos…
          </p>
        )}

        {!loading && catalog.data !== undefined && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <p className="text-xs text-subtle-foreground">
              {view === 'tree'
                ? 'Árbol: categoría, recurso y acción. Marcar un grupo propaga a sus acciones.'
                : 'Tabla: una fila por recurso y una columna por acción.'}
            </p>

            <label
              htmlFor="permissions-tree-view"
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <input
                id="permissions-tree-view"
                type="checkbox"
                className="size-4 accent-[var(--primary)]"
                checked={view === 'tree'}
                onChange={(event) => {
                  setView(event.target.checked ? 'tree' : 'table');
                }}
              />
              Vista de árbol
            </label>
          </div>
        )}

        {!loading && catalog.data !== undefined && view === 'tree' && (
          <RolePermissionsTree
            categories={catalog.data}
            selected={selected}
            onChange={replaceSelection}
            disabled={saving || readOnly}
          />
        )}

        {!loading && catalog.data !== undefined && view === 'table' && (
          <div className="flex flex-col gap-5">
            {catalog.data.map((category) => (
              <section key={category.category} className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-foreground">{category.category}</h3>

                <table className="w-full border-collapse text-sm">
                  <caption className="sr-only">{`Permisos de ${category.category}`}</caption>
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="border-b border-border px-2 py-1.5 text-left text-xs font-medium text-muted-foreground"
                      >
                        Recurso
                      </th>
                      {[
                        ...new Set(category.permissions.flatMap((permission) => permission.actions))
                      ].map((action) => (
                        <th
                          key={action}
                          scope="col"
                          className="border-b border-border px-2 py-1.5 text-center text-xs font-medium text-muted-foreground"
                        >
                          {action}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {category.permissions.map((permission) => {
                      const available = permission.actions;

                      return (
                        <tr
                          key={permission.resource}
                          className="border-b border-border last:border-b-0"
                        >
                          <th
                            scope="row"
                            className="px-2 py-2 text-left font-medium text-foreground"
                          >
                            {permission.description}
                            <span className="block font-mono text-[11px] font-normal text-subtle-foreground">
                              {permission.resource}
                            </span>
                          </th>

                          {[...new Set(category.permissions.flatMap((entry) => entry.actions))].map(
                            (action) => {
                              const key = permissionKey(permission.resource, action);
                              const isAvailable = available.includes(action);

                              return (
                                <td key={action} className="px-2 py-2 text-center">
                                  {isAvailable ? (
                                    <input
                                      type="checkbox"
                                      className="size-4 accent-[var(--primary)]"
                                      checked={selected.has(key)}
                                      disabled={saving || readOnly}
                                      aria-label={`${action} en ${permission.description}`}
                                      onChange={(event) => {
                                        toggle(key, event.target.checked);
                                      }}
                                    />
                                  ) : (
                                    <span className="text-subtle-foreground" aria-hidden="true">
                                      ·
                                    </span>
                                  )}
                                </td>
                              );
                            }
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            ))}
          </div>
        )}

        <DialogFooter>
          <span className="mr-auto text-xs text-subtle-foreground">
            {dirty ? 'Hay cambios sin guardar' : 'Sin cambios'}
          </span>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={save}
            loading={saving}
            disabled={!dirty || loading || readOnly}
          >
            <Check aria-hidden="true" />
            Guardar permisos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
