const FINGERPRINT_KEY = 'dashboard.device-id';

/**
 * Huella del dispositivo que exige el backend para la sesión única.
 *
 * Debe ser **estable entre recargas y pestañas**: si cambia, el backend no
 * reconoce el dispositivo y la sesión anterior queda huérfana. Se genera una vez
 * y se guarda; si el storage no está disponible, se genera una por pestaña
 * (la sesión funciona, pero no sobrevive).
 */
export function getDeviceFingerprint(): string {
  try {
    const existing = localStorage.getItem(FINGERPRINT_KEY);
    if (existing !== null && existing.length > 0) {
      return existing;
    }

    const created = crypto.randomUUID();
    localStorage.setItem(FINGERPRINT_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}
