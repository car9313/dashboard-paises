import { describe, expect, it } from 'vitest';

import { resetDeviceKey } from './device-key';
import { encryptText } from './secure-storage';
import { tokenStorage } from './token-storage';

const STORAGE_KEY = 'dashboard.auth.refresh';

const tokens = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  expiresIn: 60,
  refreshTokenExpiresIn: 4320
};

describe('tokenStorage', () => {
  it('guarda el access token en memoria y el refresh cifrado', async () => {
    await tokenStorage.persist(tokens);

    expect(tokenStorage.getAccessToken()).toBe('access-1');
    expect(tokenStorage.hasRefreshToken()).toBe(true);

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(raw).not.toContain('refresh-1');
  });

  it('devuelve el refresh token descifrado con su vencimiento', async () => {
    await tokenStorage.persist(tokens);

    const stored = await tokenStorage.getRefresh();

    expect(stored?.token).toBe('refresh-1');
    expect(stored?.expiresAt).toBeGreaterThan(Date.now());
  });

  it('descarta un refresh vencido', async () => {
    await tokenStorage.persist({ ...tokens, refreshTokenExpiresIn: 0 });

    await expect(tokenStorage.getRefresh()).resolves.toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('descarta un payload corrupto y limpia la sesión', async () => {
    localStorage.setItem(STORAGE_KEY, 'no-es-un-payload-cifrado');

    await expect(tokenStorage.getRefresh()).resolves.toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('descarta un payload cifrado con otra clave de dispositivo', async () => {
    localStorage.setItem(STORAGE_KEY, await encryptText('{"token":"x","expiresAt":null}'));

    // Otra clave = otro dispositivo: el descifrado debe fallar y limpiar.
    resetDeviceKey();

    await expect(tokenStorage.getRefresh()).resolves.toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('clear borra el access token y el refresh persistido', async () => {
    await tokenStorage.persist(tokens);

    tokenStorage.clear();

    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(tokenStorage.hasRefreshToken()).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
