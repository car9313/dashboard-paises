# 03 — Contratos del API (verificados en vivo)

> **Verificado:** 2026-11-20 contra `http://172.22.10.3:1235` (Kestrel, ASP.NET Core)
> **Fuente de verdad secundaria:** `GET /swagger/v1/swagger.json` (47 rutas, título "Certification API")
>
> Este documento **no** es una traducción del Swagger: es lo que el backend hace cuando se le llama.
> Cuando Swagger y la respuesta real discrepan, aquí queda la respuesta real.

---

## 1. Entorno

| Dato              | Valor                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------- |
| Base URL (dev)    | `http://172.22.10.3:1235`                                                             |
| Swagger           | `http://172.22.10.3:1235/swagger/v1/swagger.json`                                     |
| Transporte        | HTTP/1.1, JSON `camelCase` en el body                                                 |
| CORS              | Refleja el `Origin`; permite `http://localhost:5173` (verificado con preflight `204`) |
| Headers expuestos | `Content-Length`, `X-Request-Id`, `X-Change-Password-Token`                           |
| Auth              | `Authorization: Bearer <accessToken>`                                                 |
| Errores           | `ProblemDetails` (`type`, `title`, `status`, `detail`, `traceId`, `errors`)           |

> **Puerto fijo:** el dev server debe escuchar en **5173**. Otro puerto obliga a tocar la política CORS
> del backend, que no controlamos.

---

## 2. Convención del query string

El backend modela la búsqueda con `SearchQuery`:

```csharp
public record SearchQuery {
  public Search? Search { get; set; }   // SearchText, Strict
  public string Sort   { set; }         // JSON serializado de Sort[]
  public string Filter { set; }         // JSON serializado de Filter[]
  public Pag Pag { get; set; }          // Page, PageSize
}
```

Formato serializado correcto:

| Param               | Forma           | Ejemplo                                                      |
| ------------------- | --------------- | ------------------------------------------------------------ |
| `Pag.Page`          | entero          | `Pag.Page=2`                                                 |
| `Pag.PageSize`      | entero          | `Pag.PageSize=250`                                           |
| `Search.SearchText` | texto           | `Search.SearchText=cub`                                      |
| `Search.Strict`     | booleano        | `Search.Strict=false`                                        |
| `Sort`              | **JSON string** | `Sort=[{"SortBy":"name","Ascending":true}]`                  |
| `Filter`            | **JSON string** | `Filter=[{"PropertyName":"active","PropertyValue":"false"}]` |

**Regla obligatoria:** los parámetros vacíos se **omiten**, nunca se envían vacíos.
`Search.SearchText=` (vacío) devuelve **400** `The SearchText field is required.`

> ⚠️ El proyecto origen enviaba `Sort[0].SortBy=...` (formato de binder por índices) que **no** corresponde
> a este `SearchQuery`. Nunca falló porque la pantalla de países tenía todas las columnas `sortable: false`.

---

## 3. Endpoints en alcance

| Método   | Ruta                           | Auth requerida                           | Request            | Response                  | Estado                                             |
| -------- | ------------------------------ | ---------------------------------------- | ------------------ | ------------------------- | -------------------------------------------------- |
| `POST`   | `/api/auth/login`              | —                                        | `LogInCommand`     | `LoginResponseBody`       | ⚠️ contrato Swagger; no probado (sin credenciales) |
| `POST`   | `/api/auth/refresh-token`      | — (usa refresh)                          | `{ refreshToken }` | `RefreshTokenResponse`    | ⚠️ contrato Swagger                                |
| `POST`   | `/api/auth/logout`             | Bearer                                   | `{ refreshToken }` | `200`                     | ⚠️ contrato Swagger                                |
| `GET`    | `/api/auth/authenticated`      | Bearer                                   | —                  | `200`                     | ✅ probado: `401` sin token                        |
| `GET`    | `/api/auth/user/current`       | Bearer                                   | —                  | `UserDto`                 | ✅ probado: `401` sin token                        |
| `GET`    | `/api/country/all`             | **pública** (el atributo está comentado) | `SearchQuery`      | `FilterResponse<Country>` | ✅ **verificado 200**                              |
| `GET`    | `/api/country`                 | **pública**                              | `Filter`, `Cursor` | `{ objects, nextCursor }` | ✅ **verificado 200**                              |
| `GET`    | `/api/country/{code}`          | `Nomenclators:Read`                      | —                  | `Country`                 | ✅ probado: `401` sin token                        |
| `POST`   | `/api/country`                 | `Nomenclators:Create`                    | `{ code, name }`   | `Country`                 | ⚠️ Swagger (falta token)                           |
| `PUT`    | `/api/country/{code}`          | `Nomenclators:Update`                    | `{ name }`         | `Country`                 | ⚠️ Swagger (falta token)                           |
| `PUT`    | `/api/country/activate/{code}` | `Nomenclators:Update`                    | —                  | `200`                     | ⚠️ Swagger (falta token)                           |
| `DELETE` | `/api/country/{code}`          | `Nomenclators:Delete`                    | —                  | `200` (borrado lógico)    | ⚠️ Swagger (falta token)                           |

