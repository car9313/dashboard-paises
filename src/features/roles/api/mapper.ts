import type { Permission, PermissionCategory, Role } from '../domain/role';
import type { PermissionCatalogDto, RoleDto } from './dto';

export function toDomainPermission(dto: {
  readonly resource: string;
  readonly description: string;
  readonly actions: readonly string[];
}): Permission {
  return {
    resource: dto.resource,
    description: dto.description,
    actions: [...dto.actions]
  };
}

export function toDomainRole(dto: RoleDto): Role {
  return {
    id: dto.id,
    name: dto.name,
    isUnEditable: dto.isUnEditable,
    isUnDeletable: dto.isUnDeletable,
    permissions: dto.permissions.map(toDomainPermission)
  };
}

export function toDomainCatalog(dto: PermissionCatalogDto): readonly PermissionCategory[] {
  return dto.map((category) => ({
    category: category.category,
    permissions: category.permissions.map(toDomainPermission)
  }));
}
