import { getDeviceKey } from './device-key';

/**
 * Cifrado simétrico de valores en reposo (AES-GCM 256).
 *
 * Formato del payload: `base64url(iv ‖ ciphertext)`, con IV de 12 bytes nuevo en
 * cada escritura. No hay metadatos ni versión: si cambia el formato, el valor
 * antiguo falla al descifrar y se descarta (equivale a cerrar sesión).
 */

const IV_BYTES = 12;

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);

  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

/** Cifra un texto y devuelve el payload listo para el storage. */
export async function encryptText(plain: string): Promise<string> {
  const key = await getDeviceKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const encoded = new TextEncoder().encode(plain);

  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

  return toBase64Url(new Uint8Array([...iv, ...new Uint8Array(cipher)]));
}

/**
 * Descifra un payload del storage.
 *
 * Lanza si el payload está corrupto, fue cifrado con otra clave o no es nuestro:
 * el llamador decide si descartarlo (siempre) o mantenerlo (nunca).
 */
export async function decryptText(payload: string): Promise<string> {
  const key = await getDeviceKey();
  const raw = fromBase64Url(payload);
  const iv = raw.slice(0, IV_BYTES);
  const data = raw.slice(IV_BYTES);

  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);

  return new TextDecoder().decode(plain);
}
