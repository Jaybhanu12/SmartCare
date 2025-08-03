// services/user-management-service/src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { User } from '../../users/entities/user.entity';

// Define the shape of the JWT payload
export interface JwtPayload {
  email: string;
  sub: string; // User ID (standard JWT claim for subject)
  role: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    // Retrieve the secret and ensure it's defined
    const secretOrKey = configService.get<string>('jwt.accessTokenSecret');

    if (!secretOrKey) {
      throw new Error('JWT Access Token Secret is not configured. Please set the "jwt.accessTokenSecret" environment variable.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey, // Now guaranteed to be a string
    });
  }

  /**
   * Validates the decoded JWT payload.
   * This method is called by Passport after the JWT is successfully decoded and its signature verified.
   * It should return the user object that will be attached to `req.user`.
   * @param payload - The decoded JWT payload.
   * @returns The authenticated User object.
   * @throws UnauthorizedException if the user is not found or not fully verified.
   */
  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      this.logger.warn(`JWT validation failed: User with ID ${payload.sub} not found.`);
      throw new UnauthorizedException('User not found.');
    }
    // Additional checks for account status
    if (!user.isEmailVerified || !user.isPhoneVerified) {
      this.logger.warn(`JWT validation failed: User ${user.id} account not fully verified (email/phone).`);
      throw new UnauthorizedException('Account not fully verified. Please complete email and phone verification.');
    }
    // Note: Use the enum for comparison for better type safety
    if (user.role === 'doctor' && !user.isVerified) { 
      this.logger.warn(`JWT validation failed: Doctor ${user.id} account pending professional verification.`);
      throw new UnauthorizedException('Doctor account pending professional verification. Access denied.');
    }

    // Exclude sensitive data (like password hash) before attaching to request
    const { passwordHash, ...result } = user;
    return result as User;
  }
}