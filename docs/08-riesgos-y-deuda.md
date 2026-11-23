# 08 — Riesgos, dependencias externas y deuda asumida

> **Fecha:** 2026-11-20 · Un riesgo sin mitigación y sin disparador no es un riesgo: es una sorpresa.

---

## 1. Registro de riesgos

| ID      | Riesgo                                                                                                                                            | Prob.                              | Impacto          | Mitigación                                                                                                                    | Disparador de acción                                               |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **R1**  | La búsqueda del backend devuelve 500                                                                                                              | **Cierta**                         | Medio            | Búsqueda en cliente sobre el catálogo (ADR-013)                                                                               | El backend corrige `SearchExtensions`                              |
| **R2**  | `Sort` y `Filter` se ignoran en silencio                                                                                                          | **Cierta**                         | Medio            | Orden y filtro en cliente                                                                                                     | El backend los aplica de verdad                                    |
| **R3**  | El detalle `GET /country/{code}` devuelve 404 con token                                                                                           | Alta                               | Bajo             | Detalle desde caché; endpoint solo como respaldo con `ContentState`                                                           | Se confirma con credenciales reales                                |
| **R4**  | `List`/`ListAll` no exigen autorización                                                                                                           | **Cierta**                         | Alto (seguridad) | La UI exige sesión y RBAC igualmente; se reporta al backend                                                                   | El equipo de backend lo corrige                                    |
| **R5**  | No hay credenciales para probar login y escrituras                                                                                                | Alta                               | Alto             | Modo `mock` con MSW + fixtures reales                                                                                         | El usuario aporta un usuario de prueba                             |
| **R6**  | CORS solo permite `localhost:5173`                                                                                                                | Media                              | Medio            | Puerto fijo en `vite.config.ts` y en el README                                                                                | Se despliega en otro origen                                        |
| **R7**  | El refresh token usa `refreshToken` (camelCase) y el origen creía `RefreshToken`                                                                  | Media                              | Medio            | Se implementa con el contrato de Swagger y se verifica en la primera prueba real                                              | Falla el refresh en la práctica                                    |
| **R8**  | La sesión única por huella expulsa al usuario al entrar desde otro navegador                                                                      | Media                              | Bajo             | La huella es persistente por dispositivo; mensaje claro al detectar 401 en refresh                                            | El usuario reporta cierres inesperados                             |
| **R9**  | El catálogo crece por encima del umbral (1 000 filas)                                                                                             | Baja                               | Medio            | `useServerPagination` ya implementado; se activa con un flag                                                                  | `totalCount > 1000`                                                |
| **R10** | `shadcn` CLI incompatible con Tailwind 4                                                                                                          | Media                              | Bajo             | Copiar las primitivas a mano (~8 componentes)                                                                                 | Falla la inicialización en F1                                      |
| **R11** | El backend cambia el contrato sin avisar                                                                                                          | Media                              | Medio            | `openapi-typescript` + verificación en CI del diff del esquema                                                                | Falla el gate o un mapper                                          |
| **R12** | `pnpm` y Node son recientes (Node 26) y alguna dependencia no los soporta                                                                         | Baja                               | Bajo             | `.nvmrc` con la versión LTS usada; lockfile commiteado                                                                        | Falla `install` o `build`                                          |
| **R13** | El usuario necesita desplegar en la red corporativa sin acceso a npm                                                                              | Media                              | Alto             | Documentar `pnpm install --offline` con store local; no se decide ahora                                                       | Llega el momento de desplegar                                      |
| **R14** | **TypeScript 7.0 rompe `typescript-eslint`** (lanza al importar: «does not support TS 7.0»)                                                       | **Cierta**                         | Medio            | TypeScript fijado en **5.9.3**, la versión del proyecto origen. El resto del stack (Vite 8, Vitest 5) funciona igual          | `typescript-eslint` publica soporte para TS 7                      |
| **R15** | **El router ejecuta los `loader` al construirse**: un F5 restauraba la sesión antes de instalar auth/MSW y el refresh se escapaba al backend real | **Cierta** (ocurrió el 2026-11-20) | Alto             | Router creado en `bootstrap()` con `createAppRouter()`, después de MSW y `installAuth`; sonda `/api/__msw/ready`. Ver ADR-017 | Alguien reordene `main.tsx` o devuelva el router a nivel de módulo |
| **R16** | **El CDN de Playwright responde 403 por región** en esta máquina: `playwright install` no descarga Chromium                                       | **Cierta** (2026-11-20)            | Bajo             | `playwright.config.ts` usa el Edge instalado; CI instala Chromium propio y `PW_CHANNEL` permite forzar el canal               | Se ejecuta `pnpm e2e` en otra red o cambia la política regional    |

---

## 2. Defectos del backend (no nuestros, pero nos afectan)

