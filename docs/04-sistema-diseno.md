# 04 — Sistema de diseño

> **Fecha:** 2026-11-20 · **Base:** corporativa heredada del origen (`emerald`, radios 2/4/4/6/8,
> breakpoints 576/768/992/1200/1920) + primitivas shadcn/ui + Radix.
>
> **Artefacto vivo:** ruta `/design-system` (renderiza los componentes reales, no capturas).

---

## 1. Principios

1. **Semántico, no literal.** Los componentes usan `--color-surface`, no `bg-white`. Cambiar el tema o el
   color de marca no toca componentes.
2. **Paridad con el origen donde importa.** Mismo color de marca, misma escala de radios, mismos
   breakpoints: el dashboard se siente parte de la misma familia.
3. **Densidad de escritorio.** Tabla con filas de 44 px, toolbar compacta, tipografía 14 px base:
   es una herramienta de trabajo, no una landing.
4. **Accesible por defecto.** Foco visible, contraste AA, `prefers-reduced-motion`, navegación por teclado.
5. **Un solo token por decisión.** Si un valor aparece dos veces con nombres distintos, es un bug.

---

## 2. Tokens

Única fuente: `src/design-system/tokens.css`. Se exponen a Tailwind 4 con `@theme` para que las utilidades
(`bg-surface`, `text-fg-muted`, `rounded-lg`) salgan de los mismos valores.

### 2.1 Color — primitivas

| Escala            | Uso                                    | Valores                                                                                                       |
| ----------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `emerald` 50→950  | Marca (`CORPORATE_PRIMARY` del origen) | `#ecfdf5 · #d1fae5 · #a7f3d0 · #6ee7b7 · #34d399 · #10b981 · #059669 · #047857 · #065f46 · #064e3b · #022c22` |
| `slate` 50→950    | Neutros de superficie y texto          | escala Tailwind `slate`                                                                                       |
| `red` 500/600     | Peligro                                | `#ef4444 · #dc2626`                                                                                           |
| `amber` 500/600   | Advertencia                            | `#f59e0b · #d97706`                                                                                           |
| `emerald` 500/600 | Éxito                                  | `#10b981 · #059669`                                                                                           |
| `sky` 500/600     | Información                            | `#0ea5e9 · #0284c7`                                                                                           |

> Coinciden con los `--color-error/warning/success/info` del `styles.scss` del origen.

### 2.2 Color — semánticos (tema claro)

```css
:root {
  /* superficies */
  --bg: #f8fafc; /* fondo de la app (surface-ground del origen) */
  --surface: #ffffff; /* tarjetas, tablas, diálogos */
  --surface-hover: #f1f5f9;
  --surface-sunken: #f1f5f9; /* cabecera de tabla, toolbar */
  --border: #e2e8f0;
  --border-strong: #cbd5e1;

  /* texto */
  --fg: #0f172a;
  --fg-muted: #64748b;
  --fg-subtle: #94a3b8;
  --fg-on-primary: #ffffff;

  /* marca */
  --primary: #059669; /* emerald-600: contraste AA sobre blanco */
  --primary-hover: #047857;
  --primary-soft: #ecfdf5; /* fondos de insignia/badge */
  --primary-soft-fg: #047857;

  /* estados */
  --success: #059669;
  --success-soft: #ecfdf5;
  --warning: #d97706;
  --warning-soft: #fffbeb;
  --danger: #dc2626;
  --danger-soft: #fef2f2;
  --info: #0284c7;
  --info-soft: #f0f9ff;

  /* interacción */
  --focus-ring: #10b981;
  --overlay: rgb(15 23 42 / 0.45);
}
```

### 2.3 Color — tema oscuro (`.dark`)

```css
.dark {
  --bg: #0b1220;
  --surface: #111a2b;
  --surface-hover: #172236;
  --surface-sunken: #0e1626;
  --border: #1f2b3f;
  --border-strong: #2b3a52;

  --fg: #e6edf7;
  --fg-muted: #9aa9bf;
  --fg-subtle: #6b7b93;

  --primary: #34d399; /* emerald-400: contraste AA sobre superficie oscura */
  --primary-hover: #6ee7b7;
  --primary-soft: #052e22;
  --primary-soft-fg: #6ee7b7;

  --success: #34d399;
  --success-soft: #052e22;
  --warning: #fbbf24;
  --warning-soft: #331f04;
  --danger: #f87171;
  --danger-soft: #3a1212;
  --info: #38bdf8;
  --info-soft: #082f49;

  --focus-ring: #34d399;
  --overlay: rgb(2 6 23 / 0.65);
}
```

