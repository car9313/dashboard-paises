import { describe, expect, it } from 'vitest';

import { ApiError } from '@/core/http/problems';

import { usersRepository } from './repositories';
import { signInAs } from '@/test-utils/auth';

describe('usersRepository', () => {
  it('lista la primera página con los metadatos del servidor', async () => {
    await signInAs('admin');

    const page = await usersRepository.list({ page: 1 });

    expect(page.users).toHaveLength(10);
    expect(page.meta.totalCount).toBe(12);
    expect(page.meta.totalPages).toBe(2);
    expect(page.users[0]).toMatchObject({ username: 'admin', fullName: 'Ana Administradora' });
    expect(page.users[0]?.roles).toEqual([{ id: 1, name: 'Administrador' }]);
  });

  it('devuelve la segunda página con el resto', async () => {
    await signInAs('admin');

    const page = await usersRepository.list({ page: 2 });

    expect(page.users).toHaveLength(2);
    expect(page.meta.currentPage).toBe(2);
  });

  it('crea un usuario y lo devuelve mapeado a dominio', async () => {
    await signInAs('admin');

    const created = await usersRepository.create({
      username: 'nuevo.usuario',
      fullName: 'Nuevo Usuario',
      password: 'Nuevo123$',
      passwordConfirmation: 'Nuevo123$',
      roleIds: [2]
    });

    expect(created.id).toBeGreaterThan(12);
    expect(created.username).toBe('nuevo.usuario');
    expect(created.isUnEditable).toBe(false);
    expect(created.roles).toEqual([{ id: 2, name: 'Consulta' }]);
  });

  it('rechaza un usuario duplicado con 409', async () => {
    await signInAs('admin');

    await expect(
      usersRepository.create({
        username: 'admin',
        fullName: 'Otra Ana',
        password: 'Nuevo123$',
        passwordConfirmation: 'Nuevo123$',
        roleIds: [1]
      })
    ).rejects.toSatisfy((error: unknown) => error instanceof ApiError && error.status === 409);
  });

  it('actualiza el nombre y los roles sin enviar username', async () => {
    await signInAs('admin');

    const updated = await usersRepository.update({
      id: 4,
      fullName: 'Marta G. Actualizada',
      password: '',
      passwordConfirmation: '',
      roleIds: [3]
    });

    expect(updated.fullName).toBe('Marta G. Actualizada');
    expect(updated.roles).toEqual([{ id: 3, name: 'Auditoría' }]);
  });

  it('no permite editar un usuario protegido (409)', async () => {
    await signInAs('admin');

    await expect(
      usersRepository.update({
        id: 1,
        fullName: 'Ana',
        password: '',
        passwordConfirmation: '',
        roleIds: [1]
      })
    ).rejects.toSatisfy((error: unknown) => error instanceof ApiError && error.status === 409);
  });

  it('no permite eliminar un usuario protegido (409) y sí uno normal', async () => {
    await signInAs('admin');

    await expect(usersRepository.remove(1)).rejects.toSatisfy(
      (error: unknown) => error instanceof ApiError && error.status === 409
    );

    await expect(usersRepository.remove(4)).resolves.toBeUndefined();
  });

  it('restablece la contraseña y devuelve la clave temporal', async () => {
    await signInAs('admin');

    const temporary = await usersRepository.resetPassword(5);

    expect(temporary).toBe('Tmp-5-2026');
  });
});
