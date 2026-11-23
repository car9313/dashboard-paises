import { ChevronRight, FolderTree, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';

import { cn } from '@/shared/lib/cn';
import { TriStateCheckbox } from '@/shared/ui/tri-state-checkbox';

import type { PermissionCategory } from '../domain/role';
import {
  applyGroup,
  buildTree,
  keysOfCategory,
  keysOfResource,
  stateOf,
  type CheckState,
  type TreeCategoryNode
} from './permissions-tree';

export interface RolePermissionsTreeProps {
  readonly categories: readonly PermissionCategory[];
  readonly selected: ReadonlySet<string>;
  readonly onChange: (next: ReadonlySet<string>) => void;
  readonly disabled?: boolean;
}

/** Cuántas de las acciones de un grupo están marcadas. */
function grantedOf(selected: ReadonlySet<string>, keys: readonly string[]): number {
  let granted = 0;

  for (const key of keys) {
    if (selected.has(key)) granted += 1;
  }

  return granted;
}

/**
 * Vista de árbol de los permisos: **categoría → recurso → acción**.
 *
 * @remarks
 * Replica el comportamiento del `p-tree` del proyecto origen
 * (`propagateSelectionUp` / `propagateSelectionDown`): marcar un grupo marca sus
 * acciones y desmarcar una hoja deja el padre **indeterminado**, estado que se
 * deriva del conjunto de hojas y nunca se almacena aparte.
 *
 * Detalles de presentación que importan:
 * - La apertura se anima con `grid-template-rows: 0fr → 1fr`, que funciona sin
 *   medir alturas ni leer el DOM, y se desactiva con `prefers-reduced-motion`.
 * - El chevron **rota** en lugar de intercambiarse: un solo icono, una sola
 *   transición.
 * - El contenido cerrado queda `inert`: sigue en el DOM para animar, pero no
 *   recibe foco ni clics. Sin esto, `Tab` entraría en casillas invisibles.
 * - Accesibilidad: no se finge `role="tree"` (exigiría implementar las teclas de
 *   flechas). Cada grupo es un botón con `aria-expanded`/`aria-controls` y las
 *   casillas son reales, así que `Tab` y `Espacio` funcionan como en un formulario.
 */
export function RolePermissionsTree({
  categories,
  selected,
  onChange,
  disabled = false
}: RolePermissionsTreeProps) {
  const tree = useMemo(() => buildTree(categories), [categories]);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  const toggleCollapsed = (id: string) => {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-2.5">
      {tree.map((category) => (
        <CategoryBranch
          key={category.category}
          category={category}
          selected={selected}
          onChange={onChange}
          disabled={disabled}
          collapsed={collapsed.has(category.category)}
          onToggle={() => {
            toggleCollapsed(category.category);
          }}
        />
      ))}
    </div>
  );
}

const STATE_STYLES: Record<CheckState, string> = {
  checked: 'border-primary/40 bg-primary-soft/40',
  indeterminate: 'border-border-strong/40 bg-muted/40',
  unchecked: 'border-border bg-card'
};

interface CategoryBranchProps {
  readonly category: TreeCategoryNode;
  readonly selected: ReadonlySet<string>;
  readonly onChange: (next: ReadonlySet<string>) => void;
  readonly disabled: boolean;
  readonly collapsed: boolean;
  readonly onToggle: () => void;
}

function CategoryBranch({
  category,
  selected,
  onChange,
  disabled,
  collapsed,
  onToggle
}: CategoryBranchProps) {
  const keys = keysOfCategory(category);
  const state = stateOf(selected, keys);
  const granted = grantedOf(selected, keys);
  const listId = `perm-category-${category.category.replace(/\s+/g, '-')}`;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border transition-colors duration-[var(--duration-fast)]',
        STATE_STYLES[state]
      )}
    >
      <div className="flex items-center gap-2 px-2 py-1.5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-controls={listId}
          aria-label={`${collapsed ? 'Expandir' : 'Contraer'} ${category.category}`}
          className="rounded-xs p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronRight
            className={cn(
              'size-4 transition-transform duration-[var(--duration-base)] ease-out motion-reduce:transition-none',
              !collapsed && 'rotate-90'
            )}
            aria-hidden="true"
          />
        </button>

        <TriStateCheckbox
          checked={state === 'checked'}
          indeterminate={state === 'indeterminate'}
          label={`Todos los permisos de ${category.category}`}
          disabled={disabled}
          onChange={(checked) => {
            onChange(applyGroup(selected, keys, checked));
          }}
        />

        <FolderTree className="size-4 text-muted-foreground" aria-hidden="true" />

        <span className="text-sm font-semibold text-foreground">{category.category}</span>

        <span className="ml-auto font-mono text-[11px] text-subtle-foreground">
          {`${String(granted)}/${String(keys.length)}`}
        </span>
      </div>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-[var(--duration-base)] ease-out motion-reduce:transition-none',
          collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
        )}
      >
        <div
          className="overflow-hidden"
          // Cerrado: fuera del orden de tabulación y de los lectores de pantalla.
          inert={collapsed}
        >
          <ul id={listId} className="flex flex-col gap-0.5 border-t border-border/60 px-2 py-2">
            {category.resources.map((resource) => (
              <ResourceBranch
                key={resource.resource}
                category={category.category}
                resource={resource}
                selected={selected}
                onChange={onChange}
                disabled={disabled}
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

interface ResourceBranchProps {
  readonly category: string;
  readonly resource: TreeCategoryNode['resources'][number];
  readonly selected: ReadonlySet<string>;
  readonly onChange: (next: ReadonlySet<string>) => void;
  readonly disabled: boolean;
}

function ResourceBranch({ category, resource, selected, onChange, disabled }: ResourceBranchProps) {
  const keys = keysOfResource(resource);
  const state = stateOf(selected, keys);
  const granted = grantedOf(selected, keys);

  return (
    <li className="flex flex-col">
      <div className="flex items-center gap-2 rounded-sm px-2 py-1.5 pl-6 transition-colors duration-[var(--duration-fast)] hover:bg-muted/50">
        <TriStateCheckbox
          checked={state === 'checked'}
          indeterminate={state === 'indeterminate'}
          label={`Todos los permisos de ${resource.description}`}
          disabled={disabled}
          onChange={(checked) => {
            onChange(applyGroup(selected, keys, checked));
          }}
        />

        <ShieldCheck className="size-3.5 text-muted-foreground" aria-hidden="true" />
        <span className="text-sm text-foreground">{resource.description}</span>
        <span className="font-mono text-[11px] text-subtle-foreground">{resource.resource}</span>

        <span className="ml-auto font-mono text-[11px] text-subtle-foreground">
          {`${String(granted)}/${String(keys.length)}`}
        </span>
      </div>

      <ul className="mb-1 ml-[2.6rem] flex flex-wrap gap-x-4 gap-y-1 border-l border-border py-1 pl-4">
        {resource.actions.map((action) => (
          <li key={action.key}>
            <label className="flex cursor-pointer items-center gap-1.5 rounded-sm px-1 py-0.5 transition-colors duration-[var(--duration-fast)] hover:bg-muted/60">
              <input
                type="checkbox"
                className="size-3.5 accent-[var(--primary)]"
                checked={selected.has(action.key)}
                disabled={disabled}
                aria-label={`${action.action} en ${resource.description} (${category})`}
                onChange={(event) => {
                  onChange(applyGroup(selected, [action.key], event.target.checked));
                }}
              />
              <span className="text-xs text-muted-foreground">{action.action}</span>
            </label>
          </li>
        ))}
      </ul>
    </li>
  );
}