Documentados con evidencia en [`03-contratos-api.md`](03-contratos-api.md#5-defectos-del-backend-reproducibles).

### BE-001 · Búsqueda 500 por propiedad estática

- **Archivo:** `Common/Filters/Extensions/SearchExtensions.cs` → `ApplySearchText` / `ApplyStrictSearchText`.
- **Causa:** `typeof(T).GetProperties()` incluye `Country.GetCubaCode` (estática) y
  `Expression.Property(parameter, staticProperty)` lanza.
- **Arreglo:** `GetProperties(BindingFlags.Public | BindingFlags.Instance)`.
- **Impacto en la UI:** ninguno mientras se use búsqueda en cliente; se activa el path de servidor el día
  que se arregle.

### BE-002 · `Sort` no se aplica

- El parámetro se deserializa a `Sort[]` pero no se usa para ordenar el `IQueryable`.

### BE-003 · `Filter` no se aplica

- En `/all` se ignora; en `/country` devuelve vacío. No hay filtrado de servidor utilizable.

### BE-004 · Lecturas sin autorización

- `[AuthorizeResource(Resource.Nomenclators, ActionType.Read)]` está **comentado** en `List` y `ListAll`.
- Riesgo de exposición del nomenclador; la UI no debe confiar en ello.

### BE-005 · Detalle 404 con token

- Reportado en el origen el 2026-11-03 (`GET /api/country/AF` → 404). Sin confirmar: sin token devuelve 401.

### BE-006 · `SearchText` vacío es 400

- Validación `[Required]` efectiva: el cliente debe **omitir** el parámetro.

---

## 3. Deuda asumida conscientemente

| Deuda                                                        | Por qué se acepta                                                                                                                                             | Coste de revertir                                      | Cuándo revisar                         |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------- |
| Búsqueda/orden/filtro en cliente                             | Endpoints rotos + catálogo acotado (249)                                                                                                                      | Bajo (flag + mover a servidor)                         | > 1 000 filas o backend sano           |
| Sin i18n                                                     | Un solo idioma y un solo negocio                                                                                                                              | Medio (`i18next` + extraer textos)                     | Si aparece un segundo idioma           |
| Sin SSR                                                      | Panel interno tras login                                                                                                                                      | Alto (migrar a framework con SSR)                      | Si se exige SEO o primera carga sin JS |
| Sin roles/usuarios/auditoría                                 | Fuera de alcance por decisión                                                                                                                                 | Alto (es otro módulo completo)                         | Si el dashboard crece                  |
| Sin tests de snapshot visual                                 | El catálogo `/design-system` cubre la revisión visual                                                                                                         | Bajo (añadir Playwright screenshots)                   | Si crece el número de componentes      |
| Tokens en `localStorage` cifrado                             | El backend no emite cookies `httpOnly`                                                                                                                        | Bajo si el backend cambia                              | Si se adopta cookie `httpOnly`         |
| Un solo idioma de código (inglés) y UI (español)             | Equipo pequeño                                                                                                                                                | Ninguno                                                | —                                      |
| Reglas de arquitectura en un test, no en un plugin de ESLint | `eslint-plugin-boundaries` v7 está en API de transición y no expresa «una feature no importa otra»; `architecture.spec.ts` sí, y además cubre `fetch` directo | Bajo (reintroducir el plugin cuando estabilice su API) | Al actualizar a boundaries ≥ 8         |

---

## 4. Preguntas abiertas

| #   | Pregunta                                                                          | Bloquea                        | Cómo se cierra                              |
| --- | --------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------- |
| Q1  | ¿Hay un usuario/clave de prueba con `Nomenclators:Read/Create/Update/Delete`?     | Verificación real de F2/F4     | Pedirlo al usuario o al equipo de backend   |
| Q2  | ¿La forma exacta de `permissions[]` en `user/current` es `{resource, actions[]}`? | Hidratación de sesión          | Una llamada con token real y anotar el JSON |
| Q3  | ¿`POST /api/country` devuelve 409 ante código duplicado o 400?                    | UX del error en alta           | Probar con token                            |
| Q4  | ¿`DELETE /api/country/{code}` responde 200 o 204?                                 | Cliente HTTP (parseo de vacío) | Probar con token                            |
| Q5  | ¿El refresh devuelve también `refreshToken` nuevo?                                | Rotación de tokens             | Probar con token                            |
| Q6  | ¿Se va a desplegar fuera de `localhost:5173`?                                     | CORS                           | Definir origen y pedir al backend           |
| Q7  | ¿Se requiere `X-Change-Password-Token` o algún header extra?                      | Fuera de alcance hoy           | Solo si se añade cambio de contraseña       |

> Mientras Q1 no se resuelva, el desarrollo y los tests funcionan con `VITE_API_MODE=mock` y las fixtures
> reales; la verificación contra el backend queda como tarea de cierre de F2/F4.

---

## 5. Cuándo se reabre un ADR

| ADR                         | Se reabre si…                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------- |
| ADR-001 (React/Vite)        | Se exige compartir código con la app Angular o SSR                                    |
| ADR-002 (shadcn)            | Se necesita un grid empresarial o un componente que Radix no cubra                    |
| ADR-003/004 (Query y caché) | Aparece edición colaborativa en tiempo real (se necesita `realtime` + `staleTime` ~0) |
| ADR-005 (Zustand)           | El estado global se reduce tanto que Context basta                                    |
| ADR-008 (TanStack Table)    | El dataset exige virtualización de > 50 000 filas                                     |
| ADR-012 (tokens)            | El backend emite cookies `httpOnly`                                                   |
| ADR-013 (catálogo-first)    | Backend sano o catálogo > 1 000 filas                                                 |
| ADR-015 (catálogo vivo)     | Se pide documentación con controles interactivos (Storybook)                          |

---

## 6. Plan de contingencia si el backend cae

1. `VITE_API_MODE=mock` mantiene el desarrollo y las demos.
2. El build de producción **no** incluye MSW (`import.meta.env.DEV` + variable explícita).
3. La app muestra `ErrorState` con Reintentar y conserva la sesión (fail-open) si el fallo es de red.
4. Si el backend se retira definitivamente: las fixtures reales permiten reconstruir el dominio y el
   contrato queda documentado con fecha.
