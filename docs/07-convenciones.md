# 07 — Convenciones

> **Fecha:** 2026-11-20 · Reglas de estilo y de proceso. Lo que no está aquí se decide en el PR y se añade.

---

## 1. Nombres

| Elemento           | Convención                      | Ejemplo                                         |
| ------------------ | ------------------------------- | ----------------------------------------------- |
| Carpetas           | `kebab-case`                    | `shared/components/data-table/`                 |
| Componentes        | `PascalCase.tsx`                | `CountriesPage.tsx`, `CountryFormDialog.tsx`    |
| Hooks              | `use-*.ts` exportando `useX`    | `queries.ts` → `useCountriesCatalog`            |
| Tipos e interfaces | `PascalCase`, sin prefijo `I`   | `Country`, `CountryInput`, `ApiError`           |
| Constantes         | `SCREAMING_SNAKE_CASE`          | `RESOURCES`, `ACTIONS`, `DEFAULT_PAGE_SIZE`     |
| Esquemas Zod       | `xxxSchema`                     | `countryInputSchema`                            |
| Funciones          | `camelCase`, verbo primero      | `toDomain`, `buildQueryParams`, `formatCountry` |
| Query keys         | objeto `queryKeys`              | `queryKeys.countries.catalog()`                 |
| Pruebas            | `*.spec.ts(x)` junto al archivo | `mapper.spec.ts`                                |
| E2E                | `e2e/*.spec.ts`                 | `e2e/countries.spec.ts`                         |

**Sin `default export`** salvo en `routes.tsx` si una herramienta lo exige. El export nombrado facilita
renombrar y buscar.

---

## 2. Estructura de un componente

```tsx
import { useState } from 'react';
import { useCountriesCatalog } from '../api/queries';
import { DataTable } from '@/shared/components/data-table';
import type { Country } from '../domain/country';

interface CountriesPageProps {
  /** Se usa en pruebas y en el título del documento. */
  title?: string;
}

/**
 * Pantalla del nomenclador de países.
 *
 * Es la dueña del estado de la vista (búsqueda, orden, filtro) que vive en la URL;
 * los datos vienen del catálogo cacheado (ADR-013) y nunca se copian a estado local.
 */
export function CountriesPage({ title = 'Países' }: CountriesPageProps) {
  // hooks primero, luego derivados, luego render
}
```

Reglas:

- Un componente por archivo; los subcomponentes privados van debajo del principal.
- Props con `interface XxxProps` cuando se exportan; con `type Props = …` cuando son internas.
- **No** props booleanas ambiguas: `disabled` sí, `isNotEnabled` no.
- Composición (`children`, slots) antes que 20 props.
- Los componentes no formatean fechas a mano: usan `shared/lib/formatters`.

---

## 3. Imports

Orden fijo (ESLint lo impone):

1. `react` y librerías externas.
2. `@/core/*`, `@/shared/*`, `@/design-system/*`.
3. Relativos del feature (`../domain`, `../api`).
4. Estilos.

Alias `@/` → `src/`. Prohibido `../../../`. Prohibido importar de `@/features/otro-feature` (regla de
`eslint-plugin-boundaries`).

---

## 4. TSDoc

Obligatorio en APIs públicas: `core/http`, `core/auth`, `shared/components`, `features/*/api`,
`features/*/domain`.

```ts
/**
 * Convierte un país del wire al modelo de dominio.
 *
 * @remarks
 * `isUnitedState` llega del backend pero se descarta: no tiene consumidor en la UI
 * y permitiría que la vista dependiera de una regla que vive en la base de datos.
 *
 * @throws Nunca: el esquema Zod valida antes de llegar aquí.
 */
export function toDomain(dto: CountryDto): Country { … }
```

**Prohibido** el comentario que repite la firma (`// obtiene el país` sobre `getCountry`). Se documenta el
_por qué_, los invariantes y los errores; no el _qué_ evidente.

---

## 5. TypeScript