> **Hallazgo de seguridad:** `List` y `ListAll` tienen `[AuthorizeResource(...)]` **comentado** en
> `CountriesController.cs`. El nomenclador completo es legible sin token. La UI debe seguir exigiendo
> sesión (ADR-014), pero conviene reportarlo al equipo de backend.

### 3.1 Administración de seguridad (ADR-019)

Verificado contra `swagger/v1/swagger.json` el 2026-11-20. **No probado en vivo** (sin credenciales).

| Método   | Ruta                              | Request                | Response                   | Códigos             |
| -------- | --------------------------------- | ---------------------- | -------------------------- | ------------------- |
| `GET`    | `/api/users`                      | `SearchQuery` (ver §2) | `UserDtoFilterResponse`    | 200, 401, 403       |
| `POST`   | `/api/users`                      | `CreateUserCommand`    | `UserDto`                  | 200, 400, 409, 401… |
| `GET`    | `/api/users/{id}`                 | —                      | `UserDto`                  | 200, 404, 401, 403  |
| `PUT`    | `/api/users/{id}`                 | `UpdateUserRequest`    | `UserDto`                  | 200, 404, 400, 409… |
| `DELETE` | `/api/users/{id}`                 | —                      | `200`                      | 200, 409, 401, 403  |
| `POST`   | `/api/users/{id}/reset-password`  | `null`                 | `200` (clave temporal)     | 200, 404, 401, 403  |
| `GET`    | `/api/roles`                      | `SearchQuery`          | `RoleDtoFilterResponse`    | 200, 401, 403       |
| `POST`   | `/api/roles`                      | `CreateRoleCommand`    | `RoleDto`                  | 200, 400, 401, 403  |
| `GET`    | `/api/roles/{id}`                 | —                      | `RoleDto`                  | 200, 404, 401, 403  |
| `PUT`    | `/api/roles/{id}`                 | `UpdateRoleRequest`    | `RoleDto`                  | 200, 400, 404, 409… |
| `DELETE` | `/api/roles/{id}`                 | —                      | `200`                      | 200, 409, 401, 403  |
| `GET`    | `/api/roles/permissions`          | —                      | `AppPermissionsCategory[]` | 200                 |
| `GET`    | `/api/roles/{roleId}/permissions` | —                      | `AppPermissionsCategory[]` | 200, 404, 401, 403  |
| `PUT`    | `/api/roles/{id}/permissions`     | `ActionCommand[]`      | `200`                      | 200, 400, 404, 409… |

**Formas.**

```ts
UserDto   = { id, username, fullName, isUnEditable, isUnDeletable, roles: RoleDto[] }
CreateUserCommand = { userType?, userName, fullName, password, passwordConfirmation, roleIds: number[] }
UpdateUserRequest = { fullName, password?, passwordConfirmation?, roleIds: number[] }   // sin username
RoleDto   = { id, name, isUnEditable, isUnDeletable, permissions: PermissionDto[] }
PermissionDto = { resource, description, actions: string[] }
ActionCommand = { resource, actionType }   // actionType ∈ Leer | Crear | Actualizar | Eliminar
```

**Notas de contrato.**

- Los listados de usuarios y roles usan **el mismo `SearchQuery`** que países, así que arrastran sus
  defectos (§5): `Sort`/`Filter` se ignoran y `Search.SearchText` con texto devuelve 500. Buscar usuarios
  en el servidor **no** es una opción hoy.
- `userType` es un enum `0|1` que el origen **no envía**; el binder de .NET lo resuelve a `0`. Se replica
  y se anota como pregunta abierta (Q8).
- `reset-password` devuelve la clave temporal. El origen la tipa como `void`; aquí se tipa como
  `{ password?: string }` tolerante, porque el cuerpo exacto no está verificado.
- `DELETE` responde `409` cuando el registro es `isUnDeletable`: es la señal para deshabilitar la acción,
  no para reintentar.
- Los permisos se guardan **planos** (`{ resource, actionType }[]`), no como el árbol que se pinta.

---

## 4. Shapes exactos

### 4.1 `Country`

```json
{ "code": "AF", "name": "Afganistán", "active": true, "isUnitedState": false }
```

- `isUnitedState` es **calculada** (`Code == "US"`), `readOnly` en Swagger. El dominio la **descarta**.
- `code` es la clave natural (2 letras ISO-3166-1 alpha-2 en los datos sembrados).