**Estrategia:** clase `dark` en `<html>`, persistida en `useThemeStore` (Zustand + `persist`), con
`prefers-color-scheme` como valor inicial y `color-scheme` declarado para que los controles nativos (scrollbar,
datepicker) acompañen.

### 2.4 Radios

Escala corporativa del origen (`2 / 4 / 4 / 6 / 8`):

| Token           |  Valor | Uso                      |
| --------------- | -----: | ------------------------ |
| `--radius-xs`   |    2px | insignias, chips         |
| `--radius-sm`   |    4px | inputs, botones, celdas  |
| `--radius-md`   |    4px | tarjetas pequeñas        |
| `--radius-lg`   |    6px | tarjetas, diálogos       |
| `--radius-xl`   |    8px | paneles, modales grandes |
| `--radius-full` | 9999px | avatares, dot de estado  |

### 2.5 Espaciado

Base **4 px**. Escala: `0, 1(4), 2(8), 3(12), 4(16), 5(20), 6(24), 8(32), 10(40), 12(48), 16(64), 20(80)`.

| Contexto                  | Valor                             |
| ------------------------- | --------------------------------- |
| Padding de página         | 24 px (`lg` 32 px)                |
| Gap entre secciones       | 24 px                             |
| Padding de tarjeta        | 20–24 px                          |
| Padding de celda de tabla | 12 px vertical · 16 px horizontal |
| Alto de fila              | 44 px (cómoda) / 36 px (densa)    |

### 2.6 Tipografía

```css
--font-sans: 'Inter var', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
--font-mono: ui-monospace, 'Cascadia Code', 'Consolas', monospace;
```

| Rol           | Tamaño / línea | Peso | Uso                               |
| ------------- | -------------- | ---- | --------------------------------- |
| `display`     | 28 / 36        | 600  | título de página de inicio        |
| `h1`          | 22 / 30        | 600  | título de pantalla                |
| `h2`          | 18 / 26        | 600  | título de sección/diálogo         |
| `body`        | 14 / 22        | 400  | texto y celdas                    |
| `body-strong` | 14 / 22        | 500  | etiquetas, encabezados de columna |
| `small`       | 12 / 18        | 400  | ayudas, metadatos                 |
| `code`        | 13 / 20        | 400  | códigos de país (`AF`, `CU`)      |

Los **códigos ISO** se muestran en `--font-mono` con `font-variant-numeric: tabular-nums`.

### 2.7 Sombras, foco y movimiento

| Token          | Valor                                                               | Uso                             |
| -------------- | ------------------------------------------------------------------- | ------------------------------- |
| `--shadow-xs`  | `0 1px 2px rgb(15 23 42 / .06)`                                     | inputs, botones                 |
| `--shadow-sm`  | `0 1px 3px rgb(15 23 42 / .10), 0 1px 2px rgb(15 23 42 / .06)`      | tarjetas                        |
| `--shadow-md`  | `0 8px 24px rgb(15 23 42 / .12)`                                    | diálogos, popovers              |
| `--focus-ring` | `0 0 0 3px color-mix(in oklab, var(--focus-ring) 35%, transparent)` | **siempre** en `:focus-visible` |

