# 09 · Bitácora de construcción

> Registro de lo hecho, lo decidido sobre la marcha y lo que queda. Sirve para el traspaso:
> quien retome el proyecto no debería tener que reconstruir el razonamiento leyendo el diff.

**Periodo:** 2026-11-20 · **Estado:** las nueve fases (F0–F9) cerradas con gate verde.

---

## 1. Resumen

| Fase | Entregable                                                                           | Evidencia                            |
| ---- | ------------------------------------------------------------------------------------ | ------------------------------------ |
| F0   | ADR-001…017, arquitectura, contratos, sistema de diseño, plan, estrategia de pruebas | `docs/00`–`08`                       |
| F1   | Scaffold, tokens, shell, MSW con 249 países, catálogo `/design-system`               | `docs/assets/f1-*`                   |
| F2   | Login, tokens cifrados, refresh con reintento único, guards, RBAC de 3 capas         | `docs/assets/f2-acceso-denegado.png` |
| F3   | Catálogo-first, tabla controlada, búsqueda sin acentos, estado en URL                | `docs/assets/f3-*`                   |
| F4   | Alta/edición con RHF+Zod, activación optimista con rollback                          | `docs/assets/f4-*`                   |
| F5   | Detalle desde caché, inicio con KPIs derivados                                       | `docs/assets/f5-*`                   |
| F6   | Auditoría de contraste (11 tokens corregidos) y axe-core                             | `docs/assets/f6-*`                   |
| F7   | 12 e2e, CI, presupuesto de arranque, este documento                                  | `e2e/`, `.github/workflows/ci.yml`   |
| F8   | Usuarios: listado paginado, alta, edición, borrado y reset de contraseña             | `docs/assets/f8-usuarios.png`        |
| F9   | Roles y matriz de permisos por recurso y acción                                      | `docs/assets/f9-permisos.png`        |

Números al cierre: **249 pruebas unitarias/integración** (34 archivos), **23 e2e**, **184 KB gzip** de
arranque, 0 errores de lint, 0 `any`.

---

## 2. Decisiones tomadas sobre la marcha

Las que no estaban en el plan y conviene no volver a discutir sin leer el motivo:

1. **Catálogo-first (ADR-013).** El backend ignora `Sort`/`Filter` y su búsqueda devuelve 500. Se trae
   `/all?PageSize=250` una vez y se busca en cliente. Consecuencia: la tabla no crece sin cambiar el
   umbral de 1 000 filas (R9).
2. **Router dentro de `bootstrap()` (ADR-017).** `createBrowserRouter` ejecuta los loaders al
   construirse; en módulo, un F5 restauraba la sesión antes de instalar auth y el refresh se escapaba
   al backend real. Hay prueba e2e que lo vigila.
3. **Tabla totalmente controlada.** TanStack reenvía `updater` que se aplica al estado previo; combinado
   con paginación derivada de la URL producía un bucle (clic «siguiente» → pedía 2 → volvía a 1). La
   tabla recibe `pageIndex` y avisa con números.
4. **Composición en `app/`.** El inicio necesita datos de Países y una feature no importa otra:
   `app/pages/HomePage.tsx` es el único punto que compone ambas, y `DashboardView` es presentacional.
5. **Tokens corregidos por contraste (F6).** Once colores no llegaban a AA; se ajustaron con evidencia
   numérica y una prueba que impide volver atrás (tabla completa en `04-sistema-diseno.md` §6.1).
6. **Persistencia de filtros (ADR-018).** El origen los guardaba en sessionStorage; la URL sola no cubre
   volver por el menú. Se portó la política —versión, TTL, descarte de lo corrupto— con la URL como dueña
   y el almacenamiento como semilla por usuario.
7. **Árbol de permisos con dos vistas (ADR-019).** La tabla la elegí yo; el origen usa un árbol. Ahora hay
   un conmutador y un árbol con tri-estado que propaga, sin añadir dependencias.
