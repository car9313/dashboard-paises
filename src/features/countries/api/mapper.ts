import type { Country, CountryInput } from '../domain/country';

import type { CountryDto, CountryWriteDto } from './dto';

/**
 * Frontera entre el wire y el dominio.
 *
 * Un cambio de contrato (renombrar `name`, añadir un campo, cambiar el casing)
 * se absorbe aquí y no llega a componentes ni stores.
 */

/** Normaliza la respuesta del backend. `isUnitedState` ya viene descartado por el DTO. */
export function toDomain(dto: CountryDto): Country {
  return { code: dto.code, name: dto.name, active: dto.active };
}

/**
 * Construye el payload de alta.
 *
 * El código se normaliza a mayúsculas porque ISO-3166-1 alpha-2 las usa y el
 * backend no lo hace por nosotros: sin esto convivirían «cu» y «CU» como dos
 * países distintos. `active` no se envía nunca.
 */
export function toWriteDto(input: CountryInput): CountryWriteDto {
  return {
    code: input.code.trim().toUpperCase(),
    name: input.name.trim()
  };
}
