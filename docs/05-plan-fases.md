# 05 — Plan por fases y slices verticales

> **Fecha:** 2026-11-20 · **Estrategia:** cada fase entrega **slices verticales completos**
> (dominio → api → ui → ruta → prueba), no capas horizontales a medio terminar.

---

## 1. Reglas del plan

1. **Un slice termina cuando está probado y el gate está verde.** No se acumula deuda entre slices.
2. **Cada fase deja la app ejecutable**: al final de cualquier fase se puede hacer `pnpm dev` y usar lo
   construido.
3. **Gate único por fase:**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

4. **Nada de "después lo pruebo".** La prueba del slice se escribe en el mismo slice.
5. **Un ADR nuevo si cambia una decisión** de [`01-adr-stack.md`](01-adr-stack.md).

### Plantilla de un slice

| Paso          | Salida                                                 | Criterio                                 |
| ------------- | ------------------------------------------------------ | ---------------------------------------- |
| 1. Dominio    | tipos + esquemas Zod en `domain/`                      | TypeScript puro, sin React               |
| 2. Contrato   | endpoint verificado y anotado en `03-contratos-api.md` | evidencia real, no Swagger a ciegas      |
| 3. API        | `dto.ts` + `mapper.ts` + `repositories.ts` + hooks     | mapper con spec; errores tipados         |
| 4. UI         | página/componentes                                     | estados `loading`/`error`/`empty` y a11y |
| 5. Ruta + nav | `routes.tsx` + entrada en `shell/nav.ts`               | RBAC declarado en `data`                 |
| 6. Prueba     | unit + integración (+ e2e si es crítico)               | al menos un caso feliz y un borde        |

---

## 2. Vista general

| Fase   | Objetivo                   | Slices                                            |                      Entregable visible |  Esfuerzo |
| ------ | -------------------------- | ------------------------------------------------- | --------------------------------------: | --------: |
| **F0** | Decisiones y documentación | —                                                 |                      9 documentos + ADR |  ✅ hecho |
| **F1** | Fundaciones                | S0 Shell · S1 Design system base · S2 Datos mock  | App vacía navegable con tema y catálogo |       2 d |
| **F2** | Sesión y seguridad         | S3 Login · S4 Sesión/refresh · S5 Guards+RBAC     |           Login real y rutas protegidas |     2,5 d |
| **F3** | Países · lectura           | S6 Catálogo · S7 Tabla · S8 Búsqueda/orden/filtro |                 Listado completo usable |       2 d |
| **F4** | Países · escritura         | S9 Alta · S10 Edición · S11 Activar/desactivar    |                           CRUD completo |       2 d |
| **F5** | Detalle + inicio           | S12 Detalle · S13 Métricas                        |             Pantalla de inicio con KPIs |     1,5 d |
| **F6** | Sistema de diseño y a11y   | S14 Catálogo · S15 Temas · S16 Auditoría a11y     |               `/design-system` completo |     1,5 d |
| **F7** | Endurecimiento             | S17 E2E · S18 CI · S19 Rendimiento · S20 Traspaso |                 Pipeline y docs finales |     1,5 d |
|        |                            | **20 slices**                                     |                                         | **~13 d** |

Dependencias: F1 → F2 → F3 → F4 → F5 → F6 → F7. F6 puede solaparse con F3 en adelante
(cada componente nuevo se documenta al crearse).

---

## 3. F0 — Decisiones y documentación ✅

**Salida:** `README.md`, `AGENTS.md` y `docs/00…08`.

**Criterios de aceptación**

- [x] Stack cerrado con alternativas y criterio de reversión (16 ADR).
- [x] Arquitectura vertical slice con reglas de dependencia verificables por lint.
- [x] Contratos del API verificados en vivo, incluidos los tres defectos del backend.
- [x] Sistema de diseño con tokens concretos (color, radios, tipografía, espaciado, breakpoints).
- [x] Plan por fases con criterios de aceptación y gates.
- [x] Estrategia de pruebas, convenciones y riesgos.

---

## 4. F1 — Fundaciones

**Estado:** ✅ completada (2026-11-20) — gate verde y verificación en navegador (claro y oscuro).

**Objetivo:** un esqueleto que arranca, navega, se ve bien y ya tiene el sistema de datos simulado.

