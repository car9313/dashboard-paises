# 06 — Estrategia de pruebas

> **Fecha:** 2026-11-20 · **Runner:** Vitest 4 · **Componentes:** Testing Library · **API:** MSW 2 · **E2E:** Playwright

---

## 1. Comandos y gates

```bash
pnpm test              # una pasada (CI)
pnpm test:watch        # desarrollo
pnpm test --coverage   # informe de cobertura
pnpm e2e               # Playwright (levanta el dev server en modo mock)
```

**Gate obligatorio:** `typecheck` + `lint` + `test` + `build`. El e2e es gate de fase (F7) y de PR que
toque flujos críticos.

---

### 1.1 Cobertura obligatoria (2026-11-23)

`pnpm verify` ejecuta `test:coverage`, no `test`: el gate local y el CI miden lo mismo. Los umbrales viven
en `vite.config.ts` y se fijaron con la cobertura real medida el 2026-11-23 (78,0 % de sentencias) menos dos
o tres puntos:

| Ámbito            | Sentencias | Ramas | Funciones | Líneas |
| ----------------- | ---------- | ----- | --------- | ------ |
| Global            | 75         | 67    | 70        | 76     |
| `src/core/**`     | 81         | 73    | 70        | 82     |
| `src/features/**` | 81         | 67    | 78        | 82     |
| `src/shared/**`   | 92         | 90    | 90        | 92     |

`src/test-utils/**` queda fuera del cómputo: mide el andamio, no el producto. Los globs por capa son la
parte útil —`shared` y `core` son el suelo del resto—, y se comprobó que **bloquean de verdad**: subir
`shared` al 99 % hace fallar el comando con `ERROR: Coverage for statements (94.2%) does not meet`.

`pnpm test` sigue existiendo para el ciclo corto (sin cobertura) y `pnpm test:coverage` es el que se usa en
el gate y en CI, con informe `html`, `lcov` y `json-summary` en `coverage/` (subido como artefacto).

---

## 2. Pirámide y qué se prueba en cada nivel

| Nivel                                  | Volumen esperado | Qué cubre                                                                   | Ejemplo                                     |
| -------------------------------------- | ---------------- | --------------------------------------------------------------------------- | ------------------------------------------- |
| **Unitario puro** (rápido, sin DOM)    | ~45 %            | Reglas de dominio, mappers, esquemas Zod, formatters, reducers de métricas  | `country.mapper.spec.ts`, `metrics.spec.ts` |
| **Integración de UI** (RTL + MSW)      | ~40 %            | Página con datos, estados de carga/error/vacío, formularios, filtros, tabla | `CountriesPage.spec.tsx`                    |
| **Contrato HTTP** (MSW + cliente real) | ~10 %            | URL, verbo, body y manejo de errores del cliente                            | `client.spec.ts`, `repositories.spec.ts`    |
| **E2E** (Playwright)                   | ~5 %             | Flujos completos: login, CRUD, logout, RBAC                                 | `e2e/countries.spec.ts`                     |

### Lo que **no** se prueba

- Librería de terceros (Radix, TanStack, Zod): se confía o se reporta upstream.
- Estilos píxel a píxel: se revisan en `/design-system`.
- `should render without crashing`: no aporta nada y da falsa cobertura.
- Implementación interna de un hook (se prueba su comportamiento observable).

---

## 3. Patrones obligatorios

### 3.1 Nombres que describen comportamiento

```ts
// ✅
it('muestra el estado de error y reintenta cuando el catálogo falla', …)
it('vuelve a la página 1 al cambiar la búsqueda', …)
it('restaura el estado anterior del país si la desactivación falla', …)

// ❌
it('renderiza', …)   it('works', …)   it('test 1', …)
```

### 3.2 MSW como única fuente de red

```ts
// src/mocks/handlers.ts
export const handlers = [
  http.get(`${API}/api/country/all`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('Pag.Page') ?? 1);
    const size = Number(url.searchParams.get('Pag.PageSize') ?? 10);
    const rows = countriesFixture.slice((page - 1) * size, page * size);
    return HttpResponse.json({
      objects: rows,
      meta: {
        currentPage: page,
        nextPage: null,
        prevPage: null,
        totalPage: Math.ceil(countriesFixture.length / size),
        totalCount: countriesFixture.length
      }
    });
  })
];
```

Reglas:

- `server.resetHandlers()` en `afterEach` (sin esto, un override contamina el siguiente test).
- Los handlers respetan `Pag.*` como el backend real (mismo comportamiento, incluidos sus defectos).
- Para el bug de búsqueda, el handler **no** implementa búsqueda: devuelve todo, igual que el backend al
  ignorar el filtro. Así la UI se prueba contra la realidad, no contra un backend ideal.

### 3.3 Consultas accesibles, no por test-id

```ts
screen.getByRole('button', { name: /nuevo país/i });
screen.getByRole('switch', { name: /activar o desactivar cuba/i });
screen.getByRole('cell', { name: 'Cuba' });
```

`data-testid` solo cuando no existe rol/label accesible (y entonces suele ser un aviso de accesibilidad).

### 3.4 Interacción con `userEvent`

```ts
const user = userEvent.setup();
await user.type(screen.getByLabelText(/buscar país/i), 'cub');
await screen.findByText('Cuba'); // findBy = waitFor + getBy
```

