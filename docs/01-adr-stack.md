# 01 — Decisiones de arquitectura (ADR)

> **Fecha:** 2026-11-20 · Cada decisión incluye alternativas descartadas, consecuencias y **criterio de reversión**:
> el supuesto que, si deja de cumplirse, obliga a reabrirla.

Formato: contexto → decisión → alternativas → consecuencias → reversión.

---

## ADR-001 — React 19 + Vite + TypeScript

**Estado:** aceptada · **Reemplaza a:** reutilizar el proyecto Angular recortado

**Contexto.** El código del origen (416 archivos, 26 271 líneas) está acoplado a Angular 21 en su
totalidad: `signalStore`, DI, directivas estructurales y PrimeNG. El 55 % del código queda fuera de
alcance de todos modos.

**Decisión.** Proyecto nuevo con **React 19 + Vite 8 + TypeScript `strict`**, en modo SPA. Se porta la
lógica (contratos, reglas, UX), no el código.

**Alternativas.**

| Alternativa                           | Por qué no                                                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Angular 21 recortado (borrar módulos) | ~4 días en lugar de ~13, pero hereda Angular 21 fijado, PrimeNG, SCSS global y una arquitectura que no es la pedida (vertical slice) |
| Next.js (App Router)                  | Panel interno tras login, sin SEO ni SSR; añade servidor, RSC y caché de dos niveles sin beneficio                                   |
| Astro / Remix                         | Ninguno aporta nada a una SPA autenticada contra una API .NET existente                                                              |

**Consecuencias.**

- ➕ Control total del código, stack actual, sin la restricción "Angular 21 fijado".
- ➕ El nombre del repo (`dashboard-react`) coincide con la intención.
- ➖ Se reescriben ~100 archivos; la red de seguridad de los 652 tests del origen no viaja.
- ➖ El conocimiento del dominio hay que extraerlo a mano (mitigado por `docs/03-contratos-api.md`).

**Reversión.** Si el objetivo pasara a ser "entregar en una semana" o hubiera que compartir componentes
con la app Angular, se reabre.

---

## ADR-002 — shadcn/ui sobre Radix + Tailwind 4

**Estado:** aceptada

**Contexto.** Se necesita un sistema de diseño propio (decisión del usuario) con control real de tokens,
y a la vez una tabla, diálogos, formularios y toasts accesibles.

**Decisión.** **shadcn/ui** (componentes copiados al repo, construidos sobre Radix UI) + **Tailwind 4** con
tokens en CSS variables.

**Alternativas.**

| Alternativa           | Por qué no                                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| PrimeReact            | Paridad visual con el origen, pero theming fuera de Tailwind, bundle mayor y "tema ajeno" que pelea con tokens propios |
| Mantine v8            | Excelente, pero impone su sistema de estilos y sus primitivas; menos control del diseño propio                         |
| MUI v7                | Theming rígido, look Google, y el DataGrid interesante es de pago                                                      |
| Radix puro sin shadcn | Es lo mismo con más trabajo: shadcn ya es el código del componente, editable                                           |

**Consecuencias.**

- ➕ El código del componente es tuyo: se adapta a los tokens sin peleas.
- ➕ Accesibilidad de Radix (foco, teclado, `aria`) sin implementarla.
- ➖ Hay que mantener componentes copiados (actualizaciones manuales).
- ➖ `shadcn` añade una CLI y convenciones; el primer montaje requiere decidir estructura de `shared/ui`.

**Reversión.** Si apareciera necesidad de un grid empresarial, se evalúa AG Grid solo para esa tabla
(ver ADR-008).

---

## ADR-003 — TanStack Query como único dueño del estado de servidor

**Estado:** aceptada

**Contexto.** El origen separaba lectura (`withServerTable`) y escritura (`withServerTableWrites`), cancelaba
respuestas obsoletas con `switchMap` y bloqueaba acciones por fila con `pendingSet`.

**Decisión.** **TanStack Query v5** es el único lugar donde vive el estado del servidor: listado, detalle,
mutaciones e invalidación. Ningún `useState` guarda datos que vengan del API.

**Alternativas.** SWR (menos herramientas de mutación), hooks propios (reimplementar deduplicación y
cancelación), RTK Query (arrastra Redux).

**Consecuencias.**