| Token             | Valor                       |
| ----------------- | --------------------------- |
| `--duration-fast` | 120 ms                      |
| `--duration-base` | 180 ms                      |
| `--duration-slow` | 240 ms                      |
| `--ease-standard` | `cubic-bezier(.2, 0, 0, 1)` |

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
  /* el skeleton deja de brillar pero conserva el gris: comunica igual */
}
```

### 2.8 Breakpoints y layout

| Token |   Valor | Equivalente del origen |
| ----- | ------: | ---------------------- |
| `sm`  |  576 px | `--breakpoint-sm`      |
| `md`  |  768 px | `--breakpoint-md`      |
| `lg`  |  992 px | `--breakpoint-lg`      |
| `xl`  | 1200 px | `--breakpoint-xl`      |
| `2xl` | 1920 px | `--breakpoint-2xl`     |

| Medida                | Valor                                                       |
| --------------------- | ----------------------------------------------------------- |
| Sidebar expandida     | 260 px                                                      |
| Sidebar colapsada     | 72 px (solo iconos + tooltip)                               |
| Topbar                | 56 px                                                       |
| Contenido máximo      | 1440 px, centrado, con padding lateral 24 px                |
| Comportamiento `< lg` | sidebar como _drawer_ superpuesto, topbar con botón de menú |

### 2.9 Z-index

`--z-base: 0`, `--z-sticky: 10`, `--z-dropdown: 20`, `--z-overlay: 30`, `--z-modal: 40`,
`--z-toast: 50`, `--z-tooltip: 60`.

---

## 3. Inventario de componentes

Cada componente documenta en `/design-system`: propósito, variantes, tamaños y estados
(**default · hover · focus-visible · active · disabled · loading · error · empty**).

### 3.1 Átomos (`shared/ui`, shadcn)

| Componente                                     | Variantes                                                          | Notas                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `Button`                                       | `primary`, `secondary`, `outline`, `ghost`, `danger`; `sm/md/icon` | `loading` deshabilita y muestra spinner sin cambiar el ancho               |
| `Input`                                        | —                                                                  | `error` pinta borde `--danger` y `aria-invalid`                            |
| `Switch`                                       | `sm/md`                                                            | control del estado activo; `aria-checked`, `aria-busy` cuando hay petición |
| `Badge`                                        | `neutral`, `success`, `warning`, `danger`, `info`, `brand`         | estado «Activo/Inactivo»                                                   |
| `Checkbox`, `RadioGroup`, `Select`, `Textarea` | —                                                                  | mismos estados que `Input`                                                 |
| `Skeleton`                                     | `text`, `row`, `card`                                              | sin shimmer con `prefers-reduced-motion`                                   |
| `Spinner`                                      | `sm/md`                                                            | solo dentro de botones o `ContentState`                                    |
| `Tooltip`, `Popover`, `DropdownMenu`           | —                                                                  | Radix; cierre con `Escape` y foco devuelto                                 |
| `Dialog`, `AlertDialog`                        | `sm/md/lg`                                                         | Radix: `aria-modal`, foco atrapado, `Escape`                               |
| `Toast` (sonner)                               | `success`, `error`, `info`                                         | 4 s, descartable, `role="status"`/`alert`                                  |
| `Tabs`, `Separator`, `Avatar`                  | —                                                                  | —                                                                          |

### 3.2 Moléculas (`shared/components`)

| Componente      | Contrato                                                                                |
| --------------- | --------------------------------------------------------------------------------------- |
| `PageHeader`    | `title`, `description?`, `actions?`, `breadcrumb?` — una sola forma de titular pantalla |
| `SearchInput`   | `value`, `onChange` (debounce 250 ms), `placeholder`, `onClear`                         |
| `EmptyState`    | `icon`, `title`, `description`, `action?` — nunca "no hay datos" a secas                |
| `ErrorState`    | `error`, `onRetry` — mensaje traducido + `traceId` en detalle colapsable                |
| `ContentState`  | `isPending`, `error`, `isEmpty`, `skeleton`, `onRetry`, `children` — **prioridad fija** |
| `StatusBadge`   | `active: boolean` → «Activo» / «Inactivo» con color semántico                           |
| `ConfirmDialog` | `title`, `description`, `confirmLabel`, `variant`, `onConfirm`                          |
| `FilterBar`     | slot de filtros + `onClear` + contador de activos                                       |
| `Pagination`    | `page`, `pageSize`, `total`, `onPageChange`, `pageSizeOptions`                          |
| `DataTable`     | ver §4                                                                                  |
| `KpiCard`       | `label`, `value`, `delta?`, `icon`, `hint?` — para el inicio                            |
| `LoadingBar`    | contador global, anti-parpadeo 150/300 ms                                               |

### 3.3 Organismos (por feature)

| Componente                           | Feature              | Descripción                                   |
| ------------------------------------ | -------------------- | --------------------------------------------- |
| `AppShell`                           | `app/shell`          | sidebar + topbar + `<Outlet/>` + toaster      |
| `Sidebar` / `Topbar` / `Breadcrumbs` | `app/shell`          | navegación filtrada por RBAC                  |
| `LoginPage`                          | `features/auth`      | formulario + error de credenciales + huella   |
| `CountriesPage`                      | `features/countries` | toolbar + tabla + diálogos                    |
| `CountryTable`                       | `features/countries` | columnas: Nombre · Código · Estado · Acciones |
| `CountryFormDialog`                  | `features/countries` | alta/edición con Zod                          |
| `CountryDetailDialog`                | `features/countries` | lectura desde caché + respaldo                |
| `DashboardPage`                      | `features/dashboard` | KPIs derivados + accesos directos             |

---

## 4. Anatomía del `DataTable`

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ PageHeader:  Países            [+ Nuevo país]                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│ FilterBar:  [🔍 Buscar país…]   [Estado ▾]   [Limpiar (2)]                    │
├──────────────────────────────────────────────────────────────────────────────┤
│ Nombre ▲        │ Código │ Estado      │                         Acciones     │
├─────────────────┼────────┼─────────────┼──────────────────────────────────────┤
│ Afganistán      │ AF     │ ● Activo ⏻  │  👁 Ver    ✏️ Editar                 │
│ Albania         │ AL     │ ● Activo ⏻  │  👁 Ver    ✏️ Editar                 │
│ …               │        │             │                                      │
├─────────────────┴────────┴─────────────┴──────────────────────────────────────┤
│ Mostrando 1–10 de 249                    [10 ▾]      ‹  1 2 … 25  ›            │
└──────────────────────────────────────────────────────────────────────────────┘
```