### 4.2 `GET /api/country/all`

```http
GET /api/country/all?Pag.Page=1&Pag.PageSize=2
```

```json
{
  "objects": [
    { "code": "AF", "name": "Afganistán", "active": true, "isUnitedState": false },
    { "code": "AL", "name": "Albania", "active": true, "isUnitedState": false }
  ],
  "meta": { "currentPage": 1, "nextPage": 2, "prevPage": null, "totalPage": 125, "totalCount": 249 }
}
```

- Orden por defecto: **alfabético por `name`** (depende de la collation de la BD; no lo garantiza el contrato).
- `PageSize=250` devuelve **las 249 filas en una respuesta** (~25 KB). Es la base de ADR-013.
- `meta.totalPage` = `ceil(totalCount / pageSize)`.

### 4.3 `GET /api/country` (cursor)

```json
{ "objects": [ { "code": "AD", "name": "Andorra", … } ], "nextCursor": "<opaque|null>" }
```

- **No** devuelve `meta` ni `totalCount`: no sirve para paginar con totales.
- Ordena por `code`.
- Parámetros reales: `Filter` (JSON) y `Cursor` (string opaco). **No** acepta `Pag.*

### 4.4 `GET /api/auth/user/current`

```json
{
  "id": 1,
  "username": "jlopez",
  "fullName": "Juan López",
  "roles": [
    {
      "name": "Administrador",
      "permissions": [
        { "resource": "Nomenclators", "actions": ["Leer", "Crear", "Actualizar", "Eliminar"] }
      ]
    }
  ]
}
```

> Estructura tomada del contrato del origen (`SessionUserDto`). El `UserDto` de Swagger confirma
> `id`, `username`, `fullName`, `roles[].name`; la forma exacta de `permissions[]` debe confirmarse con un
> token real antes de cerrar F2.

### 4.5 `POST /api/auth/login`

```json
// request
{ "username": "jlopez", "password": "•••••", "fingerprint": "<uuid persistente del dispositivo>" }
```

```json
// 200
{
  "accessToken": "eyJ…",
  "tokenType": "Bearer",
  "issuedAt": "2026-11-20T17:00:00Z",
  "refreshToken": "…",
  "expiresIn": 60,
  "refreshTokenExpiresIn": 4320
}
```

- `expiresIn` y `refreshTokenExpiresIn` están en **minutos** (confirmado en el origen el 2026-09-22).
- El backend impone **sesión única por huella**: un login nuevo invalida el anterior.
- `fingerprint` debe ser **persistente** (generado una vez y guardado): si cambia, el backend no reconoce el dispositivo.

### 4.6 `POST /api/auth/refresh-token`

```json
// request          →  // 200
{ "refreshToken": "…" }   { "accessToken": "…", "tokenType": "Bearer", "issuedAt": "…", "expiresIn": 60 }
```

- **No rota el refresh token**: se conserva el mismo hasta el logout o la expiración.
- El nombre `refreshToken` va en **camelCase** según Swagger (el origen creía que era `RefreshToken`
  en PascalCase: verificar en la primera prueba real y anotarlo aquí).

---

## 5. Defectos del backend (reproducibles)

Estos tres defectos afectan **exactamente** a la pantalla que este dashboard conserva. Fueron medidos,
no inferidos.

### 5.1 Búsqueda → 500

```http
GET /api/country/all?Search.SearchText=cub
```

```json
{
  "success": false,
  "message": "Ha ocurrido un error inesperado.",
  "detail": "Static property requires null instance, non-static property requires non-null instance. (Parameter 'expression')",
  "stackTrace": "   at System.Linq.Expressions.Expression.Property(Expression expression, PropertyInfo property)\n   at Common.Filters.Extensions.SearchExtensions.ApplySearchText(IEnumerable`1 properties, ParameterExpression parameter, String searchText)\n   at Common.Filters.Extensions.SearchExtensions.ApplySearch[T](IQueryable`1 queryable, Search search)\n   at CertExt.Application.Nomenclators.Countries.CountriesService.ListAll(SearchQuery request, CancellationToken cancellationToken)"
}
```

**Causa raíz:** `SearchExtensions.ApplySearchText` recorre `typeof(T).GetProperties()` y construye
`Expression.Property(parameter, property)`. `Country` tiene la **propiedad estática** `GetCubaCode`, y una
propiedad estática no puede expresarse sobre una instancia → excepción.

**Arreglo sugerido (una línea, lado backend):**

```csharp
// SearchExtensions.ApplySearchText / ApplyStrictSearchText
properties = typeof(T).GetProperties(BindingFlags.Public | BindingFlags.Instance);
```

**Estado:** reportado, no corregido (no tocamos el repo de trabajo).

### 5.2 `Sort` ignorado en silencio

| Petición                                     | Resultado                          |
| -------------------------------------------- | ---------------------------------- |
| sin `Sort`                                   | AF, AL, Alemania… (alfabético asc) |
| `Sort=[{"SortBy":"name","Ascending":false}]` | **AF, AL, Alemania…** (idéntico)   |
| `Sort=[{"SortBy":"code","Ascending":false}]` | **AF, AL, Alemania…** (idéntico)   |

**Conclusión:** el parámetro se deserializa pero no se aplica al `IQueryable`.

### 5.3 `Filter` ignorado en silencio

| Petición                                                     | `objects`                          | `totalCount` |
| ------------------------------------------------------------ | ---------------------------------- | ------------ |
| `Filter=[{"PropertyName":"active","PropertyValue":"false"}]` | AF (active=true), AL (active=true) | 249          |
| `Filter=[{"PropertyName":"name","PropertyValue":"Cuba"}]`    | AF, AL…                            | 249          |

**Conclusión:** el filtro no se aplica en `/all`. En `/api/country` (cursor) devuelve `objects: []`, es
decir tampoco filtra correctamente. **No hay filtering de servidor utilizable.**

### 5.4 Búsqueda vacía → 400

```http
GET /api/country/all?Search.SearchText=
```

```json
{
  "type": "…rfc9110#section-15.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": { "Search.SearchText": ["The SearchText field is required."] }
}
```

**Regla de cliente:** `Search.SearchText` se **omite** cuando está vacío (nuestro `params.ts` lo hace).

### 5.5 Detalle: 401 sin token; 404 reportado con token

- Sin token: `401` (correcto, exige `Nomenclators:Read`).
- El proyecto origen documentó `GET /api/country/AF → 404` con token (`BE-008`, 2026-11-03) y nunca se
  confirmó. **Consecuencia de diseño:** el detalle se sirve desde el catálogo en caché; el endpoint real
  solo se usa como respaldo si el `code` no está en caché (enlace directo).

---

## 6. Matriz de decisión: qué resolvemos en cliente

| Necesidad                             | Backend                | Decisión                                               |
| ------------------------------------- | ---------------------- | ------------------------------------------------------ |
| Listar países                         | ✅ `/all?Pag.*`        | **Servidor** (una sola petición del catálogo completo) |
| Paginar                               | ✅ `Pag.Page/PageSize` | **Cliente** sobre el catálogo (ADR-013)                |
| Buscar por nombre/código              | ❌ 500                 | **Cliente** (`includes` normalizado, sin acentos)      |
| Ordenar                               | ❌ ignorado            | **Cliente** (TanStack Table)                           |
| Filtrar por estado                    | ❌ ignorado            | **Cliente**                                            |
| Detalle                               | ⚠️ 401/404             | **Caché** por `code`, endpoint como respaldo           |
| Crear / editar / activar / desactivar | ✅ (auth)              | **Servidor**, con optimismo solo en el toggle          |

### Búsqueda en cliente

```ts
const normalize = (v: string) =>
  v
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
// "cuba" encuentra "Cuba"; "espana" encuentra "España"
```

---

## 7. Fixtures

`src/mocks/fixtures/countries.json` se genera con:

```bash
curl -s "http://172.22.10.3:1235/api/country/all?Pag.Page=1&Pag.PageSize=250" \
  | jq '.objects' > src/mocks/fixtures/countries.json
