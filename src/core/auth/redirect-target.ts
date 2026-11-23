/**
 * Validación del parámetro `redirect` de `/login`.
 *
 * Sin esto, `/login?redirect=//evil.example` convertiría el dashboard en un
 * trampolín de redirección tras un login exitoso. Solo se aceptan rutas internas
 * absolutas: deben empezar por `/` y **no** por `//` (protocol-relative) ni `/\`.
 */
export function resolveRedirectTarget(value: string | null): string {
  if (value === null) {
    return '/';
  }

  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return '/';
  }

  return value;
}

/** Construye la URL de login con el destino actual, para volver tras entrar. */
export function loginUrlFor(pathname: string, search = ''): string {
  const target = `${pathname}${search}`;
  return `/login?redirect=${encodeURIComponent(target)}`;
}