Reglas del contrato:

- **Cabecera y paginador sobreviven al refetch** (no se desmontan durante la carga: solo el cuerpo muestra
  skeleton de filas).
- Orden por columna con `aria-sort`; el indicador es ▲/▼ y la columna activa lleva `font-weight: 600`.
- Acciones en línea (`inline`) o en menú (`menu`) según el ancho: en `< md` pasan a menú.
- Fila con mutación en vuelo: controles `disabled` + `aria-busy="true"`; **las demás filas siguen operables**.
- Selección de fila opcional (`onRowClick`) con `data-state="selected"` y foco visible.
- Estados: `loading` (skeleton de 5 filas), `error` (`ErrorState` con Reintentar), `empty` (`EmptyState`
  con acción), `empty-filtered` («Ningún país coincide con «cub»» + Limpiar filtros).

---

## 5. Patrones de formulario

```html
<label for="name">Nombre <span class="text-danger" aria-hidden="true">*</span></label>
<input id="name" aria-describedby="name-help name-error" aria-invalid="true" />
<p id="name-help">Tal como aparece en el nomenclador.</p>
<p id="name-error" role="alert">Mínimo 2 caracteres.</p>
```

- **Cuándo se muestra el error:** tras `blur` o al enviar (`mode: 'onTouched'`), nunca mientras se escribe la
  primera vez.
- **Al enviar inválido:** foco en el primer campo con error (patrón `markAllAsTouched` del origen).
- **Mientras guarda:** botón con `loading`, formulario `aria-busy`, campos `disabled`, `Escape` no cierra.
- **Error del servidor:** se muestra en un `Alert` dentro del diálogo, no se pierde lo escrito.
- **Éxito:** toast + cierre + foco devuelto al disparador (el botón que abrió el diálogo).
- **Campos no editables en edición:** `code` se muestra `readOnly` con ayuda «El código no se puede cambiar».

---

## 6. Accesibilidad (checklist obligatorio)

- [ ] Todo control interactivo es alcanzable con `Tab` y activable con `Enter`/`Space`.
- [ ] `:focus-visible` visible en cualquier fondo (anillo de 3 px, nunca `outline: none` sin sustituto).
- [ ] Contraste mínimo **4.5:1** en texto normal y **3:1** en texto grande e iconos.
- [ ] Diálogos: `role="dialog"`, `aria-modal`, foco atrapado, `Escape` cierra, foco devuelto.
- [ ] Errores de formulario con `aria-invalid` y `aria-describedby`.
- [ ] Cambios asíncronos anunciados con `role="status"` (toast, contador de resultados).
- [ ] Tabla con `<caption class="sr-only">`, `<th scope="col">` y `aria-sort`.
- [ ] Iconos decorativos `aria-hidden`; los que son solo icono llevan `aria-label`.
- [ ] `prefers-reduced-motion` respetado en skeleton, barra de carga y transiciones.
- [ ] Contraste verificado en **ambos** temas.

### 6.1 Verificación automática (F6, 2026-11-20)

El checklist dejó de ser solo manual en dos frentes:

| Prueba                 | Archivo                                     | Qué garantiza                                                                                   |
| ---------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Contraste de tokens    | `src/design-system/tokens.contrast.spec.ts` | Lee `tokens.css` y calcula WCAG 2.1 sobre 11 pares de texto y 3 de interfaz, en claro y oscuro  |
| Auditoría de pantallas | `src/app/a11y.spec.tsx`                     | `axe-core` sobre login, Países, inicio y catálogo; detecta nombres accesibles, roles y `aria-*` |

La auditoría de contraste encontró y corrigió defectos reales que no se ven a ojo:

| Token                          | Antes     | Después   | Motivo                                               |
| ------------------------------ | --------- | --------- | ---------------------------------------------------- |
| `--primary`                    | `#059669` | `#047857` | Texto blanco sobre la marca: 3.77:1 → **5.48:1**     |
| `--success`                    | `#059669` | `#047857` | Insignia «Activo»: 3.58:1 → **5.21:1**               |
| `--warning`                    | `#d97706` | `#b45309` | Insignia de advertencia: 3.07:1 → **4.84:1**         |
| `--danger`                     | `#dc2626` | `#b91c1c` | Insignia de peligro: 4.41:1 → **5.91:1**             |
| `--info`                       | `#0284c7` | `#0369a1` | Insignia informativa: 3.84:1 → **5.57:1**            |
| `--subtle-foreground`          | `#94a3b8` | `#64748b` | Texto tenue: 2.56:1 → **4.76:1**                     |
| `--muted-foreground`           | `#64748b` | `#475569` | Conservar jerarquía con el anterior                  |
| `--subtle-foreground` (oscuro) | `#6b7b93` | `#8595ab` | Texto tenue: 4.04:1 → **5.71:1**                     |
| `--ring`                       | `#10b981` | `#047857` | Anillo de foco: 2.3:1 → **5.48:1**                   |
| `--border-strong`              | `#cbd5e1` | `#7c8aa0` | Borde de controles (WCAG 1.4.11): 1.48:1 → **3.5:1** |
| `--border-strong` (oscuro)     | `#2b3a52` | `#5b6f92` | Ídem en oscuro: 1.52:1 → **3.43:1**                  |

Regla derivada: **un token de color no se cambia sin volver a correr la prueba de contraste**; el fallo
nombra el par, los ratios y el umbral, así que no hay que adivinar.

> El propio verificador se prueba: `a11y.spec.tsx` incluye un control con un `<button>` sin nombre
> accesible y exige que axe lo detecte. Una suite de accesibilidad que nunca falla no demuestra nada.

---

### 6.2 `TriStateCheckbox` y el árbol de permisos (F9)

El editor de permisos tiene dos vistas y ambas comparten estado. La de árbol necesita casillas con estado
**indeterminado** (algunas acciones de un recurso marcadas, no todas). `indeterminate` no es un atributo
HTML, solo una propiedad del input, así que `shared/ui/tri-state-checkbox.tsx` la escribe por ref: es el
único DOM imperativo del sistema de diseño y está documentado como tal.

La vista de árbol **no finge** `role="tree"`: un widget de árbol exige implementar navegación con flechas.
Cada grupo es un botón con `aria-expanded`/`aria-controls` y las casillas son reales, así que `Tab` y
`Espacio` funcionan como en cualquier formulario.

---

## 7. El catálogo `/design-system`

Ruta accesible en desarrollo (y en el build de demo) con estas secciones:

1. **Fundamentos** — paleta con nombres de token y contraste calculado, tipografía, espaciado, radios,
   sombras, iconos.
2. **Componentes** — cada uno con sus variantes y todos sus estados, con el código mínimo para usarlo.
3. **Patrones** — tabla vacía, tabla con error, formulario inválido, diálogo de confirmación, toast.
4. **Temas** — botón claro/oscuro que aplica la clase al `<html>` en vivo.

Se construye con los componentes reales (`shared/ui` + `shared/components`), así que **si el catálogo compila,
el sistema compila**. Se cubre con un test de humo que recorre las secciones y verifica que no hay errores.

---

## 8. Convenciones de implementación

- Variantes con **`cva`** (`class-variance-authority`) y `cn()` (`clsx` + `tailwind-merge`):