8. **Movimiento sin librerías (F10).** El usuario notaba brusquedad en el cambio de tema, de página y al
   contraer el sidebar. Se resolvió con CSS y tokens: clase heme-transition temporal, key={pathname} en
   el Outlet, etiquetas del sidebar que se desvanecen en lugar de desmontarse y un componente
   TableRowAction compartido por las tres tablas.
9. **Playwright contra el navegador instalado.** El CDN responde 403 por región; el config usa Edge y
   CI instala Chromium propio (R16).

---

## 3. Incidentes y aprendizaje

| Incidente                                    | Causa                                                                                                | Arreglo                                                     |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `typescript-eslint` no arranca               | TS 7.0.2 instalado por rango                                                                         | `typescript@~5.9.3` (R14)                                   |
| MSW 3 no reconocía `onUnhandledRequest`      | API renombrada                                                                                       | `onUnhandledFrame`                                          |
| Bucle de 401                                 | cliente reintentaba sin marca                                                                        | bandera `retried` + refresh único comparando el token usado |
| F5 cerraba la sesión                         | router en módulo                                                                                     | ADR-017 + sonda `/api/__msw/ready`                          |
| `Button asChild` rompía Radix Slot           | spinner condicional                                                                                  | rama `asChild` devuelve un hijo único                       |
| Paginación no avanzaba                       | `updater` sobre estado obsoleto                                                                      | tabla controlada                                            |
| La suite se colgaba en conjunto (2026-11-23) | `persist` de Zustand escribiendo en el `localStorage` de jsdom, realimentado por el evento `storage` | almacenamiento no-op en pruebas (`docs/06` §3.1)            |
| Parser de tokens perdía 3 colores            | comentario pegado a la declaración                                                                   | quitar comentarios antes de partir por `;`                  |
| Suite de a11y «siempre verde»                | axe sin control negativo                                                                             | test que exige detectar `button-name`                       |

---

## 4. Lo que falta (fuera del alcance actual)

1. **Verificación contra el backend real.** Todo F2–F7 corrió en `mock`. Pendiente con credenciales
   válidas: login, escrituras, y las preguntas Q1–Q7 de `docs/08` (casing del refresh, 409 vs 400 al
   crear, `DELETE` 200 vs 204, `GET /{code}` 404 con token).
2. **CI en un remoto real.** El workflow está escrito y el gate se ejecutó en local; no hay repositorio
   remoto todavía, así que «CI verde en un PR» queda sin marcar.
3. **E2E contra API real.** El `webServer` usa `VITE_API_MODE=mock`; un job nocturno con credenciales
   sería el siguiente paso natural.
4. **Cobertura de ramas.** `pnpm test:coverage` funciona; no se fijó umbral porque el proyecto prioriza
   comportamiento sobre porcentaje. Si se fija, empezar por `core/auth` y `core/http`.
5. **Paginación en servidor.** `useServerPagination` está implementado y sin usar; se activa cuando el
   catálogo supere 1 000 filas (R9).

---

## 5. Cómo levantarlo en cinco minutos

```bash
pnpm install
pnpm dev          # http://localhost:5173 con MSW (admin / Admin123$)
pnpm verify       # types + lint + 237 pruebas + build + presupuesto
pnpm e2e          # 12 pruebas en navegador real
```

Si algo falla, el orden de sospecha aprendido: (1) versión de Node/pnpm, (2) MSW no arrancó —mirar
`/api/__msw/ready`—, (3) orden de `main.tsx`, (4) un token de color que ya no cumple contraste.
---

## 10. El sidebar «brusco» era la preferencia del sistema (2026-11-23)

Síntoma: el usuario veía las transiciones a saltos **en su navegador**, mientras que en incógnito y en
Playwright se veían bien. Yo había «arreglado» la animación dos veces sin éxito porque miraba el código
equivocado.

