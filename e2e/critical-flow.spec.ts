import { expect, test, type Page } from '@playwright/test';

/**
 * Flujo crítico del dashboard, contra el dev server en modo `mock`.
 *
 * Cubre lo que las pruebas de componente no pueden: que el arranque real
 * (MSW → router → `installAuth`) funcione, que un F5 conserve la sesión y que
 * el camino completo de escritura llegue al «servidor».
 */

const ADMIN = { username: 'admin', password: 'Admin123$' } as const;
const CONSULTA = { username: 'consulta', password: 'Consulta123$' } as const;

async function signIn(page: Page, user: { username: string; password: string }) {
  await page.goto('/login');

  await page.getByLabel('Usuario').fill(user.username);
  await page.getByLabel('Contraseña').fill(user.password);
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Hola|Inicio/);
}

test.describe('sesión', () => {
  test('redirige a login sin sesión y vuelve al destino original', async ({ page }) => {
    await page.goto('/nomencladores/paises');

    await expect(page).toHaveURL(/\/login\?redirect=%2Fnomencladores%2Fpaises/);

    await page.getByLabel('Usuario').fill(ADMIN.username);
    await page.getByLabel('Contraseña').fill(ADMIN.password);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(/\/nomencladores\/paises/);
    await expect(page.getByRole('cell', { name: 'Afganistán', exact: true })).toBeVisible();
  });

  test('un F5 conserva la sesión (regresión del arranque, ADR-017)', async ({ page }) => {
    await signIn(page, ADMIN);

    await page.reload();

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Hola|Inicio/);
    await expect(page).toHaveURL('http://localhost:5173/');
  });

  test('rechaza credenciales inválidas con un mensaje claro', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Usuario').fill(ADMIN.username);
    await page.getByLabel('Contraseña').fill('incorrecta');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByText('Usuario o contraseña incorrectos.')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('cierra la sesión y protege las rutas privadas', async ({ page }) => {
    await signIn(page, ADMIN);

    await page.getByRole('button', { name: /sesión de/i }).click();
    await page.getByRole('menuitem', { name: /cerrar sesión/i }).click();

    await expect(page).toHaveURL(/\/login/);

    await page.goto('/nomencladores/paises');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('nomenclador de países', () => {
  test('busca, ordena y pagina sobre el catálogo', async ({ page }) => {
    await signIn(page, CONSULTA);
    await page.goto('/nomencladores/paises');

    await expect(page.getByText('Mostrando 1–10 de 249')).toBeVisible();

    await page.getByLabel('Buscar país').fill('espana');
    await expect(page.getByText('1 de 249 países')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'España', exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\?q=espana/);

    await page.getByLabel('Buscar país').fill('');
    await page.getByRole('button', { name: /nombre/i }).click();
    await expect(page.getByRole('cell', { name: 'Zimbabue', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Página siguiente' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText(/Página 2 de 25/)).toBeVisible();
  });

  test('la URL es la fuente de verdad: se puede compartir la vista', async ({ page }) => {
    await signIn(page, CONSULTA);

    await page.goto('/nomencladores/paises?q=cuba&status=active');

    await expect(page.getByRole('cell', { name: 'Cuba', exact: true })).toBeVisible();
    await expect(page.getByText('1 de 249 países')).toBeVisible();
  });

  test('crea un país y lo deja visible sin recargar', async ({ page }) => {
    await signIn(page, ADMIN);
    await page.goto('/nomencladores/paises');

    await page.getByRole('button', { name: 'Nuevo país' }).click();

    await page.getByLabel('Código').fill('zz');
    await page.getByLabel('Nombre').fill('Zzzlandia');
    await page.getByRole('button', { name: 'Crear país' }).click();

    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByText('250 de 250 países')).toBeVisible();

    await page.getByLabel('Buscar país').fill('zzz');
    await expect(page.getByRole('cell', { name: 'Zzzlandia', exact: true })).toBeVisible();
  });

  test('desactiva un país con cambio optimista', async ({ page }) => {
    await signIn(page, ADMIN);
    await page.goto('/nomencladores/paises');

    await page.getByRole('switch', { name: 'Desactivar Afganistán' }).click();

    await expect(page.getByRole('switch', { name: 'Activar Afganistán' })).toBeVisible();

    // Tras la revalidación el estado del servidor coincide con el optimista.
    await page.reload();
    await expect(page.getByRole('switch', { name: 'Activar Afganistán' })).toBeVisible();
  });

  test('al volver desde el menú conserva los filtros (ADR-018)', async ({ page }) => {
    await signIn(page, CONSULTA);
    await page.goto('/nomencladores/paises');

    await page.getByLabel('Buscar país').fill('cuba');
    await expect(page.getByText('1 de 249 países')).toBeVisible();

    // Salir por el menú: el enlace no lleva parámetros.
    await page.getByRole('link', { name: 'Inicio' }).click();
    await expect(page).toHaveURL('http://localhost:5173/');

    await page
      .getByRole('complementary', { name: 'Navegación principal' })
      .getByRole('link', { name: 'Países' })
      .click();

    await expect(page).toHaveURL(/\?q=cuba/);
    await expect(page.getByLabel('Buscar país')).toHaveValue('cuba');
    await expect(page.getByRole('cell', { name: 'Cuba', exact: true })).toBeVisible();
  });

  test('un enlace con parámetros gana sobre lo guardado', async ({ page }) => {
    await signIn(page, CONSULTA);
    await page.goto('/nomencladores/paises');

    await page.getByLabel('Buscar país').fill('cuba');
    await expect(page.getByText('1 de 249 países')).toBeVisible();

    await page.goto('/nomencladores/paises?q=espana');

    await expect(page.getByLabel('Buscar país')).toHaveValue('espana');
    await expect(page.getByRole('cell', { name: 'España', exact: true })).toBeVisible();
  });

  test('el detalle se sirve del catálogo ya cargado', async ({ page }) => {
    await signIn(page, CONSULTA);
    await page.goto('/nomencladores/paises');

    await page.getByRole('button', { name: 'Ver Afganistán' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Detalle del país')).toBeVisible();
    await expect(dialog.getByText('Afganistán')).toBeVisible();
  });

  test('quien solo puede leer no ve acciones de escritura', async ({ page }) => {
    await signIn(page, CONSULTA);
    await page.goto('/nomencladores/paises');

    await expect(page.getByRole('button', { name: 'Nuevo país' })).toHaveCount(0);
    await expect(page.getByRole('switch', { name: /Afganistán/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Ver Afganistán' })).toBeVisible();
  });
});

test.describe('inicio y accesibilidad de navegación', () => {
  test('muestra las métricas del catálogo', async ({ page }) => {
    await signIn(page, ADMIN);

    await expect(page.getByText('Total del nomenclador')).toBeVisible();
    await expect(page.getByText('Porcentaje de países activos')).toBeVisible();
    await expect(page.getByText('Países por letra inicial')).toBeVisible();
  });

  test('la navegación por teclado llega al contenido principal', async ({ page }) => {
    await signIn(page, ADMIN);

    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: /saltar/i })).toBeFocused();
  });
});

test.describe('administración de usuarios', () => {
  test('lista, crea y valida un usuario desde la interfaz', async ({ page }) => {
    await signIn(page, ADMIN);
    await page.goto('/seguridad/usuarios');

    await expect(page.getByText('12 usuarios')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'admin', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Nuevo usuario' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Usuario').fill('e2e.usuario');
    await dialog.getByLabel('Nombre completo').fill('E2E Usuario');
    await dialog.getByLabel(/^contraseña/i).fill('E2e12345$');
    await dialog.getByLabel('Confirmar contraseña').fill('E2e12345$');
    await dialog.getByRole('checkbox', { name: 'Consulta' }).check();
    await dialog.getByRole('button', { name: 'Crear usuario' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText('13 usuarios')).toBeVisible();
  });

  test('protege la cuenta del administrador en la propia tabla', async ({ page }) => {
    await signIn(page, ADMIN);
    await page.goto('/seguridad/usuarios');

    await expect(page.getByRole('button', { name: 'Editar admin' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Eliminar admin' })).toBeDisabled();
  });

  test('quien no tiene el recurso User no puede entrar a la pantalla', async ({ page }) => {
    await signIn(page, CONSULTA);
    await page.goto('/seguridad/usuarios');

    await expect(page).toHaveURL(/\/acceso-denegado/);
  });
});

test.describe('roles y permisos', () => {
  test('edita la matriz de permisos y la conserva', async ({ page }) => {
    await signIn(page, ADMIN);
    await page.goto('/seguridad/roles');

    await expect(page.getByRole('cell', { name: /^Administrador/ })).toBeVisible();

    await page.getByRole('button', { name: 'Ver permisos de Consulta' }).click();

    const dialog = page.getByRole('dialog');
    const crear = dialog.getByRole('checkbox', { name: 'Crear en Nomenclador de países' });

    await expect(crear).not.toBeChecked();
    await crear.check();
    await dialog.getByRole('button', { name: 'Guardar permisos' }).click();
    await expect(dialog).toBeHidden();

    await page.getByRole('button', { name: 'Ver permisos de Consulta' }).click();
    await expect(
      page.getByRole('dialog').getByRole('checkbox', { name: 'Crear en Nomenclador de países' })
    ).toBeChecked();
  });

  test('un rol del sistema se consulta pero no se edita', async ({ page }) => {
    await signIn(page, ADMIN);
    await page.goto('/seguridad/roles');

    await page.getByRole('button', { name: 'Ver permisos de Administrador' }).click();

    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByText('Este rol es del sistema: sus permisos se consultan pero no se editan.')
    ).toBeVisible();
    await expect(
      dialog.getByRole('checkbox', { name: 'Leer en Nomenclador de países' })
    ).toBeDisabled();
  });

  test('crea un rol desde la interfaz', async ({ page }) => {
    await signIn(page, ADMIN);
    await page.goto('/seguridad/roles');

    await page.getByRole('button', { name: 'Nuevo rol' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/nombre del rol/i).fill('Operador');
    await dialog.getByRole('button', { name: 'Crear rol' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('cell', { name: /^Operador/ })).toBeVisible();
  });

  test('restablece la contraseña y muestra la clave temporal', async ({ page }) => {
    await signIn(page, ADMIN);
    await page.goto('/seguridad/usuarios');

    await expect(page.getByRole('cell', { name: 'mgonzalez', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Restablecer contraseña de mgonzalez' }).click();

    await expect(page.getByText(/Tmp-4-2026/)).toBeVisible();
  });

  test('alterna la matriz a vista de árbol y guarda la categoría completa', async ({ page }) => {
    await signIn(page, ADMIN);
    await page.goto('/seguridad/roles');

    await page.getByRole('button', { name: 'Ver permisos de Consulta' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Vista de árbol').check();

    await expect(
      dialog.getByRole('checkbox', { name: 'Leer en Nomenclador de países (Nomencladores)' })
    ).toBeChecked();

    await dialog.getByRole('checkbox', { name: 'Todos los permisos de Seguridad' }).check();
    await dialog.getByRole('button', { name: 'Guardar permisos' }).click();

    await expect(dialog).toBeHidden();

    // Al reabrir, la preferencia de vista se conserva.
    await page.getByRole('button', { name: 'Ver permisos de Consulta' }).click();
    await expect(page.getByRole('dialog').getByLabel('Vista de árbol')).toBeChecked();
  });

  test('el interruptor de animaciones manda sobre la preferencia del sistema', async ({ page }) => {
    await signIn(page, ADMIN);

    const motion = () => page.evaluate(() => document.documentElement.dataset.motion);
    const asideDuration = () =>
      page
        .locator('aside')
        .first()
        .evaluate((el) => Number.parseFloat(getComputedStyle(el).transitionDuration));

    // Por defecto respeta el sistema.
    expect(await motion()).toBe('system');

    await page.getByRole('button', { name: /Animaciones según el sistema/ }).click();
    expect(await motion()).toBe('always');

    await page.getByRole('button', { name: /Animaciones siempre activas/ }).click();
    expect(await motion()).toBe('never');

    // «Nunca» apaga de verdad la transición, no solo el atributo.
    await expect.poll(asideDuration).toBeLessThan(0.001);

    // Y vuelve a Sistema.
    await page.getByRole('button', { name: /Animaciones desactivadas/ }).click();
    expect(await motion()).toBe('system');
    await expect.poll(asideDuration).toBeGreaterThan(0.1);
  });
});
