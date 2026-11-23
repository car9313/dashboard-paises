# 00 — Análisis del proyecto origen

> **Fecha:** 2026-11-20 · **Origen:** `D:\Trabajo\Proyectos\TFS\CERTIFICACION_EXTRANJEROS\CERTIFICACION_EXTRANJEROS_UI`
> **Backend:** `D:\Trabajo\Proyectos\TFS\CERTIFICACION_EXTRANJEROS\Cert_Extranjeros` (API .NET escuchando en `http://172.22.10.3:1235`)

Este documento responde una sola pregunta: **¿se puede construir este dashboard con la lógica del
proyecto origen, sin el módulo de certificación y con solo el nomenclador de países?**
La respuesta corta es **sí**, y este documento explica con qué condiciones.

---

## 1. Qué es el origen

SPA **Angular 21** standalone y **zoneless**, con arquitectura por capas y features autocontenidas.

| Elemento | Versión / valor                                                                     |
| -------- | ----------------------------------------------------------------------------------- |
| Angular  | 21.2 (fijado: no se puede subir a 22, PrimeNG 22 valida licencia por red)           |
| UI       | PrimeNG 21 + Tailwind 4 + `tailwindcss-primeui`                                     |
| Estado   | `@ngrx/signals` 21.1 con features de store propias                                  |
| Pruebas  | Vitest 4 + jsdom, **115 archivos `*.spec.ts`, 652 pruebas** en el último gate verde |
| Build    | `@angular/build:application`, presupuesto inicial 1 MB (aviso) / 5 MB (error)       |
| Paquetes | pnpm 10                                                                             |

Métricas reales de código (medidas el 2026-11-20 sobre `src/app`):

| Grupo                                  | Archivos |   Specs |     Líneas |
| -------------------------------------- | -------: | ------: | ---------: |
| `core/`                                |       96 |      36 |      5 593 |
| `layout/`                              |       15 |       5 |      1 613 |
| `shared/`                              |       51 |       9 |      2 883 |
| `theme/`                               |        2 |       1 |         63 |
| `pages/` (login, acceso, error, panel) |        8 |       1 |        556 |
| `modules/auth`                         |       11 |       3 |        534 |
| `modules/nomenclators/countries`       |       18 |       6 |      1 089 |
| `modules/nomenclators/provinces`       |       17 |       5 |      1 058 |
| `modules/nomenclators/municipalities`  |       17 |       5 |      1 267 |
| `modules/security`                     |       66 |      21 |      4 641 |
| `modules/certification`                |      106 |      24 |      6 421 |
| `modules/user-profile`                 |        3 |       0 |        172 |
| `modules/change-password`              |        6 |       1 |        381 |
| **Total**                              |  **416** | **116** | **26 271** |

---

## 2. Inventario: qué se queda y qué se va

El alcance pedido elimina **el 55 % del código** (certificación + seguridad + los otros dos nomencladores).

### Se queda (lógica a portar)

| Grupo                                                            | Qué aporta al dashboard                                                 | Destino en el nuevo proyecto                           |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------ |
| `core/services/config.service`                                   | Config de runtime (`/assets/config.*.json`) cargada antes del bootstrap | `core/config` (variables de entorno de Vite)           |
| `core/services/generic-http.service`                             | Fachada HTTP única; contrato de paginación                              | `core/http` (cliente `fetch` con `ProblemDetails`)     |
| `core/builders/http-params-builder`                              | Serialización `Pag.*`, `Search.*`, `Filter`, `Sort`                     | `core/http/params`                                     |
| `core/interfaces/query-params`                                   | Contrato de paginación del backend                                      | `core/http/types`                                      |
| `core/interceptors/auth.interceptor`                             | Bearer, 401 con **cola única de refresh**, 403 self-heal, 418           | `core/http/client` + `core/auth/refresh`               |
| `core/interceptors/http-loading`                                 | Barra global con anti-parpadeo                                          | `shared/loading` (contador de peticiones)              |
| `core/guards/*`                                                  | `auth`, `guest`, `permission`, barrera `session-ready`                  | `core/auth/guards`                                     |
| `core/store/session.store`                                       | Identidad + catálogo plano de permisos + `hasPermission`                | `core/auth/session.store` (Zustand)                    |
| `core/constants/{resources,actions,menu,route-paths}`            | Fuente única de RBAC y navegación                                       | `core/rbac` + `app/shell/nav`                          |
| `core/helpers/active-toggle`                                     | Toggle por fila: pendiente → commit → error                             | `features/countries/api` (mutación optimista)          |
| `core/store/features/*`                                          | Semántica de listado, filtros, selección, modal, pending                | Se traduce a TanStack Query + URL state + estado local |
| `shared/components/data-table`                                   | Tabla de servidor con skeleton, vacío, error, acciones                  | `shared/components/data-table` (TanStack Table)        |
| `shared/components/content-state`                                | Prioridad loading → error(+Reintentar) → vacío → contenido              | `shared/components/content-state`                      |
| `shared/components/{search, filter-*, empty-state, loading-bar}` | Piezas de toolbar                                                       | `shared/components/*`                                  |
| `shared/directives/has-permission`                               | Ocultar UI por permiso                                                  | `shared/auth/Can` (componente)                         |
| `layout/*`                                                       | Shell: topbar, menú, sidebar, breadcrumbs, footer, configurador         | `app/shell/*`                                          |
| `theme/corporate.preset`                                         | Color de marca + escala de radios                                       | `design-system/tokens`                                 |
| `modules/auth/*`                                                 | Login, huella de dispositivo, hidratación de identidad                  | `features/auth/*`                                      |
| `modules/nomenclators/countries/*`                               | El feature completo                                                     | `features/countries/*`                                 |

