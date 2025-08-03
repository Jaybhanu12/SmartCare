// services/user-management-service/src/auth/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../common/dtos/user-role.enum'; // Import shared enum

// Key used to store and retrieve roles metadata
export const ROLES_KEY = 'roles';

/**
 * Custom decorator to specify required roles for a route or controller.
 * Usage: @Roles(UserRole.ADMIN, UserRole.DOCTOR)
 * @param roles - An array of UserRole enums that are allowed to access the decorated resource.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);