Prohibido `setTimeout` en pruebas. Si algo no aparece es porque falta un estado accesible, no un _sleep_.

### 3.5 QueryClient propio por prueba

```ts
function renderWithProviders(ui: ReactElement, { queryClient = createTestQueryClient() } = {}) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } }
  });
```

`retry: false` evita que un test de error tarde por reintentos.

### 3.6 Formularios

Se prueba: validación al enviar, foco en el primer error, que **no** se llama al API si es inválido,
estado `loading` (botón deshabilitado) y error del servidor sin perder los valores.

### 3.7 Mutaciones optimistas

```ts
// 1) la UI cambia antes de resolver
// 2) el servidor falla → vuelve el valor anterior + toast
// usar un deferred para controlar la resolución
```

---

### 3.1 Trampa: `persist` de Zustand contra `localStorage` (2026-11-23)

Síntoma que costó una mañana entender: los tests **pasaban aislados y se colgaban en conjunto**. Un
`useUiStore.setState(...)` en el teardown bastaba para que decenas de pruebas acabaran en _timeout_ sin
error, y el primer test de cada archivo pasaba mientras el resto se bloqueaba.

Causa: el middleware `persist` escribe en `localStorage` en cada cambio y jsdom emite eventos que
realimentan el ciclo, dejando el _event loop_ del worker ocupado. `localStorage.clear()` en el teardown
agravaba el estado intermedio.

Arreglo definitivo, en el propio store:

```ts
storage: createJSONStorage(() => (env.isTest ? noopStorage : localStorage));
```

En pruebas el store vive en memoria (sigue funcionando) y no toca el disco; en el navegador persiste
igual que antes. Regla derivada: **un store persistido no se resetea desde el setup global**; si hace
falta aislarlo, se corta el almacenamiento, no el middleware.

---

## 4. Fixtures

| Fixture                               | Origen                                                 | Uso               |
| ------------------------------------- | ------------------------------------------------------ | ----------------- |
| `mocks/fixtures/countries.json`       | **Exportado del backend real** (249 filas, 2026-11-20) | MSW, tests, e2e   |
| `mocks/fixtures/session.json`         | Usuarios de prueba con permisos distintos              | Login y RBAC      |
| `mocks/fixtures/problem-details.json` | Shapes de 400/401/403/404/409/418/500                  | Mensajes de error |

Las fixtures son **datos reales**, no inventados: si el backend añade un campo, el test del mapper falla y
obliga a mirar el contrato.

---

## 5. Cobertura

**No hay umbral obligatorio que rompa el build** (una cobertura alta sin aserciones no vale nada).
Prioridad declarada, en orden:

1. `core/http` (cliente, refresh, problemas) — es donde un bug cuesta caro.
2. `core/auth` (session store, guards, token storage).
3. `features/*/api` (mappers, repositorios, mutaciones).
4. `features/*/domain` (esquemas, reglas).
5. `features/*/ui` (páginas y componentes con lógica).

Objetivo cualitativo: **que cualquier bug de contrato o de sesión lo detecte un test, no un usuario.**

---

## 6. E2E — alcance mínimo

| Flujo           | Aserciones                                                               |
| --------------- | ------------------------------------------------------------------------ |
| Login válido    | llega al inicio, ve su nombre en la topbar                               |
| Login inválido  | mensaje de error, sigue en `/login`                                      |
| Sesión expirada | recarga y sigue autenticado (refresh)                                    |
| Listar y buscar | escribe «cuba», ve 1 fila, limpia y ve 249                               |
| Crear país      | aparece en la tabla sin recargar página                                  |
| Editar país     | el nombre cambia en la tabla                                             |
| Desactivar      | insignia «Inactivo» y switch apagado                                     |
| RBAC            | usuario sin `Crear` no ve «Nuevo país» ni navegando por URL a una acción |
| Logout          | vuelve a `/login` y la ruta privada redirige                             |

Configuración: `webServer` con `pnpm dev` y `VITE_API_MODE=mock`, un proyecto `chromium`, _retries: 1_ solo en CI.

---

## 7. Anti-patrones (heredados de la experiencia del origen)

| Anti-patrón                                     | Por qué duele                | En su lugar                             |
| ----------------------------------------------- | ---------------------------- | --------------------------------------- |
| `setTimeout` para esperar estado                | frágil en CI, lento en local | `findBy*`, `waitFor` con condición real |
| Mock manual de `fetch`                          | se desincroniza del contrato | MSW con handlers compartidos            |
| Test que depende del orden de otro              | falla en paralelo            | aislamiento + `resetHandlers`           |
| `any` en el mock                                | oculta el fallo de tipo      | `satisfies` con el DTO real             |
| Probar implementación (estado interno del hook) | rompe con cualquier refactor | probar lo observable                    |
| Un solo test gigante por pantalla               | no dice qué falló            | un test por comportamiento              |

---

## 8. Definition of Done de pruebas

- [ ] Cada slice tiene pruebas de su camino feliz y al menos un borde (vacío, error, permiso).
- [ ] `pnpm test` verde y sin _warnings_ de `act()`.
- [ ] Ningún test toca la red real.
- [ ] Si el slice toca un flujo crítico, hay un e2e que lo cubre.
- [ ] Los tests nuevos fallan si se rompe el comportamiento (verificado al menos una vez a mano).