### Se va

| Grupo                                                | Motivo                                                                 |
| ---------------------------------------------------- | ---------------------------------------------------------------------- |
| `modules/certification` (106 archivos, 6 421 líneas) | Fuera de alcance por decisión del usuario                              |
| `modules/security` (66 archivos, 4 641 líneas)       | Usuarios, roles, auditorías y parámetros no forman parte del dashboard |
| `modules/nomenclators/provinces` + `municipalities`  | Solo se conserva el nomenclador de país                                |
| `modules/user-profile`, `modules/change-password`    | No hay gestión de cuenta en el alcance                                 |
| `pages/auth/{access,error}`                          | Se conservan como rutas mínimas, no como módulos                       |

---

## 3. Reglas de dominio que se conservan

Estas reglas no son obvias leyendo la UI; salen del código y de los contratos. **Son lo más valioso a portar.**

| Regla                                                                | Evidencia en el origen                                                 | Consecuencia en el dashboard                                                     |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| El país se identifica por **`code`** (clave natural), no por `id`    | `Country` no tiene `id`; `selectId: 'code'`; URL `/api/country/{code}` | La tabla usa `code` como `rowId`; la URL de detalle usa el código                |
| **`active` no viaja en el payload de escritura**                     | `CountryWriteDto` solo tiene `code` y `name`                           | El formulario nunca envía `active`; el estado se cambia por endpoints dedicados  |
| Desactivar es **borrado lógico**                                     | `DELETE /{code}` desactiva; la fila sigue listada                      | La UI no habla de "eliminar", habla de "desactivar"                              |
| El formulario de alta **exige `code`**; el de edición lo **bloquea** | `UpdateCountryCommand` solo acepta `name`                              | `code` es `readOnly` al editar (el backend lo ignora, pero la UI no debe mentir) |
| `isUnitedState` **no se expone** al dominio                          | `CountryMapper.toDomain` lo descarta                                   | No se modela                                                                     |
| Los permisos vienen **siempre** del API, aplanados desde los roles   | `IdentityHydrator`                                                     | Nunca se decodifica el JWT                                                       |
| Filtros de listado persisten en `sessionStorage` **versionados**     | `withFiltersPersistence` (`STORAGE_VERSION = 2`)                       | Se persiste en la URL, que es mejor: sobrevive F5 y es compartible               |
| La página vuelve a 1 al cambiar búsqueda, filtro u orden             | ADR-013 del origen                                                     | Misma regla, implementada en el hook de URL                                      |
| `switchMap` descarta respuestas obsoletas                            | `withServerTable.load`                                                 | TanStack Query lo resuelve con `signal` + clave de query                         |

---

## 4. Por qué no se reutiliza el código tal cual

No es un problema de tamaño: es que **el 100 % del `core/` está acoplado a Angular**.

| Acoplamiento                                                       | Qué rompe en React                                                                                        |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `signalStore` y sus features (`withServerTable`, `withQuery`…)     | Son `signalStoreFeature`; no hay equivalente directo. La _semántica_ se traduce, el código no             |
| Inyección de dependencias (`inject()`, `providers`)                | React no tiene DI por contexto de módulo; se sustituye por composición de hooks y un contenedor explícito |
| Directivas estructurales (`*appHasPermission`, `appTableDefaults`) | Se sustituyen por componentes `Can` y props del `DataTable`                                               |
| `Observable` + `rxMethod` + `switchMap`                            | Se sustituyen por `AbortController` + TanStack Query                                                      |
| PrimeNG (DataTable, Dialog, Toast, ToggleSwitch)                   | Se sustituyen por shadcn/ui + Radix + `sonner`                                                            |
| `providePrimeNG`, `CorporatePreset`, SCSS de layout                | Se sustituyen por tokens CSS + Tailwind 4                                                                 |
| `HttpInterceptor`                                                  | Se sustituye por un `fetch` wrapper con cola de refresh                                                   |

**Conclusión:** portar el código sería reescribirlo igual, pero arrastrando Angular. Se porta el
**conocimiento** y se reimplementa la infraestructura con las herramientas del stack elegido.