### S0 · Shell navegable

- Scaffold Vite + React 19 + TS `strict`, alias `@/`.
- `AppShell`: sidebar colapsable (260/72 px), topbar (breadcrumb, tema, usuario placeholder), `<Outlet/>`.
- `nav.ts` tipado, con `resource`/`actions` por ítem (aún sin sesión: todo visible).
- Rutas: `/` (inicio), `/nomencladores/paises`, `/design-system`, `/login`, `/acceso-denegado`, `/404`.
- Tokens aplicados; Tailwind 4; sin colores hardcodeados.

**Archivos:** `index.html`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `src/app/*`,
`src/app/shell/*`, `src/design-system/tokens.css`, `src/styles.css`, `src/shared/ui/{button,input,skeleton}`.

**Criterios**

- [ ] `pnpm dev` en `http://localhost:5173` muestra el shell sin errores de consola.
- [ ] Sidebar colapsa y persiste la preferencia; en `< lg` es drawer.
- [ ] Navegación por teclado completa; foco visible.
- [ ] `pnpm build` genera un bundle **< 250 KB gzip** (sin librerías de datos usadas todavía).

**Pruebas:** render del shell, colapso de sidebar, ítem activo por ruta.

### S1 · Sistema de diseño base

- `button`, `input`, `label`, `switch`, `badge`, `skeleton`, `dialog` (shadcn adaptados a tokens).
- `cn()`, `cva`, iconos lucide.

**Criterios**

- [ ] Cada primitiva tiene variantes y estados documentados en su TSDoc.
- [ ] Ningún hex fuera de `tokens.css` (lint lo verifica).

**Pruebas:** una por variante crítica (button `loading`, input `error`, switch `disabled`).

### S2 · Datos simulados

- Exportar las **249 filas reales** a `src/mocks/fixtures/countries.json`.
- Handlers MSW: `POST /api/auth/login`, `GET /api/auth/user/current`, `GET /api/country/all`,
  `GET /api/country/{code}`, `POST/PUT/DELETE` con estado en memoria.
- Conmutador `VITE_API_MODE=live|mock`.
- `openapi-typescript` configurado (`pnpm api:types`).

**Criterios**

- [ ] `VITE_API_MODE=mock pnpm dev` devuelve los 249 países.
- [ ] En modo `live` la app llama al backend real (lectura pública ya funciona).
- [ ] `src/core/api/schema.d.ts` generado y commiteado.

**Pruebas:** el handler de `/all` respeta `Pag.Page/PageSize`; el de detalle devuelve el país por código.

### Gate F1

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

**Riesgo:** instalar shadcn con Tailwind 4 exige la versión correcta de la CLI. _Mitigación:_ si falla, se
copian las primitivas a mano (son ~8 componentes) y se aísla en `shared/ui`.

---

## 5. F2 — Sesión y seguridad

**Estado:** ✅ completada (2026-11-20) — 79 pruebas, gate verde, verificado en navegador:
login, F5 con restauración, logout y 403 por RBAC.

**Objetivo:** login real contra el API, sesión persistente entre recargas y RBAC operativo.

### S3 · Login

- `features/auth/domain`: `LoginCredentials`, `SessionUser`, `Permission`.
- `session.api.ts`: `login`, `userCurrent`, `refresh`, `logout`.
- `login.use-case.ts`: login → guardar tokens → `user/current` → hidratar sesión → navegar a `/`.
- `LoginPage`: formulario RHF + Zod, error de credenciales, `loading`, `autofocus`, `Enter` envía.
- Huella de dispositivo **persistente** (`localStorage`, generada una vez) para la sesión única del backend.

**Criterios**

- [ ] Con credenciales válidas entra al inicio; con inválidas muestra «Usuario o contraseña incorrectos».
- [ ] El formulario no pierde lo escrito si el backend responde 5xx.
- [ ] `pnpm test` cubre: éxito, 401, 5xx y validación.

### S4 · Persistencia y refresh

- `token-storage.ts`: access en memoria; refresh cifrado AES-GCM en `localStorage`.
- Cliente HTTP: adjunta `Bearer`; en `401` dispara **una** promesa de refresh compartida y reintenta una vez;
  si el refresh falla con 401/418 → limpiar sesión + `/login`. Un error de red **no** cierra sesión.