- ➕ Cancelación por clave, deduplicación, `staleTime` por recurso, devtools y `onMutate` para optimismo.
- ➕ El equivalente de `switchMap` es `signal` + clave de query: no hay carrera posible.
- ➖ Una capa conceptual nueva para quien venga de `signalStore`.

**Reversión.** No se contempla; sustituirlo implicaría reescribir la capa `api/` de cada feature.

---

## ADR-004 — Caché por recurso y escrituras optimistas

**Estado:** aceptada

**Contexto.** El usuario pidió una política de caché explícita. El origen recargaba el listado completo
después de cada escritura y marcaba la fila en vuelo (`pendingSet`).

**Decisión.**

| Recurso                    | `staleTime` | `gcTime` | Notas                                                                |
| -------------------------- | ----------: | -------: | -------------------------------------------------------------------- |
| Catálogo de países         |       5 min |   30 min | 249 filas; base de la tabla                                          |
| Detalle de país            |       5 min |   30 min | Se sirve del catálogo si está en caché                               |
| Identidad (`user/current`) |       1 min |   10 min | `refetchOnWindowFocus: true`                                         |
| Mutaciones                 |           — |        — | Invalidan catálogo + detalle; `toggle` es **optimista con rollback** |

Reglas: `retry: 1` en queries de lectura (nunca en mutaciones), `refetchOnWindowFocus` desactivado salvo
identidad, y **toda** mutación invalida `countries` (no se parchea a mano salvo el toggle).

**Alternativas.** Conservadora (`staleTime: 0`, siempre revalidar) → parpadeos; persistida en disco →
complejidad y datos sensibles en `localStorage`.

**Consecuencias.** ➕ UI instantánea al volver a la pantalla; ➖ hay que invalidar con disciplina o se ven
datos viejos.

**Reversión.** Si el nomenclador pasa a ser editable por varios usuarios a la vez, se baja `staleTime`
a 30 s y se añade `refetchInterval` mientras la pestaña está visible.

---

## ADR-005 — Zustand para el estado de cliente

**Estado:** aceptada

**Contexto.** Hay tres estados que no son del servidor: **sesión** (identidad, permisos), **tema**
(claro/oscuro/compacto) y **UI** (sidebar colapsado).

**Decisión.** **Zustand v5**, un store por dominio (`useSessionStore`, `useThemeStore`, `useUiStore`),
con selectores finos y sin middleware más allá de `persist` para el tema.

**Alternativas.** Context + `useReducer` (más código y re-renders amplios), Jotai (granularidad que no
necesitamos), sin librería (el store de sesión acabaría en un Context con API pobre).

**Consecuencias.** ➕ Acceso fuera de React (el cliente HTTP necesita el token), `subscribe` para
interceptar, devtools; ➖ una dependencia más.

**Reversión.** Trivial: los stores son funciones puras sobre estado; se pueden sustituir por Context.

---

## ADR-006 — react-hook-form para formularios

**Estado:** aceptada

**Contexto.** Dos formularios reales (alta y edición de país) con validación, estado `pending`, errores
del servidor y `markAllAsTouched` al enviar inválido (patrón del origen).

**Decisión.** **react-hook-form v7** con `mode: 'onTouched'` y `resolver` de Zod.

**Alternativas.** TanStack Form (más nuevo, menos rodaje), Formik (en declive), controlado propio
(re-render por tecla).

**Consecuencias.** ➕ Mínimos re-renders, `formState.errors` tipado, integración directa con el resolver;
➖ API de `register` con `ref` que confunde al principio.

**Reversión.** Si TanStack Form estabiliza y el equipo lo prefiere, los formularios son dos.

---

## ADR-007 — Zod 4 para validación y contratos

**Estado:** aceptada

**Contexto.** Se valida en tres fronteras: formulario, respuesta del API y parámetros de URL.

**Decisión.** **Zod 4**: un esquema por frontera, tipos inferidos (`z.infer`), mensajes en español.

```ts
export const countryInputSchema = z.object({
  code: z
    .string()
    .trim()
    .length(2, 'El código debe tener 2 letras')
    .regex(/^[A-Za-z]{2}$/, 'Solo letras'),
  name: z.string().trim().min(2, 'Mínimo 2 caracteres').max(80, 'Máximo 80 caracteres')
});
```

