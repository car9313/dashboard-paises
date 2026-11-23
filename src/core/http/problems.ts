import type { ProblemDetails } from './types';

/** Clasificación estable de un fallo HTTP, independiente del texto del backend. */
export type ApiErrorKind =
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'conflict'
  | 'sessionExpired'
  | 'unavailable'
  | 'unknown';

const KIND_BY_STATUS: Record<number, ApiErrorKind> = {
  0: 'unavailable',
  400: 'validation',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'notFound',
  409: 'conflict',
  418: 'sessionExpired'
};

export interface ApiErrorInit {
  readonly status: number;
  readonly message: string;
  readonly detail: string | undefined;
  readonly traceId: string | undefined;
  readonly fieldErrors: Record<string, string[]>;
}

/**
 * Error tipado de la capa HTTP.
 *
 * Existe para que la UI nunca dependa del texto del backend: decide por `kind`
 * y muestra `message` (ya traducido) o `fieldErrors` (para formularios).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly kind: ApiErrorKind;
  readonly detail: string | undefined;
  readonly traceId: string | undefined;
  readonly fieldErrors: Record<string, string[]>;

  constructor(init: ApiErrorInit) {
    super(init.message);
    this.name = 'ApiError';
    this.status = init.status;
    this.kind = KIND_BY_STATUS[init.status] ?? (init.status >= 500 ? 'unavailable' : 'unknown');
    this.detail = init.detail;
    this.traceId = init.traceId;
    this.fieldErrors = init.fieldErrors;
  }
}

/**
 * Proyecta el cuerpo del error a `ProblemDetails` sin confiar en su forma.
 *
 * @remarks
 * El backend mezcla formatos: `ProblemDetails` estándar en los endpoints con
 * `[AuthorizeResource]` y `{ success, message, detail }` en los errores no
 * controlados. Se aceptan ambos y se descarta lo que no encaje.
 */
export function parseProblemDetails(body: unknown): ProblemDetails {
  if (typeof body !== 'object' || body === null) {
    return {};
  }

  const record = body as Record<string, unknown>;
  const details: ProblemDetails = {};

  const readString = (key: string): string | undefined =>
    typeof record[key] === 'string' ? (record[key] as string) : undefined;

  const type = readString('type');
  const title = readString('title');
  const detail = readString('detail');
  const traceId = readString('traceId');
  const message = readString('message');

  if (type !== undefined) details.type = type;
  if (title !== undefined) details.title = title;
  if (detail !== undefined) details.detail = detail;
  if (traceId !== undefined) details.traceId = traceId;
  if (message !== undefined) details.message = message;

  if (typeof record['status'] === 'number') {
    details.status = record['status'];
  }

  if (typeof record['errors'] === 'object' && record['errors'] !== null) {
    details.errors = readFieldErrors(record['errors']);
  }

  return details;
}

function readFieldErrors(value: object): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const [field, messages] of Object.entries(value)) {
    if (Array.isArray(messages)) {
      const valid = messages.filter((item): item is string => typeof item === 'string');
      if (valid.length > 0) {
        result[field] = valid;
      }
    }
  }

  return result;
}

/**
 * Construye el `ApiError` a partir del estado y del cuerpo del error.
 *
 * El mensaje se elige aquí, en un solo lugar, para que toda la UI muestre el
 * mismo texto ante el mismo fallo.
 */
export function toApiError(status: number, body: unknown): ApiError {
  const problem = parseProblemDetails(body);
  const kind = KIND_BY_STATUS[status] ?? (status >= 500 ? 'unavailable' : 'unknown');

  return new ApiError({
    status,
    message: userMessageFor(kind, problem),
    detail: problem.detail ?? problem.message,
    traceId: problem.traceId,
    fieldErrors: problem.errors ?? {}
  });
}

function userMessageFor(kind: ApiErrorKind, problem: ProblemDetails): string {
  switch (kind) {
    case 'validation':
      return problem.title ?? 'Revisa los datos e inténtalo de nuevo.';
    case 'unauthorized':
      return 'Tu sesión no es válida. Vuelve a iniciar sesión.';
    case 'forbidden':
      return 'No tienes permisos para realizar esta acción.';
    case 'notFound':
      return 'No encontramos lo que buscabas.';
    case 'conflict':
      return 'Ya existe un registro con esos datos.';
    case 'sessionExpired':
      return 'Tu sesión se cerró por seguridad. Vuelve a iniciar sesión.';
    case 'unavailable':
      return 'El servidor no está disponible. Inténtalo en unos minutos.';
    default:
      return problem.detail ?? problem.message ?? 'Ocurrió un error inesperado.';
  }
}

/** `true` si el error es de red o de servidor no disponible (reintentable). */
export function isRetryable(error: unknown): boolean {
  return error instanceof ApiError && (error.kind === 'unavailable' || error.status === 0);
}

/** Traduce cualquier `unknown` a un texto mostrable al usuario. */
export function toUserMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return 'Ocurrió un error inesperado.';
}
