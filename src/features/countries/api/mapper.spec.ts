import { describe, expect, it } from 'vitest';

import { toDomain, toWriteDto } from './mapper';

describe('toDomain', () => {
  it('proyecta solo los campos del dominio', () => {
    const domain = toDomain({
      code: 'CU',
      name: 'Cuba',
      active: true,
      // Campo del wire que el dominio no expone.
      ...{ isUnitedState: false }
    });

    expect(domain).toEqual({ code: 'CU', name: 'Cuba', active: true });
    expect(Object.keys(domain).sort()).toEqual(['active', 'code', 'name']);
  });
});

describe('toWriteDto', () => {
  it('normaliza el código a mayúsculas y recorta los espacios', () => {
    expect(toWriteDto({ code: ' cu ', name: '  Cuba  ' })).toEqual({ code: 'CU', name: 'Cuba' });
  });

  it('nunca envía el estado activo', () => {
    const dto = toWriteDto({ code: 'CU', name: 'Cuba' });

    expect(Object.keys(dto).sort()).toEqual(['code', 'name']);
    expect(dto).not.toHaveProperty('active');
  });
});