**Alternativas.** Valibot (bundle menor, ecosistema menor), Yup (sin inferencia), sin librería.

**Consecuencias.** ➕ Una sola fuente para tipo + validación + mensaje; ➕ valida la respuesta del backend
para no confiar en el wire. ➖ Zod 4 es joven: revisar notas de migración al fijar versión.

**Reversión.** Los esquemas están aislados en `domain/schemas.ts`; cambiar de librería no toca componentes.

---

## ADR-008 — TanStack Table headless + `DataTable` propio

**Estado:** aceptada

**Contexto.** El origen tenía un `app-data-table` como contrato único: paginación de servidor, skeleton
de filas, estado vacío, error con reintento, acciones de fila inline o en menú, selección y `pendingSet`.

**Decisión.** **TanStack Table v8** (headless) dentro de un `DataTable` propio que reproduce ese contrato
como API de props. Las columnas se declaran con `ColumnDef` + celdas custom.

**Alternativas.** AG Grid (potencia que no se necesita y licencia), MUI DataGrid (atado a MUI), PrimeReact
DataTable (atado a PrimeReact).

**Consecuencias.** ➕ Paginación, orden y filtrado en cliente o servidor con el mismo motor; ➕ control total
del markup y de los tokens; ➖ hay que escribir la accesibilidad de la tabla (caption, `aria-sort`, foco).

**Reversión.** El `DataTable` expone props, no TanStack Table: se puede cambiar el motor sin tocar páginas.

---

## ADR-009 — `openapi-typescript` + cliente propio

**Estado:** aceptada

**Contexto.** El backend expone Swagger vivo con 47 rutas y ya cambió contratos sin avisar (el 404 del
detalle). Escribir tipos a mano garantiza deriva.

**Decisión.** `openapi-typescript` genera `src/core/api/schema.d.ts` desde `/swagger/v1/swagger.json`.
Encima, DTOs y mappers escritos a mano **solo** para las 4 entidades usadas. El cliente HTTP es propio
(ver ADR-012 para tokens), no generado.

**Alternativas.** `orval` (genera tipos + hooks de TanStack Query y MSW automáticamente): menos código,
pero impone estructura de hooks y complica la política de caché de ADR-004 y los mappers.

**Consecuencias.** ➕ Cero deriva del wire; `pnpm api:types` es un comando y queda en CI como verificación;
➖ hay una capa de mapeo manual entre el tipo generado y el dominio.

**Reversión.** Si el número de endpoints creciera a decenas, `orval` se vuelve rentable.

---

## ADR-010 — React Router v7 (data router)

**Estado:** aceptada

**Contexto.** El origen declara rutas estáticas con `loadChildren`, `data: { title, breadcrumb, resource,
actions }` y guards que leen ese `data`.

**Decisión.** **React Router v7** en modo data router (`createBrowserRouter`), rutas lazy por feature y
`loader` para la barrera de sesión y la comprobación de permisos.

**Alternativas.** TanStack Router (tipado superior, ecosistema menor y otra curva), Wouter (sin loaders).

**Consecuencias.** ➕ `data` por ruta replica el contrato del origen (`title`, `breadcrumb`, `resource`,
`actions`); ➕ `loader` permite decidir antes de renderizar; ➖ la API de loaders obliga a centralizar el
acceso al `queryClient`.

**Reversión.** Las rutas viven en un único archivo por feature (`routes.tsx`); migrar es local.

---

## ADR-011 — Vitest + Testing Library + MSW + Playwright

**Estado:** aceptada

**Contexto.** El origen tenía 652 pruebas con Vitest y una cultura clara de "spec con valor".

**Decisión.** **Vitest** (mismo runner que el origen), **Testing Library**, **MSW 3** para el API en tests y
en modo `mock`, y **Playwright** para 4 flujos críticos.

**Alternativas.** Jest (más lento y configuración doble con Vite), solo unitarios (sin red de seguridad
en flujos), Cypress (más pesado que Playwright).

**Consecuencias.** ➕ Una sola configuración de Vite para dev/test; ➕ los handlers de MSW sirven en tests,
en dev y en e2e; ➖ MSW añade estado global que hay que resetear entre pruebas.

**Reversión.** No se contempla.