- Restauración al arrancar: si hay refresh y `expiresIn` vencido, refresh silencioso antes de renderizar rutas.

**Criterios**

- [ ] F5 conserva la sesión; cerrar pestaña y volver también.
- [ ] 5 peticiones simultáneas con token vencido producen **1** refresh y 5 reintentos.
- [ ] `418` fuerza logout inmediato.
- [ ] Pruebas: cola única (contador de llamadas), reintento único, fallo de refresh.

### S5 · Guards y RBAC

- `requireAuth`, `guestOnly`, `requirePermission(resource, actions)` como `loader` de React Router.
- `<Can>` para botones.
- Sidebar filtra por permisos; `/acceso-denegado` con mensaje claro y enlace atrás.
- `useSessionStore.hasPermission` como único predicado (ADR-014).

**Criterios**

- [ ] Acceder a `/nomencladores/paises` sin permiso `Nomenclators:Read` redirige a acceso denegado.
- [ ] Sin sesión, cualquier ruta privada lleva a `/login?redirect=<ruta>` y vuelve tras entrar.
- [ ] Botón «Nuevo país» oculto sin `Crear`; el switch deshabilitado sin `Actualizar`.

**Pruebas:** guard sin sesión, guard sin permiso, guard con permiso, menú filtrado, `<Can>`.

### Gate F2

Gate completo + prueba manual del login contra el backend real (si el usuario aporta credenciales) o contra
MSW con los dos usuarios de fixture.

---

## 6. F3 — Países · lectura

**Estado:** ✅ completada (2026-11-20) — 112 pruebas, gate verde, verificado en navegador:
249 países, búsqueda «espana» → 1 resultado con la URL como fuente de verdad.

**Añadido después (2026-11-20): persistencia de filtros.** El origen recordaba los filtros con
`sessionStorage`; la URL no cubría volver a la pantalla desde el menú. Se portó la política del origen
(versión, TTL, descarte de payloads inválidos) dejando la URL como dueña: lo guardado solo se aplica si
la URL llega vacía. Ver ADR-018 y `ui/country-filters-storage.ts`.

**Objetivo:** la pantalla principal, completa y rápida.

### S6 · Catálogo

- `domain/country.ts` (`Country`, `CountryInput`) y `domain/schemas.ts`.
- `api/dto.ts` (`CountryDto` con `isUnitedState`), `api/mapper.ts` (lo descarta).
- `api/repositories.ts`: `getCatalog()` → `GET /api/country/all?Pag.Page=1&Pag.PageSize=250`,
  `getByCode()` → `GET /api/country/{code}`, y el path paginado listo tras flag (ADR-013).
- `api/queries.ts`: `useCountriesCatalog()` con `staleTime` 5 min y validación Zod de la respuesta.

**Criterios**

- [ ] Una sola petición al entrar; al volver en < 5 min no hay petición.
- [ ] Respuesta inválida del backend → error tipado, no `undefined` silencioso.
- [ ] Mapper probado con el JSON real de fixture.

### S7 · Tabla

- `CountryTable` con `DataTable`: columnas Nombre · Código · Estado · Acciones.
- Skeleton de 5 filas al cargar; `ErrorState` con Reintentar; `EmptyState` y `empty-filtered`.
- Paginación de cliente (10/25/50), `aria-sort` en Nombre y Código.

**Criterios**

- [ ] 249 filas paginan a 25 páginas con 10 por página; cambiar tamaño vuelve a página 1.
- [ ] Error simulado (MSW 500) muestra Reintentar y no rompe el layout.
- [ ] Fila operable con teclado; acciones accesibles por nombre.

### S8 · Búsqueda, orden y filtro (en cliente)

- Búsqueda por nombre y código, insensible a acentos y mayúsculas, con debounce 250 ms.
- Orden por nombre y código (asc/desc).
- Filtro por estado (`Todos` / `Activos` / `Inactivos`) y contador de filtros activos.
- **Estado en la URL**: `?q=&sort=&dir=&status=&page=&size=`. Al cambiar búsqueda, orden o filtro → `page=1`.
- Botón «Limpiar filtros».

**Criterios**