- `strict: true` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`.
- Prohibido `any`; `unknown` + validación cuando el tipo no se conoce.
- Prohibido `enum`: usar `as const` + union type.
- Prohibido `as` para silenciar: si hace falta, se documenta con un comentario que explique la invariante.
- `satisfies` para validar literales contra un tipo sin perder el tipo literal.
- Non-null `!` solo en un punto justificado (p. ej. `rootElement` de `main.tsx`).

---

## 6. Estado y efectos

- Datos del servidor → TanStack Query. Componentes con `isPending`, `error`, `data`.
- Estado global de cliente → Zustand con selectores (`useSessionStore((s) => s.user)`).
- Estado de URL → `useSearchParams`; nunca `useState` duplicando `page` o `q`.
- `useEffect` solo para: suscripciones externas, foco, `document.title`, listeners.
- Prohibido `useEffect` que copia props/estado a otro estado (es un `useMemo` o un derivado).
- Memoización (`useMemo`/`useCallback`/`memo`) **solo con medición**: sin justificación se retira en review.

---

## 7. Errores

- Toda llamada pasa por `core/http` y lanza `ApiError` (`status`, `code`, `message`, `detail`, `traceId`).
- Los mensajes de usuario salen de `toUserMessage(error)`; nunca se muestra `error.message` crudo.
- Errores inesperados → `ErrorBoundary` por ruta con «Recargar» y `traceId`.
- Prohibido `catch {}` vacío; si se ignora, se explica en un comentario.

---

## 8. Accesibilidad

- Todo control con nombre accesible (`label`, `aria-label`).
- Foco visible siempre; nunca `outline: none` sin sustituto.
- Contraste AA verificado en ambos temas.
- `prefers-reduced-motion` respetado.
- Iconos decorativos `aria-hidden`; interactivos con `aria-label`.

---

## 9. Git

### Commits (Conventional Commits)

```
feat(countries): agregar búsqueda insensible a acentos
fix(auth): compartir una sola promesa de refresh entre 401 concurrentes
refactor(core/http): extraer el parseo de ProblemDetails
test(countries): cubrir el rollback del toggle optimista
docs(adr): registrar decisión de catálogo-first
chore(deps): fijar zod 4.x
```

Alcances permitidos: `auth`, `countries`, `dashboard`, `shell`, `core`, `shared`, `design-system`, `docs`,
`deps`, `ci`.

### Ramas

`main` protegida · `feat/<slice>` · `fix/<tema>` · `docs/<tema>`. Una rama = un slice o un fix.

### PR

- Título = mensaje de commit principal.
- Descripción: qué, por qué, cómo se probó, capturas (si cambia UI).
- Checklist:

- [ ] Gate verde (`typecheck`, `lint`, `test`, `build`).
- [ ] Criterios de aceptación del slice cumplidos.
- [ ] Sin `any`, sin `console.log`, sin `TODO` sin dueño.
- [ ] Accesibilidad revisada (teclado + lector en el flujo nuevo).
- [ ] Documentación actualizada si cambió un contrato o una decisión.
- [ ] `docs/03-contratos-api.md` con fecha si se re-verificó el backend.

---

## 10. Estilos

- Solo tokens: `bg-[var(--surface)]`, `text-[var(--fg-muted)]`, `rounded-lg`.
- Prohibido hex en componentes (regla de lint).
- Utilidades Tailwind en el orden: layout → box → tipografía → color → estado.
- Clases condicionales con `cn()`, nunca concatenación de strings.
- Sin CSS modules ni styled-components: una sola estrategia.

---

## 11. Idioma

- **UI: español** (es-CU). Fechas y números con `Intl` y locale `es-CU`.
- **Código: inglés** (nombres de variables, tipos, funciones, commits).
- **Documentación y mensajes de commit de dominio: español** (es el idioma del equipo y del negocio).
- Los mensajes de validación viven en los esquemas Zod, en español, y se muestran tal cual.