---

## ADR-012 — Tokens: access en memoria + refresh cifrado

**Estado:** aceptada · **Precedente:** `TokenAuthService` + `CryptoService` del origen

**Contexto.** El backend devuelve los dos tokens en el **body** del login (no hay cookie `httpOnly`), así
que cualquier persistencia es accesible desde JavaScript. Elegir dónde guardarlos es elegir el riesgo.

**Decisión.**

| Token   | Dónde                                           | Cifrado                                                    |
| ------- | ----------------------------------------------- | ---------------------------------------------------------- |
| Access  | **Memoria** (variable del módulo, no del store) | n/a                                                        |
| Refresh | `localStorage`                                  | **AES-GCM con Web Crypto**, clave derivada por dispositivo |

Reglas: solo `core/auth/token-storage.ts` toca el storage; el access se refresca en una **cola única**
(una sola promesa compartida por todos los 401 concurrentes); si el refresh falla con 401/418 → sesión
cerrada y redirección a login; un fallo de red **no** cierra la sesión (fail-open, como el origen).

**Alternativas.** Ambos en `sessionStorage` (pierde sesión al cerrar pestaña), ambos en `localStorage`
plano (más expuesto), cookie `httpOnly` (requiere cambio de backend: **no** está disponible).

**Consecuencias.** ➕ Sobrevive F5 sin exponer el refresh en claro; ➕ misma semántica que el origen;
➖ la clave vive en el dispositivo: no protege contra XSS activo, solo contra lectura trivial del storage.

**Reversión.** Si el backend añadiera cookies `httpOnly` + `SameSite`, se elimina el storage por completo.

---

## ADR-013 — Catálogo-first para Países

**Estado:** aceptada · **Evidencia:** [`03-contratos-api.md`](03-contratos-api.md) §5

**Contexto.** El único endpoint que funciona de forma fiable es `Pag.*` sobre `/api/country/all`. La
búsqueda devuelve **500**, y `Sort`/`Filter` se ignoran **en silencio** (verificado el 2026-11-20). El
nomenclador tiene **249 filas** y crece solo con países (bounded por definición).

**Decisión.** Una sola query `countries.catalog` que pide `/api/country/all?Pag.Page=1&Pag.PageSize=250`
y cachea el resultado 5 minutos. La tabla pagina, busca, ordena y filtra **en cliente** con TanStack Table.
La paginación de servidor queda implementada en la capa `api/` y **apagada** tras un flag
(`useServerPagination`), lista para reactivarse.

**Alternativas.** Paginación de servidor pura (deja la búsqueda rota), búsqueda con `useQuery` por tecla
(dispara 500), arreglar el backend (fuera de nuestro control).

**Consecuencias.**

- ➕ Búsqueda, orden y filtro instantáneos y correctos; una sola petición por sesión de trabajo.
- ➕ El detalle se resuelve desde la caché (`code` → fila), sin depender del endpoint que devuelve 404.
- ➖ No escala a nomencladores grandes: hay un umbral documentado.
- ➖ La UI no ejercita el path de servidor (queda cubierto por tests unitarios de la capa `api`).

**Reversión.** Cuando (a) el backend arregle `Search`, `Sort` y `Filter`, o (b) el catálogo supere
**1 000 filas**, se activa `useServerPagination` y se mueven búsqueda/orden/filtro al servidor. La UI no
cambia: el hook `useCountries` ya acepta ambas estrategias.

---

## ADR-014 — RBAC en tres capas

**Estado:** aceptada · **Precedente:** ADR-007 y §6.3 del origen

**Contexto.** Los permisos llegan del API dentro de los roles (`role.permissions[]`) y deben gobernar
menú, rutas y botones, sin duplicar la semántica.

**Decisión.** Una sola fuente (`useSessionStore.hasPermission(resource, actions?)`) consumida en tres capas:

1. **Menú** — el ítem se oculta si falta el permiso.
2. **Ruta** — `loader` lanza `redirect('/acceso-denegado')` si falta.
3. **Componente** — `<Can resource="Nomenclators" actions={['Update']}>` oculta o deshabilita.

**Alternativas.** Solo componente (rutas accesibles por URL), solo ruta (botones que fallan con 403),
`PermissionService` paralelo (dos semánticas, el error que el origen evitó).

