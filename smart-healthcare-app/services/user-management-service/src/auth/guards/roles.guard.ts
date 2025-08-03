// services/user-management-service/src/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core'; // Used to read metadata (roles) from route handlers
import { UserRole } from '../../common/dtos/user-role.enum'; // Import shared enum
import { ROLES_KEY } from '../decorators/roles.decorator'; // Import the key for roles metadata

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {} // Reflector helps access metadata

  /**
   * Determines if a user has the required roles to access a route.
   * @param context - The execution context (provides access to request, handler, class).
   * @returns True if authorized, false otherwise.
   * @throws ForbiddenException if the user does not have the required roles.
   */
  canActivate(context: ExecutionContext): boolean {
    // Get the required roles from the metadata set by the @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(), // Check roles on the method handler
      context.getClass(), // Check roles on the controller class
    ]);

    // If no roles are specified for the route, allow access
    if (!requiredRoles) {
      return true;
    }

    // Get the authenticated user from the request (attached by JwtAuthGuard)
    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.role) {
      this.logger.warn(`RolesGuard: No user or role found on request for protected route.`);
      throw new ForbiddenException('Access denied. User role not found.');
    }

    // Check if the authenticated user's role is included in the required roles
    const hasRequiredRole = requiredRoles.some((role) => user.role === role);

    if (!hasRequiredRole) {
      this.logger.warn(`RolesGuard: User ${user.id} (Role: ${user.role}) attempted to access resource requiring roles: ${requiredRoles.join(', ')}`);
      throw new ForbiddenException('Access denied. You do not have the necessary permissions.');
    }

    return true; // User has the required role
  }
}