---

## 5. Qué sí se reutiliza (y es mucho)

1. **Los contratos verificados en vivo** → [`03-contratos-api.md`](03-contratos-api.md). No hay que
   adivinar el shape de `{objects, meta}` ni el casing de los campos: se probó contra el backend real.
2. **Las 9 features de store**, como especificación de comportamiento (qué debe pasar al cambiar filtros,
   con respuestas obsoletas, con una fila en vuelo).
3. **El sistema visual**: color de marca (`emerald`), escala de radios `2/4/4/6/8`, breakpoints
   `576/768/992/1200/1920`, y el patrón de shell (topbar + sidebar colapsable + breadcrumbs).
4. **Los estándares de prueba**: qué se prueba, qué no, y los anti-patrones que ya conocían.
5. **Los ADR del origen** como precedente: la decisión de RBAC en `SessionStore`, la separación
   lectura/escritura, y la regla "un solo escritor por campo".

---

## 6. Viabilidad: condiciones

| Condición                                     | Estado                                         | Nota                                                              |
| --------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| El backend responde y expone Swagger          | ✅ verificado                                  | 47 rutas, `http://172.22.10.3:1235`                               |
| CORS permite el origen de desarrollo          | ✅ verificado                                  | Refleja `http://localhost:5173` (puerto fijo)                     |
| El listado de países funciona                 | ✅ `GET /api/country/all?Pag.*`                | 249 países, 125 páginas de 2                                      |
| Se puede leer el catálogo completo de una vez | ✅ `PageSize=250` → 249 filas en una respuesta | Base del diseño _catálogo-first_                                  |
| **La búsqueda del backend funciona**          | ❌ **500**                                     | Bug de reflexión sobre `Country.GetCubaCode` (propiedad estática) |
| **El orden (`Sort`) del backend funciona**    | ❌ silenciosamente ignorado                    | Verificado con `SortBy=name&Ascending=false`                      |
| **El filtro (`Filter`) del backend funciona** | ❌ silenciosamente ignorado                    | Verificado con `active=false` → devuelve activos                  |
| El detalle por código funciona                | ⚠️ exige `Nomenclators:Read` (401 sin token)   | El origen reportó 404 con token: **sin confirmar**                |
| Hay credenciales para probar login/escrituras | ❌ pendiente del usuario                       | Se mitiga con MSW + fixtures reales                               |

Ninguna de las condiciones fallidas bloquea el dashboard: el catálogo es **acotado (249 filas) y
bounded**, así que búsqueda, orden y filtro se resuelven en cliente con latencia cero y sin depender
de endpoints rotos. Está registrado como [ADR-013](01-adr-stack.md#adr-013--catálogo-first-para-países).

---

## 7. Esfuerzo estimado (por slice vertical)

Estimación de una persona con el stack ya montado; incluye pruebas del slice, no la fase 0.

| Slice                   | Alcance                                           | Archivos nuevos (aprox.) |     Esfuerzo |
| ----------------------- | ------------------------------------------------- | -----------------------: | -----------: |
| Shell + tokens + router | layout, navegación, tema, catálogo base           |                    25–30 |       2 días |
| Auth                    | login, tokens, refresh, guards, RBAC              |                    18–22 |     2,5 días |
| Países · lectura        | catálogo, tabla, búsqueda/orden/filtro, URL state |                    16–20 |       2 días |
| Países · escritura      | alta, edición, toggle optimista, toasts           |                    14–18 |       2 días |
| Detalle + inicio        | diálogo de detalle, métricas derivadas            |                    10–12 |     1,5 días |
| Sistema de diseño       | catálogo `/design-system`, dark mode, a11y        |                     8–10 |     1,5 días |
| Endurecimiento          | e2e, CI, presupuestos, docs                       |                     8–12 |     1,5 días |
| **Total**               |                                                   |             **~100–120** | **~13 días** |

Comparación con la alternativa Angular recortado: ~4 días, pero atado a Angular 21/PrimeNG y sin
propiedad real del código. La decisión de pagar 13 días por un proyecto propio y moderno está
registrada en [ADR-001](01-adr-stack.md#adr-001--react-19--vite--typescript).

---

## 8. Conclusión

**Sí es viable**, con tres matices que el diseño ya absorbe:

1. **No es un fork, es un port de lógica.** El 55 % se descarta y el 45 % restante se reescribe porque
   está acoplado a Angular; lo que se conserva es el conocimiento, y ese es el activo.
2. **El backend tiene tres defectos reales** en justo la pantalla que se conserva (búsqueda, orden, filtro).
   El diseño _catálogo-first_ los esquiva sin mentir al usuario, y quedan documentados como deuda del
   backend, no como limitación de la UI.
3. **El alcance es pequeño y acotado**, lo que permite hacerlo bien: vertical slices, sistema de diseño
   propio y pruebas desde el primer slice en lugar de "para después".