**Consecuencias.** ➕ Un único predicado; ➕ defensa en profundidad real; ➖ tres lugares que recordar al
añadir un recurso (mitigado por constantes tipadas `RESOURCES`/`ACTIONS`).

**Reversión.** No se contempla.

---

## ADR-015 — Sistema de diseño: tokens + catálogo vivo

**Estado:** aceptada

**Contexto.** El usuario pidió crear el sistema de diseño. Un `Storybook` añade un artefacto y un build
que se desincroniza; un catálogo dentro de la app nunca miente.

**Decisión.** Tokens en **CSS variables** (`src/design-system/tokens.css`) consumidos por Tailwind 4 vía
`@theme`, más una ruta **`/design-system`** (solo en desarrollo y en build de demo) que renderiza tokens,
tipografía, espaciado y todos los componentes en sus estados.

**Alternativas.** Storybook (más potente, más coste), solo tokens sin catálogo (el sistema se olvida),
Figma como fuente (no ejecutable ni testeable).

**Consecuencias.** ➕ El catálogo se renderiza con los componentes reales; ➕ sirve de página de QA visual y
de documentación para nuevos desarrolladores; ➖ no hay controles interactivos tipo Storybook (se mitiga con
secciones de ejemplo).

**Reversión.** Si el equipo crece y pide documentación por componente con controles, se añade Storybook
consumiendo los mismos componentes.

---

## ADR-016 — Modo mock con MSW y fixtures reales

**Estado:** aceptada

**Contexto.** El login exige credenciales que no están disponibles en el entorno de desarrollo, y los
tests no deben tocar el backend real.

**Decisión.** `VITE_API_MODE=live|mock`. En `mock`, MSW intercepta en el navegador usando fixtures
**exportadas del backend real** (los 249 países y dos usuarios de prueba). Los mismos handlers se usan en
Vitest y en Playwright.

**Alternativas.** Mocks escritos a mano (deriva), backend falso en Express (otro proceso), sin modo mock
(no se puede desarrollar sin VPN y credenciales).

**Consecuencias.** ➕ Desarrollo y e2e sin red corporativa; ➕ las fixtures son datos reales, así que la UI
se prueba contra el shape verdadero; ➖ hay que mantener dos modos y evitar que `mock` llegue a producción.

**Reversión.** Si se consiguen credenciales estables y el backend es accesible desde CI, el modo `mock`
queda solo para tests.

---

## ADR-017 — Orden de arranque: contrato del bootstrap

**Estado:** aceptada · **Fecha:** 2026-11-20 · **Origen del hallazgo:** fallo intermitente de restauración de sesión en F5

**Contexto.** `createBrowserRouter` **inicia la navegación al construirse** y ejecuta en ese momento los
`loader` de las rutas activas. Con el router creado a nivel de módulo (patrón habitual), esos loaders
corrían durante el `import` del entry point: antes de levantar MSW y, sobre todo, antes de
`installAuth()`. Consecuencia: en un F5, la restauración de sesión pedía el refresh sin proveedor de
tokens; en modo `mock` la petición se escapaba al backend real, devolvía 401 y la sesión se cerraba.

**Decisión.** El arranque tiene cuatro pasos fijos y en este orden:

1. MSW (solo desarrollo) + **sonda de readiness** (`/api/__msw/ready`), porque `worker.start()` resuelve
   cuando el worker está registrado, no necesariamente cuando atiende al cliente nuevo.
2. `installAuth({ onSessionExpired })` — registra el proveedor de tokens en el cliente HTTP.
3. `createAppRouter()` — función, nunca constante de módulo.
4. Montaje de React.

**Alternativas.**

| Alternativa                                                              | Por qué no                                                                                                |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Router a nivel de módulo y "arreglarlo" con un `await` dentro del loader | El loader necesitaría conocer MSW y el orden de bootstrap: acopla dominio a infraestructura de desarrollo |
| Instalar auth a nivel de módulo (lado efecto del import)                 | Orden implícito e ilegible; un import nuevo puede romperlo otra vez                                       |
| No restaurar sesión hasta el primer render de React                      | Llegas a pintar la UI sin permisos y expulsas al usuario un instante después                              |

**Consecuencias.**