Diagnóstico: Windows tenía desactivado «Efectos de animación» (`SPI_GETCLIENTAREAANIMATION = False`), lo
que alimenta `prefers-reduced-motion: reduce`; nuestro CSS global apagaba entonces **todas** las
transiciones. Playwright reporta `no-preference` aunque el sistema diga lo contrario, y por eso mis
pruebas siempre salían bien. Lección: cuando «a ti sí y a mí no», la diferencia está en el entorno antes
que en el código, y hay que medirlo en el entorno del usuario.

Arreglo: interruptor de animaciones en la barra superior (Sistema / Siempre / Nunca), por defecto Sistema,
y el CSS cede ante la preferencia explícita con `html:not([data-motion='always'])`. Verificado emulando
`reduce`: `0.00001s` → `0.24s` al activar «Siempre».

De paso se cambió la animación del sidebar para no animar `max-width` (recálculo de layout por frame) y
centrar el icono con `padding-left` en lugar de `justify-content`.
---

## 11. Repositorio, CI y CD (2026-11-23)

Hasta hoy el proyecto **no estaba bajo control de versiones**: existía un `ci.yml` que nunca se había
ejecutado y todo el trabajo vivía en un solo disco. Se hizo:

- `git init` en `main`, `.gitattributes` con `* text=auto eol=lf` (sin él, `core.autocrlf` de Windows genera
  diffs de líneas completas en cada checkout) y primer commit de 214 archivos, 1,5 MB de historia,
  sin `node_modules`, `dist`, `coverage` ni `.env`.
- **Cobertura obligatoria**: `verify` y el CI usan `test:coverage`; umbrales en `vite.config.ts` (global
  75/67/70/76 y por capa, ver `docs/06` §1.1). Se verificó que un umbral imposible rompe el comando.
- **CI** (`ci.yml`) con caché de navegadores de Playwright, artefacto de cobertura y `VITE_API_MODE=mock`
  explícito.
- **CD** (`deploy.yml`) que publica una demo estática en Pages, solo a mano o con etiqueta `v*`.
  `vite.config.ts` acepta `VITE_BASE` para servir bajo `/<repo>/`.

Pendiente de decisión: el destino real del panel. La demo de Pages usa datos simulados porque el backend
solo permite CORS desde `localhost:5173` (R6) y no hay usuario de prueba (R5).
---

## 12. El primer CI falló por la versión de Node (2026-11-23)

Primer push, primer fallo: el job `quality` murió en «Pruebas y cobertura» con **cobertura al 0 %** y 35
errores. La cobertura era el cadáver; el arma estaba enterrada arriba:

```
Error: [vitest-pool]: Failed to start forks worker
Caused by: TypeError: Cannot read properties of undefined (reading 'bind')
  ❯ undici@8.12.4/lib/interceptor/decompress.js:78
```

`undici` (que entra por `jsdom@31`) usa `zlib.createZstdDecompress`, y esa función **no existe en Node
22.12**. El worker ni arrancaba, así que Vitest informaba 0 tests y la cobertura 0 %. Los umbrales
funcionaron perfectamente: señalaron la catástrofe real.

Por qué no se reproducía en local: `jsdom@31` exige `^22.22.2 || ^24.15.0 || >=26.0.0` y la máquina tiene
Node 26. El CI usaba `22.12.0` —heredado de un `engines: ">=22.12.0"` escrito a mano cuando el stack era
otro—. **El `engines` del proyecto prometía algo que las dependencias no cumplían.**

Arreglo: CI y despliegue con **Node 24** (LTS, cumple todos los `engines`), `.nvmrc` en `24`, `engines`
corregido a `>=22.22.2` —el mínimo real de jsdom— y `.npmrc` con la nota de por qué no se activa
`engine-strict` (pnpm lo aplica también a dependencias transitivas y rompería la instalación por un rango
antiguo).

Lección: cuando el fallo aparece en la primera ejecución del CI y no en local, la diferencia es **el
entorno**, y el mensaje real casi nunca está en el último error de la lista sino en el primer `Caused by`.