```tsx
const button = cva(
  'inline-flex items-center gap-2 rounded-sm font-medium transition-colors ' +
    'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus-ring)]/35 ' +
    'disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-[var(--primary)] text-[var(--fg-on-primary)] hover:bg-[var(--primary-hover)]',
        secondary: 'bg-[var(--surface-sunken)] text-[var(--fg)] hover:bg-[var(--surface-hover)]',
        outline:
          'border border-[var(--border-strong)] bg-transparent hover:bg-[var(--surface-hover)]',
        ghost: 'bg-transparent hover:bg-[var(--surface-hover)]',
        danger: 'bg-[var(--danger)] text-white hover:brightness-95'
      },
      size: { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4 text-sm', icon: 'h-9 w-9 justify-center' }
    },
    defaultVariants: { variant: 'primary', size: 'md' }
  }
);
```

- **Prohibido** hex sueltos en componentes (regla de lint `no-restricted-syntax` sobre `#[0-9a-f]{3,8}`).
- Un componente no define márgenes externos: el espaciado lo pone el contenedor (`gap` del layout).
- Nada de `!important` salvo utilidad documentada (`sr-only`).
- Los iconos son **lucide-react** (consistente con shadcn); se importan por nombre, nunca un sprite global.

### 8.1 Movimiento (F10, 2026-11-23)

Regla: **el movimiento explica un cambio de estado, no decora**. Si una animación no ayuda a entender qué
acaba de pasar, no va.

| Situación           | Cómo se anima                                                         | Dónde                                                                      |
| ------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Cambio de tema      | Colores (fondo, borde, texto, relleno) con `--duration-slow`          | Clase `theme-transition` en `<html>`, puesta y retirada por `applyTheme()` |
| Cambio de página    | Fundido + 6 px de subida                                              | `AppShell`: `key={pathname}` + `animate-page-in`                           |
| Contraer el sidebar | Ancho, padding del contenido y **etiquetas** (opacidad y `max-width`) | `Sidebar`; las etiquetas no se desmontan                                   |
| Acción de fila      | Fondo y color semántico + 1 px de elevación                           | `shared/components/table-row-action.tsx`                                   |
| Fila de tabla       | Fondo al pasar el ratón                                               | `DataTable`                                                                |

Detalles que evitan errores:

- La transición de tema es **temporal**: una clase que dura 300 ms. Animar colores de forma permanente en
  todo el árbol cuesta y no aporta nada mientras se navega.
- La animación de página usa `pathname`, no la URL completa: filtrar o paginar no la re-dispara.
- Las etiquetas del sidebar se ocultan con opacidad y `max-width`, no desmontándolas: si desaparecen de
  golpe, el cambio de ancho animado se percibe igual como salto. Al colapsar, la etiqueta visible pasa a
  `aria-hidden` y el nombre accesible lo aporta un `sr-only` (nunca dos veces).
- `prefers-reduced-motion` está cubierto una sola vez en `styles.css` (duración de animación y transición a
  casi cero), así que ningún componente necesita repetir la condición.

---

### 8.2 Preferencia de movimiento (F10.1, 2026-11-23)

El sistema operativo expone `prefers-reduced-motion`, pero en Windows esa señal la controla
**«Efectos de animación»** de Configuración → Accesibilidad, un ajuste pensado para otra cosa y que mucha
gente tiene apagado sin relación con las webs. Cuando está apagado, el CSS global apaga todas las
transiciones del dashboard (`transition-duration: 0.01ms`), y la interfaz se siente a saltos.

Verificado en el equipo del proyecto el 2026-11-23 con `SPI_GETCLIENTAREAANIMATION`: devolvía `False`
mientras Playwright, que ignora esa preferencia, mostraba las animaciones. Sintoma reportado: «en incógnito
se ve bien, en mi navegador no».

Por eso la app no depende solo del sistema. Hay un interruptor en la barra superior (`MotionToggle`) con
tres estados, y se persiste en `useUiStore`:

| Estado                | `data-motion` | Efecto                                |
| --------------------- | ------------- | ------------------------------------- |
| Sistema (por defecto) | `system`      | Manda `prefers-reduced-motion`        |
| Siempre               | `always`      | Anima aunque el sistema pida reducir  |
| Nunca                 | `never`       | No anima aunque el sistema lo permita |

La decisión vive en el CSS, con dos reglas y sin JavaScript por animación: `html[data-motion='never']`
apaga, y la media query usa `html:not([data-motion='always'])` para ceder ante la preferencia explícita.
El valor por defecto sigue siendo «Sistema»: la app es accesible sin configurar nada y quien quiera ver
las animaciones lo pide una vez.

Medido en el navegador con `prefers-reduced-motion: reduce` emulado: `transitionDuration` = `0.00001s` en
`system` y `0.24s` en `always`.

---
