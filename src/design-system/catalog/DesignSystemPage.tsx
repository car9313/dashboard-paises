import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Plus, Power, PowerOff, Search, SearchX, Tags } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  BRAND_TOKENS,
  RADIUS_TOKENS,
  SPACING_SCALE,
  STATUS_TOKENS,
  SURFACE_TOKENS,
  TYPE_SCALE,
  type ColorToken
} from '@/design-system/tokens';
import { DataTable } from '@/shared/components/data-table/data-table';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { KpiCard } from '@/shared/components/kpi-card';
import { PageHeader } from '@/shared/components/page-header';
import { SearchInput } from '@/shared/components/search-input';
import { StatusBadge } from '@/shared/components/status-badge';
import { Select } from '@/shared/ui/select';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Skeleton } from '@/shared/ui/skeleton';
import { Switch } from '@/shared/ui/switch';

function Section({
  title,
  description,
  children
}: {
  readonly title: string;
  readonly description?: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description !== undefined && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="rounded-lg border border-border bg-card p-5">{children}</div>
    </section>
  );
}

function Swatch({ token }: { readonly token: ColorToken }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="h-12 rounded-sm border border-border"
        style={{ background: `var(${token.name})` }}
        aria-hidden="true"
      />
      <p className="font-mono text-[11px] text-foreground">{token.name}</p>
      <p className="text-[11px] text-muted-foreground">{token.usage}</p>
    </div>
  );
}

/**
 * Catálogo vivo del sistema de diseño.
 *
 * @remarks
 * Se renderiza con los componentes reales, no con capturas: si el catálogo
 * compila y se ve bien, el sistema está sano. Es la contraparte ejecutable de
 * `docs/04-sistema-diseno.md` (ADR-015).
 */
const SAMPLE_ROWS = [
  { code: 'AF', name: 'Afganistán', active: true },
  { code: 'ES', name: 'España', active: true },
  { code: 'MX', name: 'México', active: false },
  { code: 'CU', name: 'Cuba', active: true },
  { code: 'ZA', name: 'Zambia', active: false }
] as const;

interface SampleRow {
  readonly code: string;
  readonly name: string;
  readonly active: boolean;
}

