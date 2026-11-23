import { describe, expect, it } from 'vitest';

import { ApiError, isRetryable, parseProblemDetails, toApiError, toUserMessage } from './problems';

describe('parseProblemDetails', () => {
  it('lee el formato ProblemDetails estándar', () => {
    const parsed = parseProblemDetails({
      title: 'Conflicto',
      status: 409,
      detail: 'Ya existe un país con ese código.',
      traceId: '00-abc',
      errors: { code: ['El código ya existe.'] }
    });

    expect(parsed.title).toBe('Conflicto');
    expect(parsed.detail).toBe('Ya existe un país con ese código.');
    expect(parsed.traceId).toBe('00-abc');
    expect(parsed.errors).toEqual({ code: ['El código ya existe.'] });
  });

  it('acepta el formato { success, message, detail } del error no controlado', () => {
    const parsed = parseProblemDetails({
      success: false,
      message: 'Ha ocurrido un error inesperado.',
      detail: 'Static property requires null instance.'
    });

    expect(parsed.message).toBe('Ha ocurrido un error inesperado.');
    expect(parsed.detail).toBe('Static property requires null instance.');
  });

  it('descarta un cuerpo que no es un objeto', () => {
    expect(parseProblemDetails('error de texto')).toEqual({});
    expect(parseProblemDetails(null)).toEqual({});
  });

  it('ignora entradas de errors que no son listas de texto', () => {
    const parsed = parseProblemDetails({ errors: { code: 'no-es-lista', name: [1, 'ok'] } });

    expect(parsed.errors).toEqual({ name: ['ok'] });
  });
});

describe('toApiError', () => {
  it('clasifica 400 como validación y usa el title del backend', () => {
    const error = toApiError(400, { title: 'Datos inválidos', status: 400 });

    expect(error.kind).toBe('validation');
    expect(error.message).toBe('Datos inválidos');
  });

  it('traduce 403 a un mensaje de permisos', () => {
    const error = toApiError(403, {});

    expect(error.kind).toBe('forbidden');
    expect(error.message).toContain('permisos');
  });

  it('clasifica 5xx como servidor no disponible y lo marca reintentable', () => {
    const error = toApiError(503, {});

    expect(error.kind).toBe('unavailable');
    expect(isRetryable(error)).toBe(true);
  });

  it('clasifica 418 como sesión expirada', () => {
    expect(toApiError(418, {}).kind).toBe('sessionExpired');
  });

  it('propaga el traceId para soporte', () => {
    const error = toApiError(500, { traceId: '00-xyz' });

    expect(error.traceId).toBe('00-xyz');
  });
});

describe('toUserMessage', () => {
  it('usa el mensaje de un ApiError', () => {
    expect(toUserMessage(toApiError(404, {}))).toBe('No encontramos lo que buscabas.');
  });

  it('cae a un texto genérico con un valor desconocido', () => {
    expect(toUserMessage(undefined)).toBe('Ocurrió un error inesperado.');
  });

  it('conserva el mensaje de un Error normal', () => {
    expect(toUserMessage(new Error('falló la red'))).toBe('falló la red');
  });
});

describe('ApiError', () => {
  it('expone fieldErrors vacío cuando el backend no los envía', () => {
    const error = new ApiError({
      status: 409,
      message: 'Conflicto',
      detail: undefined,
      traceId: undefined,
      fieldErrors: {}
    });

    expect(error.fieldErrors).toEqual({});
    expect(error.detail).toBeUndefined();
  });
});
