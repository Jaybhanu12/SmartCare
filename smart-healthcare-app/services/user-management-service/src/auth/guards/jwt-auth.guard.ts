// services/user-management-service/src/auth/guards/jwt-auth.guard.ts
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  /**
   * Overrides the default handleRequest to provide custom error messages.
   * This method is called by Passport to handle the result of authentication.
   * @param err - Error thrown by the strategy.
   * @param user - User object returned by the strategy.
   * @param info - Additional info from the strategy.
   * @returns The authenticated user object.
   * @throws UnauthorizedException if authentication fails.
   */
  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      this.logger.warn(`Authentication failed: ${err ? err.message : info?.message || 'No user found'}`);
      throw err || new UnauthorizedException('Authentication failed. Please provide a valid access token.');
    }
    return user;
  }
}