export function DesignSystemPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [switchOn, setSwitchOn] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });

  const sortedRows = useMemo(() => {
    const active = sorting[0];
    const key = active?.id === 'code' ? 'code' : 'name';
    const factor = active?.desc === true ? -1 : 1;

    return [...SAMPLE_ROWS].sort(
      (left, right) => left[key].localeCompare(right[key], 'es') * factor
    );
  }, [sorting]);

  const pageRows = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return sortedRows.slice(start, start + pagination.pageSize);
  }, [sortedRows, pagination]);

  const tableColumns: ColumnDef<SampleRow, unknown>[] = [
    { id: 'name', accessorKey: 'name', header: 'Nombre', enableSorting: true },
    { id: 'code', accessorKey: 'code', header: 'Código', enableSorting: true },
    {
      id: 'active',
      header: 'Estado',
      enableSorting: false,
      cell: ({ row }) => <StatusBadge active={row.original.active} />
    }
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Sistema de diseño"
        description="Tokens, tipografía y componentes reales del dashboard."
      />

      <Section
        title="Superficies y texto"
        description="Cambian con el tema; los componentes sólo consumen la variable."
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {SURFACE_TOKENS.map((token) => (
            <Swatch key={token.name} token={token} />
          ))}
        </div>
      </Section>

      <Section title="Marca e interacción">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {BRAND_TOKENS.map((token) => (
            <Swatch key={token.name} token={token} />
          ))}
        </div>
      </Section>

      <Section title="Estados">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {STATUS_TOKENS.map((token) => (
            <Swatch key={token.name} token={token} />
          ))}
        </div>
      </Section>

      <Section title="Tipografía" description="Escala de 7 roles; 14 px es el cuerpo.">
        <ul className="flex flex-col gap-2">
          {TYPE_SCALE.map((type) => (
            <li key={type.name} className="flex items-baseline justify-between gap-4">
              <span
                className="text-foreground"
                style={{ fontSize: type.size, lineHeight: type.line, fontWeight: type.weight }}
              >
                {type.name === 'code' ? 'AF · CU · ES' : 'Nomenclador de países'}
              </span>
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                {type.name} · {type.size}/{type.line} · {type.weight}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Radios" description="Escala corporativa 2/4/4/6/8 px.">
        <div className="flex flex-wrap gap-4">
          {RADIUS_TOKENS.map((token) => (
            <div key={token.name} className="flex flex-col items-center gap-1.5">
              <div
                className="size-16 border border-border-strong bg-muted"
                style={{ borderRadius: token.value }}
                aria-hidden="true"
              />
              <span className="font-mono text-[11px] text-muted-foreground">{token.value}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Espaciado" description="Base 4 px.">
        <div className="flex flex-wrap items-end gap-3">
          {SPACING_SCALE.map((step) => (
            <div key={step} className="flex flex-col items-center gap-1">
              <div
                className="rounded-xs bg-primary/70"
                style={{ width: `${step * 4}px`, height: '16px' }}
                aria-hidden="true"
              />
              <span className="font-mono text-[11px] text-muted-foreground">{step}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Botones">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <Button>Principal</Button>
            <Button variant="secondary">Secundario</Button>
            <Button variant="outline">Contorno</Button>
            <Button variant="ghost">Fantasma</Button>
            <Button variant="danger">Peligro</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm">Pequeño</Button>
            <Button size="md">Mediano</Button>
            <Button size="icon" aria-label="Agregar">
              <Plus aria-hidden="true" />
            </Button>
            <Button loading>Guardando</Button>
            <Button disabled>Deshabilitado</Button>
          </div>
        </div>
      </Section>

      <Section title="Campos">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ds-name" required>
              Nombre
            </Label>
            <Input id="ds-name" placeholder="Cuba" />
            <p className="text-xs text-muted-foreground">Texto de ayuda del campo.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ds-error">Código</Label>
            <Input
              id="ds-error"
              defaultValue="CUB"
              aria-invalid="true"
              aria-describedby="ds-error-msg"
            />
            <p id="ds-error-msg" role="alert" className="text-xs text-danger">
              El código debe tener 2 letras.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ds-search">Búsqueda</Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle-foreground"
                aria-hidden="true"
              />
              <Input id="ds-search" className="pl-9" placeholder="Buscar país…" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ds-disabled">Deshabilitado</Label>
            <Input id="ds-disabled" disabled defaultValue="No editable" />
          </div>
        </div>
      </Section>

      <Section title="Insignias e indicadores">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success">Activo</Badge>
          <Badge variant="danger">Inactivo</Badge>
          <Badge variant="warning">Pendiente</Badge>
          <Badge variant="info">Informativo</Badge>
          <Badge>Neutro</Badge>
          <Badge variant="brand">Marca</Badge>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Switch
              checked={switchOn}
              onCheckedChange={setSwitchOn}
              aria-label="Ejemplo de interruptor"
            />
            {switchOn ? 'Activo' : 'Inactivo'}
          </label>
          <Switch disabled aria-label="Interruptor deshabilitado" />
        </div>
      </Section>

      <Section title="Carga">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-full" />
        </div>
      </Section>

      <Section
        title="Diálogo"
        description="Radix aporta el foco atrapado, Escape y la devolución del foco."
      >
        <Button onClick={() => setDialogOpen(true)}>Abrir diálogo</Button>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo país</DialogTitle>
              <DialogDescription>
                El código identifica al país y no se puede cambiar después.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ds-code" required>
                  Código
                </Label>
                <Input id="ds-code" placeholder="CU" maxLength={2} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ds-country-name" required>
                  Nombre
                </Label>
                <Input id="ds-country-name" placeholder="Cuba" />
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setDialogOpen(false)}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Section>

      <Section
        title="Indicadores"
        description="Tarjetas de KPI con altura estable durante la carga."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Países"
            value={249}
            hint="Total del nomenclador"
            icon={Tags}
            tone="brand"
          />
          <KpiCard label="Activos" value={249} hint="Disponibles" icon={Power} tone="success" />
          <KpiCard label="Inactivos" value={0} hint="Desactivados" icon={PowerOff} tone="danger" />
          <KpiCard
            label="Cobertura"
            value="100 %"
            hint="Porcentaje de activos"
            icon={Tags}
            tone="neutral"
            isPending
          />
        </div>
      </Section>

      <Section title="Búsqueda y filtros" description="Los controles de la barra de herramientas.">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={query}
            onChange={setQuery}
            label="Buscar país"
            placeholder="Buscar por nombre o código…"
            className="sm:max-w-xs"
          />
          <Select
            aria-label="Filtrar por estado"
            value={status}
            onChange={(event) => {
              const value = event.target.value;
              if (value === 'all' || value === 'active' || value === 'inactive') {
                setStatus(value);
              }
            }}
            className="sm:w-40"
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </Select>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{`Búsqueda: «${query}» · Estado: ${status}`}</p>
      </Section>

      <Section title="Estados" description="Ni el vacío ni el error dejan al usuario sin salida.">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border">
            <EmptyState
              icon={SearchX}
              title="Ningún país coincide"
              description="No hay resultados para «xyz»."
              action={
                <Button variant="secondary" size="sm">
                  Limpiar filtros
                </Button>
              }
            />
          </div>
          <div className="rounded-lg border border-border">
            <ErrorState
              message="El servidor no está disponible. Inténtalo en unos minutos."
              onRetry={() => undefined}
              traceId="00-trace-demo"
            />
          </div>
        </div>
      </Section>

      <Section
        title="Tabla"
        description="Orden por cabecera, paginación y estados de carga/error/vacío."
      >
        <DataTable
          data={pageRows}
          columns={tableColumns}
          caption="Tabla de ejemplo del sistema de diseño"
          getRowId={(row) => row.code}
          sorting={sorting}
          onSortToggle={(columnId) => {
            setSorting((current) => {
              const active = current[0];
              const desc = active?.id === columnId ? !active.desc : false;
              return [{ id: columnId, desc }];
            });
          }}
          pageIndex={pagination.pageIndex}
          pageSize={pagination.pageSize}
          totalRows={sortedRows.length}
          onPageChange={(index) => {
            setPagination((current) => ({ ...current, pageIndex: index }));
          }}
          onPageSizeChange={(size) => {
            setPagination({ pageIndex: 0, pageSize: size });
          }}
          pageSizeOptions={[5, 10]}
          emptyState={<EmptyState title="Sin filas" description="No hay datos de ejemplo." />}
        />
      </Section>

      <Section
        title="Temas"
        description="Claro y oscuro comparten tokens; cambia con el botón de la barra superior."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-background p-4">
            <p className="text-sm font-medium text-foreground">Fondo</p>
            <p className="text-xs text-muted-foreground">bg-background sobre card</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-medium text-foreground">Superficie</p>
            <p className="text-xs text-muted-foreground">bg-card con borde</p>
          </div>
        </div>
      </Section>
    </div>
  );
}
