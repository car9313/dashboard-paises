import type { CreateUserInput, UpdateUserInput, User } from '../domain/user';
import type { UserDto } from './dto';

/** Traduce del wire al dominio. */
export function toDomain(dto: UserDto): User {
  return {
    id: dto.id,
    username: dto.username,
    fullName: dto.fullName,
    isUnEditable: dto.isUnEditable,
    isUnDeletable: dto.isUnDeletable,
    roles: dto.roles.map((role) => ({ id: role.id, name: role.name }))
  };
}

/** Payload del alta, con el casing exacto del backend. */
export interface CreateUserDto {
  readonly userName: string;
  readonly fullName: string;
  readonly password: string;
  readonly passwordConfirmation: string;
  readonly roleIds: readonly number[];
}

/**
 * Payload de la edición.
 *
 * @remarks
 * No incluye `username` (no se edita) ni `userType` (el origen tampoco lo envía;
 * el binder de .NET lo resuelve a `0`, ver ADR-019 y Q8). La contraseña solo
 * viaja si el usuario escribió una.
 */
export interface UpdateUserDto {
  readonly fullName: string;
  readonly roleIds: readonly number[];
  readonly password?: string;
  readonly passwordConfirmation?: string;
}

export function toCreateDto(input: CreateUserInput): CreateUserDto {
  return {
    userName: input.username.trim(),
    fullName: input.fullName.trim(),
    password: input.password,
    passwordConfirmation: input.passwordConfirmation,
    roleIds: [...input.roleIds]
  };
}

export function toUpdateDto(input: UpdateUserInput): UpdateUserDto {
  const base = {
    fullName: input.fullName.trim(),
    roleIds: [...input.roleIds]
  };

  if (input.password.length === 0) {
    return base;
  }

  return {
    ...base,
    password: input.password,
    passwordConfirmation: input.passwordConfirmation
  };
}
