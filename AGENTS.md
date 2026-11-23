# AGENTS.md — Dashboard React

> Punto de entrada para cualquier agente o persona que trabaje en este repo.
> **Última actualización: 2026-11-20.** Este archivo es corto a propósito: el detalle vive enlazado.

---

## 1. Qué es este proyecto

Dashboard administrativo en **React 19 + Vite + TypeScript**, que porta la lógica del nomenclador de
**Países** del proyecto Angular `CERTIFICACION_EXTRANJEROS_UI`. Del origen se extrae **conocimiento**
(contratos verificados, reglas de negocio, decisiones de UX), nunca su código ni su deuda técnica.

Alcance: shell + login + Países (CRUD) + inicio con métricas + sistema de diseño + **administración de
seguridad** (usuarios, roles y permisos, ADR-019). **No** hay módulo de certificación, ni provincias, ni
municipios, ni auditoría.

## 2. Orden de lectura obligatorio

1. `AGENTS.md` (este archivo).
2. [`docs/02-arquitectura.md`](docs/02-arquitectura.md) — capas y reglas de dependencia.
3. [`docs/03-contratos-api.md`](docs/03-contratos-api.md) — **lo que el backend hace de verdad**.
4. [`docs/07-convenciones.md`](docs/07-convenciones.md) — naming, TSDoc, commits.
5. El documento de la fase en la que vas a trabajar: [`docs/05-plan-fases.md`](docs/05-plan-fases.md).

## 3. Invariantes (no negociables)

- **TypeScript estricto, sin `any`.** Un tipo desconocido se modela con `unknown` + validación, no con `any`.
- **Un dueño por cada dato:**
  - Datos del servidor → **solo** TanStack Query (`queryClient`, query keys, mutaciones).
  - Estado de sesión/tema/UI → **solo** Zustand (`useSessionStore`, `useThemeStore`).
  - Estado de formulario → **solo** react-hook-form.
  - Estado de la URL (página, búsqueda, filtros) → **solo** `useSearchParams`; `sessionStorage` es
    únicamente semilla de entrada y nunca un segundo dueño (ADR-018).
  - Prohibido duplicar un dato en dos de estos.
- **Sin `useEffect` para sincronizar estado derivado.** Derivar con `useMemo`/`computed`-style selectores
  o con el propio origen del dato. Los efectos se reservan para efectos secundarios externos.
- **Las features no se importan entre sí, salvo por su superficie pública.** Lo transversal vive en
  `core/` o `shared/`; cada feature expone su contrato en `index.ts` y las subrutas están prohibidas
  (ADR-020). `users` consume el catálogo de `roles` por esa puerta y nada más.
- **`shared/` no conoce el dominio.** Nada de `Country` dentro de `shared/ui`.
- **Dominio neutral, DTO fiel al wire.** El mapper traduce en el borde (`features/<x>/api/mapper.ts`);
  componentes y hooks solo ven dominio.
- **Identidad explícita.** Un país se identifica por `code`; no se inventa un `id`.
- **`active` no viaja en el payload de escritura.** Se cambia con `activate`/`deactivate` (ADR del origen).
- **Toda petición pasa por `core/http`.** Ningún componente llama a `fetch` directamente.
- **Permisos siempre desde el API.** Nunca se decodifica el JWT para inferir identidad o permisos.
- **Tokens:** solo `core/auth/token-storage.ts` los toca.
- **Estilos:** tokens del sistema de diseño; prohibido hex sueltos en componentes.
- **Pruebas:** un `spec` sin aserción de comportamiento no cuenta. Prohibido `should render` como única prueba.
- **Secretos:** nunca commitear tokens, claves ni `.env`.

## 4. Comandos

```bash
pnpm dev          # http://localhost:5173  (el backend solo permite CORS desde este origen)
pnpm typecheck    # tsc --noEmit
pnpm lint         # ESLint flat
pnpm test         # Vitest
pnpm build        # build de producción
pnpm e2e          # Playwright (navegador real, modo mock)
pnpm size         # presupuesto de arranque en gzip (requiere build)
pnpm verify       # gate completo: types + lint + test + build + size
pnpm api:types    # regenera tipos desde Swagger
```

Gate obligatorio antes de declarar algo terminado:

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm size
# o, de una vez:
pnpm verify
```

## 5. Protocolo de trabajo

1. Lee los documentos del punto 2.
2. Trabaja **un slice vertical a la vez**: dominio → api → ui → ruta → prueba.
3. Al terminar cada slice: enseña archivos tocados, resultado del gate y qué quedó pendiente.
4. No cambies una decisión registrada en `docs/01-adr-stack.md` sin escribir un ADR nuevo que la reemplace.
5. Si el backend contradice `docs/03-contratos-api.md`, **gana la verificación en vivo** y se actualiza el doc
   con fecha y evidencia.

## 6. Trampas conocidas de este backend

- `GET /api/country/all` **ignora** `Sort` y `Filter` en silencio.
- `Search.SearchText` con texto → **500** (bug de reflexión sobre propiedad estática `GetCubaCode`).
- `Search.SearchText` vacío → **400** (campo requerido: hay que **omitir** el parámetro).
- `GET /api/country/{code}` exige `Nomenclators:Read` (401 sin token); la UI del origen reportó 404.
- Solo `Pag.Page` / `Pag.PageSize` funcionan de forma fiable en `/all`.

Consecuencia de diseño: **catálogo-first** (`/all?PageSize=250`) + búsqueda/orden/filtro en cliente
(ADR-013). Ver [`docs/08-riesgos-y-deuda.md`](docs/08-riesgos-y-deuda.md).

## 7. Arranque: no reordenar `main.tsx`

`createBrowserRouter` **ejecuta los `loader` al construirse**. El router se crea dentro de `bootstrap()`,
después de MSW y de `installAuth`. Si se mueve a nivel de módulo, la restauración de sesión vuelve a
correr sin proveedor de tokens y un F5 cierra la sesión (fallo real del 2026-11-20, ADR-017).