- [ ] `?q=cub` en la URL reproduce la búsqueda al recargar y al compartir el enlace.
- [ ] «cuba» y «Cuba» dan el mismo resultado; «espana» encuentra «España».
- [ ] Atrás del navegador deshace filtros uno a uno.
- [ ] Tests: normalización de acentos, sin resultados, combinación búsqueda+filtro+orden.

### Gate F3

Gate completo + verificación manual con `VITE_API_MODE=live` (el listado es público, no necesita token).

---

## 7. F4 — Países · escritura

**Estado:** ✅ completada (2026-11-20) — 128 pruebas, gate verde, verificado en navegador:
alta (250 países) y activar/desactivar optimista.

**Objetivo:** CRUD completo con feedback inmediato y sin recargar la tabla.

### S9 · Alta

- `CountryFormDialog` en modo `create`: `code` (2 letras, mayúsculas automáticas) + `name`.
- `useCreateCountry`: POST, invalida `countries`, cierra, toast «País creado», foco al disparador.
- Conflicto `409`/duplicado: error en el campo `code` sin perder datos.

### S10 · Edición

- Mismo diálogo en modo `edit`: `code` `readOnly`, `name` editable.
- `useUpdateCountry`: PUT `{ name }`; si el contrato rechazara el cambio, el error se muestra en el diálogo.

### S11 · Activar / desactivar

- `useToggleCountry`: mutación **optimista** (`onMutate` parchea la caché, guarda snapshot, `onError` restaura).
- Fila en vuelo: switch `disabled` + `aria-busy`; el resto de filas siguen operables.
- Texto de la acción: «activar» / «desactivar» (nunca «eliminar»): es borrado lógico.

**Criterios (F4)**

- [ ] Crear un país lo deja visible sin recargar la página.
- [ ] Desactivar actualiza la insignia y el switch al instante; si el backend falla, **vuelve** y avisa.
- [ ] Doble clic en el switch no dispara dos peticiones.
- [ ] Formulario inválido: foco en el primer error, sin llamada al API.
- [ ] Tests: mapper `toWriteDto` (nunca envía `active`), mutación optimista con rollback, validaciones.

### Gate F4

Gate completo. Requiere credenciales reales para la verificación manual; si no las hay, se valida con MSW y
queda anotado como pendiente en `08-riesgos-y-deuda.md`.

---

## 8. F5 — Detalle + inicio con métricas

**Estado:** ✅ completada (2026-11-20) — 145 pruebas, gate verde, verificado en navegador: KPIs
(249/249/0/100 %) y detalle servido desde caché con sus acciones.

### S12 · Detalle

- `CountryDetailDialog`: nombre, código, estado, fecha de consulta.
- **Fuente:** catálogo en caché por `code` (ADR-013); si el `code` no está en caché (enlace directo),
  `GET /api/country/{code}` con `ContentState` y Reintentar (maneja el 404 conocido).
- Acciones permitidas según permisos: editar / activar-desactivar.

### S13 · Inicio con métricas

- `features/dashboard/domain/metrics.ts` (puro): `total`, `active`, `inactive`, `percentageActive`,
  `byInitialLetter` (para un mini gráfico de barras), `lastSync`.
- `KpiCard` ×4 + lista de «accesos rápidos» + tabla resumida de los 5 últimos alfabéticamente.
- Todo derivado del catálogo: **cero peticiones extra**.

**Criterios**

- [ ] Los KPIs coinciden con el conteo real del catálogo (test unitario con fixture).
- [ ] Con el catálogo cargando, muestra skeletons; con error, `ErrorState` con Reintentar.
- [ ] El inicio funciona sin permiso de `Nomenclators` (solo muestra lo permitido).

**Gate F5:** completo.

---

## 9. F6 — Sistema de diseño y accesibilidad

**Estado:** ✅ completada (2026-11-20) — 178 pruebas, gate verde, verificado en navegador en ambos
temas. La auditoría encontró **11 tokens** por debajo de AA y se corrigieron con evidencia numérica
(tabla en [`04-sistema-diseno.md`](04-sistema-diseno.md) §6.1).

### S13 · Accesibilidad verificable

- `design-system/tokens.contrast.spec.ts`: contrasta los tokens reales de `tokens.css` (11 pares de
  texto a 4.5:1 + 3 de interfaz a 3:1, en claro y oscuro).
