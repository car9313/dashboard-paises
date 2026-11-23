/**
 * Clave AES-GCM del dispositivo, **no exportable**, persistida en IndexedDB.
 *
 * @remarks
 * Modelo de amenaza, explícito porque importa:
 * - El texto cifrado (refresh token) vive en `localStorage`.
 * - La clave vive en **IndexedDB** como `CryptoKey` con `extractable: false`, así
 *   que el material de la clave no se puede leer desde JavaScript: solo usar.
 * - Esto **no** protege contra XSS activo (el script podría pedir el descifrado),
 *   pero sí contra la lectura trivial del storage y contra la exfiltración de la
 *   clave. Es estrictamente mejor que una contraseña incrustada en el bundle
 *   (el enfoque del proyecto origen), que cualquiera puede copiar del código.
 * - La seguridad real la da el backend: tokens de vida corta, HTTPS y sesión
 *   única por huella.
 *
 * Si IndexedDB no está disponible (modo privado de algunos navegadores, pruebas
 * con jsdom), se usa una clave **en memoria**: la sesión funciona durante la
 * pestaña, pero no sobrevive a una recarga. Nunca se cae a guardar en claro.
 */

const DB_NAME = 'dashboard-auth';
const DB_VERSION = 1;
const STORE_NAME = 'device-keys';
const KEY_ID = 'device';

let keyPromise: Promise<CryptoKey> | null = null;
let memoryKey: CryptoKey | null = null;

function isCryptoKey(value: unknown): value is CryptoKey {
  return (
    typeof value === 'object' &&
    value !== null &&
    'algorithm' in value &&
    'usages' in value &&
    'type' in value
  );
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB no disponible'));
    request.onblocked = () => reject(new Error('IndexedDB bloqueada por otra pestaña'));
  });
}

function readKey(database: IDBDatabase): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(KEY_ID);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('No se pudo leer la clave'));
  });
}

function writeKey(database: IDBDatabase, key: CryptoKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(key, KEY_ID);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('No se pudo guardar la clave'));
  });
}

async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function loadOrCreate(): Promise<CryptoKey> {
  if (typeof indexedDB === 'undefined' || globalThis.crypto?.subtle === undefined) {
    throw new Error('IndexedDB o Web Crypto no disponibles');
  }

  const database = await openDatabase();

  try {
    const existing = await readKey(database);
    if (isCryptoKey(existing)) {
      return existing;
    }

    const created = await generateKey();
    await writeKey(database, created);
    return created;
  } finally {
    database.close();
  }
}

/**
 * Devuelve la clave del dispositivo, creándola la primera vez.
 *
 * La promesa se cachea: la clave se genera una sola vez por carga de página.
 */
export function getDeviceKey(): Promise<CryptoKey> {
  keyPromise ??= loadOrCreate().catch(async () => {
    // Fallback: clave en memoria (sesión sin persistencia, nunca sin cifrado).
    memoryKey ??= await generateKey();
    return memoryKey;
  });

  return keyPromise;
}

/** Solo para pruebas: olvida la clave cacheada. */
export function resetDeviceKey(): void {
  keyPromise = null;
  memoryKey = null;
}