```

Contiene **249 países reales** (código, nombre, activo). Se usa en MSW (dev, tests y e2e), así que la UI
se prueba contra el shape verdadero sin depender de la red corporativa.

---

## 8. Tipos desde Swagger

```bash
pnpm api:types   # openapi-typescript http://172.22.10.3:1235/swagger/v1/swagger.json -o src/core/api/schema.d.ts
```

- El archivo generado **se commitea** (CI no debe necesitar VPN).
- En CI se verifica que el Swagger no cambió de forma incompatible: si falla, se regenera y se revisa el diff.
- Los tipos generados **no** se usan directamente en componentes: `api/dto.ts` los adapta y el mapper
  produce dominio.

---

## 9. Cómo re-verificar este documento

```powershell
$b = 'http://172.22.10.3:1235'
Invoke-WebRequest "$b/api/country/all?Pag.Page=1&Pag.PageSize=2" -UseBasicParsing | Select-Object -Expand Content
Invoke-WebRequest "$b/api/country/all?Search.SearchText=cub" -UseBasicParsing   # esperado: 500
Invoke-WebRequest "$b/api/country/AF" -UseBasicParsing                          # esperado: 401 sin token
(Invoke-WebRequest "$b/swagger/v1/swagger.json" -UseBasicParsing).Content | ConvertFrom-Json
```

Si algún resultado cambia: se actualiza este documento **con la fecha** y se revisa si ADR-013 sigue vigente.