- `test-utils/a11y.ts` + `app/a11y.spec.tsx`: `axe-core` sobre login, Países, inicio y catálogo, con
  un control que demuestra que el verificador detecta violaciones.

### S14 · Catálogo `/design-system`

- Secciones: Fundamentos, Componentes, Patrones, Temas.
- Cada componente: propósito, variantes, estados y snippet de uso.
- Ampliado con lo que nació en F3–F5: `KpiCard`, `SearchInput`, `Select`, `StatusBadge`, `EmptyState`,
  `ErrorState` y `DataTable` funcional (orden y paginación reales).

### S15 · Temas

- `useThemeStore` (`light`/`dark`/`system`), persistido, sin parpadeo al cargar
  (script inline en `index.html` que fija la clase antes del primer paint).
- Contraste verificado en ambos temas.

### S16 · Auditoría de accesibilidad

- Recorrido de teclado de todas las pantallas; `aria-sort`, `aria-busy`, `role="status"` en toasts.
- `prefers-reduced-motion` y zoom al 200 %.
- Checklist de [§6 del sistema de diseño](04-sistema-diseno.md#6-accesibilidad-checklist-obligatorio).

**Criterios**

- [ ] `/design-system` no lanza errores y cubre todos los componentes de `shared/ui`.
- [ ] Cambio de tema sin _flash_ y sin perder la ruta.
- [ ] Ningún control inalcanzable por teclado (revisión manual documentada).

**Gate F6:** completo + build del catálogo por debajo del presupuesto.

---

## 10. F7 — Endurecimiento

**Estado:** ✅ completada (2026-11-20) — **12 e2e** en verde contra navegador real (Edge, modo `mock`),
arranque medido en **183.9 KB gzip** (margen de 66 KB), CI escrito y gate único `pnpm verify`.

### S17 · E2E (Playwright)

- `login → listado → crear → editar → desactivar → logout`, contra MSW o backend.
- Un test de RBAC: usuario sin `Crear` no ve el botón.

Implementado en `e2e/critical-flow.spec.ts` (12 pruebas): redirección con `?redirect`, credenciales
inválidas, **F5 que conserva la sesión** (la regresión de ADR-017), logout que protege rutas, búsqueda
sin acentos, orden, paginación con la URL como fuente de verdad, alta, desactivación optimista que
**sobrevive a la recarga**, detalle desde caché, RBAC de solo lectura y el enlace «Saltar al contenido»
alcanzable con el primer `Tab`.

### S18 · CI

- Workflow: `install → typecheck → lint → test --coverage → build → e2e`.
- Verificación de que `schema.d.ts` coincide con el Swagger (si hay red; si no, se omite con aviso).
- Caché de pnpm y de Playwright.

Implementado en `.github/workflows/ci.yml` con dos jobs: **quality** (`typecheck → lint → test → build
→ size`) y **e2e** (Chromium con `--with-deps`, artefactos `playwright-report`/`test-results` si falla).
La verificación del esquema OpenAPI queda pendiente de credenciales (Q1–Q7 de `docs/08`).

### S19 · Rendimiento

- Presupuesto: JS inicial **< 250 KB gzip**, LCP **< 2.5 s** en 3G rápida, sin _layout shift_ en la tabla.
- Lazy de las rutas pesadas (`/design-system` fuera del bundle inicial).
- Revisión con el skill `vercel-react-best-practices` (memoización justificada, sin `useMemo` decorativo).

`pnpm size` (`scripts/check-bundle.mjs`) sigue el **grafo real de `index.html`** —entrada y sus `import`
estáticos— y suma gzip; no confunde el tamaño de un chunk suelto con el arranque. Medición actual:
**183.9 KB gzip** en 3 archivos JS + 6.8 KB de CSS. Los esqueletos de tabla y KPI conservan la altura,
así que la carga no desplaza el contenido.

### S20 · Traspaso

- Actualizar `README.md`, `docs/00…08` y `AGENTS.md` con el estado real.
- `docs/09-bitacora.md` con lo hecho, lo decidido sobre la marcha y lo pendiente.

**Criterios**

- [x] Gate verde (`pnpm verify`).
- [x] Presupuesto de bundle cumplido y registrado.
- [x] E2E del flujo crítico en verde contra navegador real.
- [ ] CI verde en un PR de prueba (el repo aún no tiene remoto).
- [ ] Un desarrollador nuevo levanta el proyecto siguiendo solo el README.

**Gate F7:** completo + `pnpm e2e` verde.

---

## 13. F8 — Administración de usuarios

**Estado:** ✅ completada (2026-11-20) — 207 pruebas unitarias, 17 e2e, gate verde, verificado en
navegador: listado de 12 usuarios, alta, paginación de servidor y acciones protegidas.

**ADR:** 019 · **Origen:** `modules/security/users`

| Slice | Entregable                                                                                                                             |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------- |
| S21   | Dominio: `User`, `RoleRef`, esquemas de alta y edición (contraseña obligatoria al crear, opcional al editar, confirmación coincidente) |
| S22   | API: listado paginado, detalle, alta, edición, borrado y restablecer contraseña                                                        |
| S23   | UI: `UsersPage` con tabla, paginación de servidor y acciones por fila (`isUnEditable` / `isUnDeletable`)                               |
| S24   | Diálogos: alta/edición con roles múltiples y detalle; restablecer contraseña con clave temporal                                        |
| S25   | RBAC y rutas: recurso `User` (Leer/Crear/Actualizar/Eliminar) en menú, guardas y botones                                               |
| S26   | Pruebas: contratos con MSW, validaciones, acciones deshabilitadas, e2e del alta de un usuario                                          |

**Decisiones de implementación.** Sin `Search.SearchText` (BE-001); búsqueda en cliente sobre lo cargado
y aviso visible. Paginación real con `Pag.Page`/`Pag.PageSize`. `userType` omitido como en el origen (Q8).

---

## 14. F9 — Roles y permisos

**Estado:** ✅ completada (2026-11-20) — 223 pruebas, 20 e2e, gate verde, verificado en navegador:
matriz por categoría, permisos del rol marcados, ida y vuelta real y roles del sistema de solo lectura.

**ADR:** 019 · **Origen:** `modules/security/roles`

| Slice | Entregable                                                                                     |
| ----- | ---------------------------------------------------------------------------------------------- |
| S27   | Dominio: `Role`, `Permission`, `ActionCommand`; catálogo por categoría                         |
| S28   | API: CRUD de roles, catálogo de permisos, permisos por rol y guardado                          |
| S29   | UI: `RolesPage` con tabla y acciones; diálogo de nombre                                        |
| S30   | Editor de permisos: matriz recurso × acción por categoría, con ida y vuelta al API             |
| S31   | Pruebas: matriz (marcar/desmarcar, guardar solo lo seleccionado), roles del sistema protegidos |

---

## 11. Trazabilidad requisito → slice → prueba

| Requisito                       | Slice  | Prueba                            |
| ------------------------------- | ------ | --------------------------------- |
| Entrar con usuario y contraseña | S3     | unit (use-case) + e2e             |
| Mantener sesión tras F5         | S4     | unit (refresh) + e2e              |
| Solo ver lo permitido           | S5     | unit (guards) + e2e RBAC          |
| Ver los 249 países              | S6, S7 | integración MSW + e2e             |
| Buscar «cuba»                   | S8     | unit (normalize) + e2e            |
| Ordenar por nombre              | S8     | unit (sorting)                    |
| Filtrar inactivos               | S8     | unit + integración                |
| Crear país                      | S9     | unit (schema) + e2e               |
| Editar nombre                   | S10    | integración                       |
| Activar/desactivar              | S11    | unit (optimista + rollback) + e2e |
| Ver detalle                     | S12    | integración                       |
| Ver métricas                    | S13    | unit (metrics)                    |
| Usar con teclado y lector       | S16    | checklist manual + e2e a11y       |
| Tema claro/oscuro               | S15    | unit (store)                      |

---

## 12. Definition of Done (global)

Un slice está _hecho_ cuando:

- [ ] Cumple sus criterios de aceptación (los de este documento).
- [ ] Tiene pruebas con al menos un camino feliz y un borde.
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` en verde.
- [ ] Sin `any`, sin `console.log`, sin `TODO` sin dueño.
- [ ] Accesible: teclado, foco, `aria` y contraste.
- [ ] Documentado: TSDoc en APIs públicas y entrada en el catálogo si aporta un componente.
- [ ] Si tocó un contrato, `docs/03-contratos-api.md` actualizado con fecha y evidencia.
