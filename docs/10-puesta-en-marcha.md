# 10 — Puesta en marcha del repositorio, CI y CD

> **Fecha:** 2026-11-23 · Guía operativa: qué hacer, en qué orden y qué comprobar después de cada paso.

---

## 0. Antes de empezar

Necesitas: cuenta de GitHub, `git` instalado, y este repositorio ya inicializado (lo está: dos commits en `main`).

Hay dos caminos para todo lo que sigue: **interfaz web** o **`gh` CLI**. El segundo es más rápido y reproducible; si no tienes `gh`, usa la web (los pasos son los mismos).

---

## 1. Crear el repositorio remoto

1. GitHub → **New repository**.
2. Nombre, visibilidad y **sin** README, `.gitignore` ni licencia (el repo ya los tiene; si GitHub los crea, el primer push falla por historiales distintos).
3. Copia la URL (SSH o HTTPS).

```bash
git remote add origin git@github.com:<usuario>/<repo>.git
git remote -v                      # debe mostrar origin con fetch y push
git push -u origin main
```

**Comprobación:** el repo en GitHub muestra 214 archivos y dos commits en `main`.

---

## 2. Activar Actions

En un repo nuevo, Actions suele estar activo. Si no:

**Settings → Actions → General → Actions permissions**: _Allow all actions and reusable workflows_.

En la pestaña **Actions** deberían aparecer los flujos `CI` y `Deploy`. El push de `main` ya habrá lanzado `CI` una vez.

**Comprobación:** `CI` aparece en verde, con los jobs `quality` y `e2e`.

> El primer run puede tardar varios minutos: instala dependencias y Chromium desde cero. Los siguientes usan caché.

---

## 3. Proteger `main` (el paso que convierte el CI en guardián)

**Settings → Branches → Add branch protection rule** (o _Rules → Rulesets_, según la versión de la UI).

Configuración recomendada:

| Opción                                    | Valor                       | Por qué                                     |
| ----------------------------------------- | --------------------------- | ------------------------------------------- |
| Branch name pattern                       | `main`                      | Protege la única rama de entrega            |
| **Require a pull request before merging** | ✅                          | Nada entra directo, ni tuyo                 |
| Require approvals                         | 0 (proyecto de una persona) | Con más gente, subir a 1                    |
| **Require status checks to pass**         | ✅                          | Es el punto de todo el ejercicio            |
| Required checks                           | `quality` y `e2e`           | Los dos jobs del CI                         |
| Require branches to be up to date         | ✅                          | Evita verdes falsos por mezcla              |
| Require conversation resolution           | ✅                          | No se fusiona con comentarios abiertos      |
| Do not allow bypassing                    | ✅ (si es posible)          | Ni el administrador se salta su propio gate |
| Allow force pushes / deletions            | ❌                          | Historia lineal y sin sorpresas             |

Los nombres `quality` y `e2e` son los `name:` de cada job en [`ci.yml`](../.github/workflows/ci.yml).
**Si algún día renombras un job, actualiza esta regla**: un required check que ya no existe deja los PR
bloqueados para siempre mostrando «Expected — waiting».

Con `gh` CLI:

```bash
gh api -X PUT "repos/:owner/:repo/branches/main/protection" \
  -f "required_status_checks[strict]=true" \
  -f "required_status_checks[contexts][]=quality" \
  -f "required_status_checks[contexts][]=e2e" \
  -f "enforce_admins=true" \
  -f "required_pull_request_reviews[required_approving_review_count]=0" \
  -f "restrictions="
```

**Comprobación:** en un repo así, un PR con el CI en rojo muestra el botón _Merge_ deshabilitado.

---

## 4. Publicar la demo (CD, opcional)

1. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Pestaña **Actions → Deploy → Run workflow** (rama `main`).

`deploy.yml` compila con `VITE_API_MODE=mock` y `VITE_BASE=/<repo>/` y publica en
`https://<usuario>.github.io/<repo>/`.

**Limitación conocida:** la demo usa datos simulados. Apuntar al backend real exige CORS desde el origen de
Pages (riesgo R6, [`08-riesgos-y-deuda.md`](08-riesgos-y-deuda.md)) y un usuario de prueba (R5).

---

## 5. Protección contra instrucciones del navegador (opcional pero recomendable)

Si el panel va a mostrarse a más gente desde Pages y en el futuro se conecta al backend, revisa la política
de contenido (`Content-Security-Policy`) al decidir el hosting real. No se configura aquí porque depende del
destino.

---

## 6. Flujo de trabajo diario

```bash
git switch -c feat/campo-telefono-paises
# ...cambios...
pnpm verify                 # gate local: si falla, no hay push
git add -A && git commit -m "feat(countries): agregar teléfono"
git push -u origin feat/campo-telefono-paises
```

Luego: **Pull request** → el template pide qué cambia, por qué y cómo se probó → CI corre `quality` y `e2e`
→ con ambos en verde y la rama al día, _Merge_.

Después del merge, borra la rama (`git switch main && git pull`).

---

## 7. Qué hacer cuando algo falla

| Síntoma                                 | Dónde mirar                         | Causa habitual                                                             |
| --------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| `quality` rojo en «Tipos»               | Log del step                        | Un tipo roto que en local no se compiló (`pnpm typecheck` primero)         |
| `quality` rojo en «Pruebas y cobertura» | Log del step + artefacto `coverage` | Umbral de cobertura: la línea exacta aparece en el error                   |
| `quality` rojo en «Presupuesto»         | Log del step `pnpm size`            | Subiste el bundle por encima de 250 KB gzip                                |
| `e2e` rojo                              | Artefacto `playwright-report`       | Selector frágil, texto cambiado o diferencia Edge (local) vs Chromium (CI) |
| PR bloqueado con «Expected — waiting»   | Regla de rama                       | Un required check fue renombrado o eliminado                               |
| `install --frozen-lockfile` falla       | Log del step                        | `package.json` cambió sin `pnpm install` (lockfile desactualizado)         |

---

## 8. Lo que queda pendiente para CD «de verdad»

1. Decidir **destino** (IIS corporativo, VPS, Vercel…) y sustituir `deploy.yml`.
2. **Entornos** `staging` y `production` con secretos separados.
3. **Aprobación manual** antes de producción (`environment` con _required reviewers_).
4. **CORS y usuario de prueba** del backend para salir de `mock`.
5. **Versionado**: etiquetas `v*` ya disparan el despliegue; falta decidir la política de versiones.