- ➕ Un único punto donde el orden es explícito y documentado.
- ➕ La regla «no hay peticiones antes de que exista el proveedor de tokens» se cumple por construcción.
- ➖ `main.tsx` deja de ser el arranque "de plantilla"; quien lo reordene rompe la sesión.
- ➖ La sonda de readiness añade una petición por carga en desarrollo.

**Reversión.** Si React Router dejara de ejecutar loaders al construir el router, el paso 3 podría
volver al módulo; el orden 1-2 seguiría siendo obligatorio.

---

## ADR-018 — Persistencia de filtros: la URL manda, `sessionStorage` siembra

**Estado:** aceptada · **Fecha:** 2026-11-20 · **Origen:** requisito del proyecto Angular de origen

**Contexto.** El proyecto origen (`core/store/features/with-filters-persistence.feature.ts`) persiste el
`query` del listado —filtros, búsqueda y paginación— en `sessionStorage`, con versión, TTL opcional,
descarte de JSON corrupto y borrado al limpiar. Aquí el estado de la vista vive en la **URL** (ADR-013),
lo que cubre F5, enlaces compartidos y el botón atrás, pero **no** cubre volver a la pantalla desde el
menú: el enlace del sidebar no lleva parámetros y la vista se resetea.

**Decisión.**

1. `sessionStorage` guarda el estado completo por **usuario** (`countries.list.filters:<userId>`), con
   versión, TTL de 12 h y validación **estricta** (si no encaja entero, se descarta).
2. Al entrar con la URL **vacía**, el hook restaura lo guardado y reescribe la URL con `replace`.
3. Si la URL trae **cualquier** parámetro, lo guardado se ignora: un enlace compartido siempre gana.
4. La vista por defecto no se persiste; limpiar filtros borra la entrada.
5. La clave incluye el usuario, así que no hace falta limpiar al cerrar sesión ni se mezclan filtros
   entre personas que compartan equipo.

**Por qué no un store global.** Duplicaría el dueño del dato (invariante de «un dueño por cada dato»):
dos fuentes que se pueden desincronizar. Aquí el almacenamiento no compite; solo alimenta al dueño
cuando llega vacío.

**Alternativas.**

| Alternativa                               | Por qué no                                                                                                            |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `localStorage`                            | Los filtros son de la pestaña; persistirlos entre sesiones de trabajo confunde más que ayuda                          |
| Store Zustand como dueño (como el origen) | Rompe la URL compartible y el botón atrás, que aquí son requisito                                                     |
| Restaurar en el `loader` de la ruta       | Sin parpadeo, pero deja la restauración fuera del alcance de las pruebas de componente y duplica la lectura de la URL |
| Sin TTL                                   | Un filtro de hace días se percibe como un fallo («no aparecen mis países»)                                            |

**Consecuencias.**

- Dos caminos de validación del mismo esquema: tolerante para la URL (corrige) y estricto para el
  almacenamiento (rechaza). Viven juntos en `ui/countries-query-schema.ts`.
- Cambiar un valor por defecto (por ejemplo el tamaño de página) exige subir `STORAGE_VERSION`, o un
  payload viejo restauraría el anterior.
- Cubierto por `country-filters-storage.spec.ts` (10 casos) y 4 pruebas de página: restauración, la URL
  por encima, borrado al limpiar y guardado de la última vista.

**Reversión.** Quitar los dos `useEffect` del hook y el módulo de almacenamiento; la URL sigue
funcionando igual.

---

## ADR-019 — Administración de seguridad: usuarios, roles y permisos

**Estado:** aceptada · **Fecha:** 2026-11-20 · **Origen:** módulo `security` del proyecto Angular

**Contexto.** El alcance inicial excluía la administración de seguridad («solo el nomenclador»), pero el
backend **sí** expone el módulo completo y el origen lo tiene implementado. Sin él, un administrador del
dashboard no puede dar de alta usuarios ni repartir permisos: el RBAC de la aplicación queda a medias.

Contratos verificados contra `swagger/v1/swagger.json` el 2026-11-20:

| Recurso  | Operaciones                                                                                                       |
| -------- | ----------------------------------------------------------------------------------------------------------------- |
| Usuarios | `GET/POST /api/users`, `GET/PUT/DELETE /api/users/{id}`, `POST /api/users/{id}/reset-password`                    |
| Roles    | `GET/POST /api/roles`, `GET/PUT/DELETE /api/roles/{id}`                                                           |
| Permisos | `GET /api/roles/permissions` (catálogo), `GET /api/roles/{roleId}/permissions`, `PUT /api/roles/{id}/permissions` |

**Decisión.**

1. Dos features nuevas —`users` y `roles`— con el mismo corte vertical que Países: `domain → api → ui`
   y superficie pública en `index.ts`.
2. **RBAC con los recursos reales** (`User`, `Role`, en singular, tal como los devuelve el API): el menú y
   las rutas se filtran con `Read`, y cada acción de escritura exige `Create`/`Update`/`Delete`.
3. **Roles catálogo-first**: son pocos y el listado los necesita completos (para el multiselect de
   usuarios y para el editor de permisos). Se trae la primera página con `PageSize` amplio y se filtra en
   cliente.
4. **Usuarios con paginación de servidor** (`Pag.Page`/`Pag.PageSize`, los únicos parámetros que el
   backend respeta) y **sin** `Search.SearchText`, por el defecto BE-001: buscar usuarios no puede
   delegarse al servidor. La búsqueda se hace en cliente sobre lo cargado y la UI lo dice.
5. **`userType` no se envía** en el alta, igual que el origen: el enum cae a `0` en el binder de .NET. Si
   el backend llegara a exigir un tipo distinto, hay que añadirlo (Q8 en `docs/08`).
6. Los permisos viajan como `{ resource, actionType }[]` (no como árbol): la matriz de la UI se aplana
   antes de guardar.
7. `isUnEditable` / `isUnDeletable` **los calcula el backend** y la UI solo deshabilita acciones; nunca se
   infieren del nombre ni del rol.
8. **Dos vistas para los permisos, con la misma fuente**: tabla (una fila por recurso, una columna por
   acción) y árbol (categoría → recurso → acción, con casillas que propagan hacia arriba y hacia abajo,
   como el `p-tree` del origen). El modelo de estado es **uno solo** —un conjunto de hojas— así que
   cambiar de vista no pierde selección; la preferencia vive en `useUiStore` y sobrevive recargas.

**Consecuencias.**

- Tres recursos más en `core/rbac/resources.ts`; el menú gana un grupo «Seguridad».
- El catálogo de permisos se cachea aparte (`['permissions','catalog']`): cambia poco y lo usan roles.
- Restablecer contraseña muestra la clave temporal que devuelve el backend y obliga a cambiarla en el
  primer acceso (comportamiento del origen).
- Pruebas: contratos con MSW, RBAC de UI por rol, y el editor de permisos con su ida y vuelta.

---

## ADR-020 — Una feature puede importar la superficie pública de otra

**Estado:** aceptada · **Fecha:** 2026-11-20 · **Reemplaza parcialmente:** §5 de `docs/02-arquitectura.md`

**Contexto.** La regla original era tajante: «las features no se importan entre sí». Funcionó mientras las
features eran independientes, pero el alta de usuarios necesita el **catálogo de roles** —son los roles que
se asignan— y ese dato vive en la feature `roles`. Las salidas sin tocar la regla eran malas:

- duplicar la consulta de roles dentro de `users` (dos fuentes que se desincronizan);
- cargar los roles en `app/` y pasarlos como props (contamina la página con una dependencia de datos);
- mover el catálogo a `core/` o `shared/` (rompe «`shared/` no conoce el dominio»).

**Decisión.** Un import entre features es válido **si y solo si** apunta a su superficie pública
(`@/features/<x>`, que resuelve a `index.ts`). Las subrutas —`features/roles/api/...`,
`features/roles/ui/...`— siguen prohibidas y ahora fallan con un mensaje que lo explica.

`src/app/architecture.spec.ts` lo verifica distinguiendo `features/<x>` (entrada) de `features/<x>/…`
(internals), así que la regla no depende de la disciplina de quien escribe.

**Consecuencias.**

- Cada `index.ts` es un **contrato**: exportar algo ahí es prometer estabilidad.
- Se documenta el grafo real: `users → roles` (catálogo). `roles` no conoce a `users`.
- El resto de reglas de capa no cambian: `core/` y `shared/` siguen sin poder depender de features.
