import { decryptText, encryptText } from './secure-storage';

/**
 * Ciclo de vida de los tokens (ADR-012).
 *
 * - **Access token:** solo en memoria. Nunca toca el storage, así que una
 *   recarga obliga a renovarlo.
 * - **Refresh token:** `localStorage`, cifrado con AES-GCM y la clave no
 *   exportable del dispositivo (`device-key.ts`). Incluye su vencimiento para
 *   evitar una llamada condenada a fallar.
 *
 * Único dueño de ambos: ningún otro módulo lee ni escribe estas claves.
 */

const REFRESH_STORAGE_KEY = 'dashboard.auth.refresh';

/** Minutos → milisegundos. El backend expresa `expiresIn` en MINUTOS. */
const MINUTE_MS = 60_000;

export interface PersistTokensParams {
  readonly accessToken: string;
  readonly refreshToken: string;
  /** Vida del access token en minutos. */
  readonly expiresIn: number;
  /** Vida del refresh token en minutos. */
  readonly refreshTokenExpiresIn: number;
}

export interface StoredRefresh {
  readonly token: string;
  /** Epoch ms, o `null` si no se pudo determinar. */
  readonly expiresAt: number | null;
}

let accessToken: string | null = null;
let accessExpiresAt: number | null = null;

function readCiphertext(): string | null {
  try {
    return localStorage.getItem(REFRESH_STORAGE_KEY);
  } catch {
    return null;
  }
}

function clearTokens(): void {
  accessToken = null;
  accessExpiresAt = null;

  try {
    localStorage.removeItem(REFRESH_STORAGE_KEY);
  } catch {
    // storage no disponible: no hay nada que borrar
  }
}

/** Extrae un refresh válido del payload descifrado, o `null` si no lo es. */
function parseStoredRefresh(plain: string): StoredRefresh | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(plain);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }

  const record = parsed as Record<string, unknown>;
  const token = record['token'];
  const expiresAt = record['expiresAt'];

  if (typeof token !== 'string' || token.length === 0) {
    return null;
  }

  return { token, expiresAt: typeof expiresAt === 'number' ? expiresAt : null };
}

export const tokenStorage = {
  /** Access token vigente, o `null`. Síncrono: lo necesita el cliente HTTP. */
  getAccessToken(): string | null {
    return accessToken;
  },

  /** Epoch ms en que vence el access token, o `null`. */
  getAccessExpiration(): number | null {
    return accessExpiresAt;
  },

  /** `true` si hay access token en memoria. */
  hasAccessToken(): boolean {
    return accessToken !== null;
  },

  /** `true` si existe un refresh token guardado (sin descifrarlo). */
  hasRefreshToken(): boolean {
    return readCiphertext() !== null;
  },

  /** Guarda la sesión recién emitida por el backend. */
  async persist(params: PersistTokensParams): Promise<void> {
    accessToken = params.accessToken;
    accessExpiresAt = Date.now() + params.expiresIn * MINUTE_MS;

    const stored: StoredRefresh = {
      token: params.refreshToken,
      expiresAt: Date.now() + params.refreshTokenExpiresIn * MINUTE_MS
    };

    try {
      localStorage.setItem(REFRESH_STORAGE_KEY, await encryptText(JSON.stringify(stored)));
    } catch {
      // Sin localStorage la sesión vive solo en esta pestaña: el access token ya
      // está en memoria y el refresh simplemente no persiste.
    }
  },

  /** Actualiza solo el access token tras una renovación. */
  setAccessToken(token: string, expiresInMinutes: number): void {
    accessToken = token;
    accessExpiresAt = Date.now() + expiresInMinutes * MINUTE_MS;
  },

  /**
   * Refresh token descifrado, o `null` si no existe, está corrupto o venció.
   *
   * Un payload ilegible se descarta: es preferible pedir credenciales a operar
   * con un token que no podemos verificar.
   */
  async getRefresh(): Promise<StoredRefresh | null> {
    const ciphertext = readCiphertext();
    if (ciphertext === null) {
      return null;
    }

    let plain: string;
    try {
      plain = await decryptText(ciphertext);
    } catch {
      clearTokens();
      return null;
    }

    const stored = parseStoredRefresh(plain);
    if (stored === null) {
      clearTokens();
      return null;
    }

    if (stored.expiresAt !== null && Date.now() >= stored.expiresAt) {
      clearTokens();
      return null;
    }

    return stored;
  },

  /** Borra la sesión completa. Síncrono: se usa al expirar o cerrar sesión. */
  clear: clearTokens,

  /**
   * Solo para pruebas: olvida el access token en memoria conservando el refresh
   * persistido. Simula una recarga de página (F5) sin perder el storage.
   */
  clearAccessTokenInMemory(): void {
    accessToken = null;
    accessExpiresAt = null;
  }
};
