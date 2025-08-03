// services/user-management-service/src/auth/auth.service.ts
import { Injectable, UnauthorizedException, BadRequestException, Logger, ConflictException, NotFoundException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../common/dtos/user-role.enum';
import { RefreshToken } from './entities/refresh-token.entity';
import { LoginDto } from './dtos/login.dto';
import { TokenResponseDto } from './dtos/token-response.dto';
import { UsersService } from '../users/users.service';
import { ClientProxy, Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { RegisterDoctorDto, RegisterPatientDto } from './dtos/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { OtpService } from '../otp/otp.service'; // Import the new OtpService

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @Inject('DOCTOR_VERIFICATION_SERVICE') private doctorVerificationClient: ClientProxy,
    @Inject('PATIENT_MANAGEMENT_SERVICE') private patientManagementClient: ClientProxy,
    @Inject('NOTIFICATION_SERVICE') private notificationClient: ClientProxy, // Inject Notification Service client
    private otpService: OtpService, // Inject OtpService
  ) {}

  async validateUser(email: string, pass: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      this.logger.warn(`Login attempt for non-existent user: ${email}`);
      return null;
    }
    if (!(await bcrypt.compare(pass, user.passwordHash))) {
      this.logger.warn(`Login attempt with incorrect password for user: ${email}`);
      return null;
    }
    const { passwordHash, ...result } = user;
    return result as User;
  }

  async login(loginDto: LoginDto): Promise<TokenResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }
    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email address first.');
    }
    if (!user.isPhoneVerified) {
      throw new UnauthorizedException('Please verify your phone number first.');
    }
    if (user.role === UserRole.DOCTOR && !user.isVerified) {
      throw new UnauthorizedException('Doctor account is pending professional verification. Please wait for approval.');
    }
    return this.generateAuthTokens(user);
  }

  async generateAuthTokens(user: User): Promise<TokenResponseDto> {
    const payload = { email: user.email, sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.accessTokenSecret'),
      expiresIn: this.configService.get<string>('jwt.accessTokenExpirationTime'),
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshTokenSecret'),
      expiresIn: this.configService.get<string>('jwt.refreshTokenExpirationTime'),
    });
    await this.saveRefreshToken(user.id, refreshToken);
    this.logger.log(`Tokens generated for user: ${user.id}`);
    return { accessToken, refreshToken, isVerified: user.isVerified };
  }

  async saveRefreshToken(userId: string, token: string): Promise<RefreshToken> {
    const hashedToken = await bcrypt.hash(token, 10);
    const refreshTokenExpirationTime = this.configService.get<string>('jwt.refreshTokenExpirationTime');
    if (!refreshTokenExpirationTime) {
      this.logger.error('JWT Refresh Token Expiration Time is not configured.');
      throw new Error('JWT Refresh Token Expiration Time is not configured.');
    }
    const expiresAt = new Date(Date.now() + this.parseDuration(refreshTokenExpirationTime));
    let refreshTokenEntity = await this.refreshTokenRepository.findOne({ where: { userId } });

    if (refreshTokenEntity) {
      refreshTokenEntity.token = hashedToken;
      refreshTokenEntity.expiresAt = expiresAt;
      refreshTokenEntity.isRevoked = false;
    } else {
      refreshTokenEntity = this.refreshTokenRepository.create({ token: hashedToken, expiresAt, userId });
    }
    return this.refreshTokenRepository.save(refreshTokenEntity);
  }

  async rotateRefreshToken(oldRefreshToken: string): Promise<TokenResponseDto> {
    let decoded: JwtPayload;
    try {
      decoded = this.jwtService.verify(oldRefreshToken, { secret: this.configService.get<string>('jwt.refreshTokenSecret') }) as JwtPayload;
    } catch (error) {
      this.logger.warn(`Invalid or expired refresh token provided: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired refresh token. Please log in again.');
    }

    if (!decoded || !decoded.sub) {
      throw new UnauthorizedException('Invalid refresh token payload.');
    }

    const userId = decoded.sub;
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    const storedRefreshToken = await this.refreshTokenRepository.findOne({ where: { userId } });

    if (!storedRefreshToken || storedRefreshToken.isRevoked || storedRefreshToken.expiresAt < new Date()) {
      if (storedRefreshToken) {
        await this.revokeRefreshToken(userId);
      }
      this.logger.warn(`Attempted to use revoked, expired, or non-existent refresh token for user: ${userId}`);
      throw new UnauthorizedException('Refresh token invalid or expired. Please log in again.');
    }

    const isMatch = await bcrypt.compare(oldRefreshToken, storedRefreshToken.token);
    if (!isMatch) {
      await this.revokeRefreshToken(userId);
      this.logger.error(`Refresh token reuse detected for user: ${userId}. All tokens revoked.`);
      throw new UnauthorizedException('Refresh token reuse detected. Please log in again.');
    }

    await this.refreshTokenRepository.update(storedRefreshToken.id, { isRevoked: true });
    this.logger.log(`Old refresh token revoked for user: ${userId}`);

    return this.generateAuthTokens(user);
  }

  async revokeRefreshToken(userId: string): Promise<void> {
    const result = await this.refreshTokenRepository.update({ userId }, { isRevoked: true });
    if (result.affected === 0) {
      this.logger.warn(`No refresh tokens found to revoke for user: ${userId}`);
    } else {
      this.logger.log(`All refresh tokens revoked for user: ${userId}`);
    }
  }

  async registerPatient(registerPatientDto: RegisterPatientDto): Promise<User> {
    const newUser = await this.usersService.createUser(registerPatientDto);
    this.logger.log(`Patient registered: ${newUser.email}, ID: ${newUser.id}`);

    this.patientManagementClient.emit('patient.registered', {
      userId: newUser.id,
      fullName: registerPatientDto.fullName,
      contactNumber: registerPatientDto.contactNumber,
      dateOfBirth: registerPatientDto.dateOfBirth.toISOString(),
      gender: registerPatientDto.gender,
    }).subscribe({
      next: () => this.logger.log(`'patient.registered' event sent for user ${newUser.id}`),
      error: (err) => this.logger.error(`Failed to send 'patient.registered' event for user ${newUser.id}: ${err.message}`, err.stack),
    });

    return newUser;
  }

  async registerDoctor(registerDoctorDto: RegisterDoctorDto): Promise<User> {
    const newUser = await this.usersService.createUser(registerDoctorDto);
    this.logger.log(`Doctor registration initiated: ${newUser.email}, ID: ${newUser.id}`);

    this.doctorVerificationClient.emit('doctor.registration.initiated', {
      userId: newUser.id,
      fullName: registerDoctorDto.fullName,
      contactNumber: registerDoctorDto.contactNumber,
      medicalCouncilRegNo: registerDoctorDto.medicalCouncilRegNo,
      specialization: registerDoctorDto.specialization,
    }).subscribe({
      next: () => this.logger.log(`'doctor.registration.initiated' event sent for user ${newUser.id}`),
      error: (err) => this.logger.error(`Failed to send 'doctor.registration.initiated' event for user ${newUser.id}: ${err.message}`, err.stack),
    });

    return newUser;
  }

  /**
   * Generates and sends an email OTP.
   * @param userId - ID of the user.
   * @param email - User's email address.
   */
  async sendEmailOtp(userId: string, email: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified.');
    }

    const otp = this.otpService.generateOtp(); // Generate OTP
    await this.otpService.storeOtp(userId, 'email', otp); // Store OTP in Redis

    // Publish event to Notification Service to send email
    this.notificationClient.emit('send.email.otp', {
      to: email,
      otp: otp,
      userId: userId,
    }).subscribe({
      next: () => this.logger.log(`'send.email.otp' event sent for user ${userId}`),
      error: (err) => this.logger.error(`Failed to send 'send.email.otp' event for user ${userId}: ${err.message}`, err.stack),
    });
  }

  /**
   * Verifies an email OTP.
   * @param userId - ID of the user.
   * @param otp - OTP received from user.
   * @returns True if verification is successful.
   * @throws BadRequestException if OTP is invalid or expired.
   * @throws NotFoundException if user is not found.
   */
  async verifyEmail(userId: string, otp: string): Promise<boolean> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified.');
    }

    const isValid = await this.otpService.verifyOtp(userId, 'email', otp);
    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP.');
    }

    await this.usersService.updateEmailVerificationStatus(userId, true);
    this.logger.log(`Email verified for user: ${userId}`);
    return true;
  }

  /**
   * Generates and sends a phone OTP.
   * @param userId - ID of the user.
   * @param phoneNumber - User's phone number.
   */
  async sendPhoneOtp(userId: string, phoneNumber: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    if (user.isPhoneVerified) {
      throw new BadRequestException('Phone already verified.');
    }

    const otp = this.otpService.generateOtp(); // Generate OTP
    await this.otpService.storeOtp(userId, 'phone', otp); // Store OTP in Redis

    // Publish event to Notification Service to send SMS
    this.notificationClient.emit('send.sms.otp', {
      to: phoneNumber,
      otp: otp,
      userId: userId,
    }).subscribe({
      next: () => this.logger.log(`'send.sms.otp' event sent for user ${userId}`),
      error: (err) => this.logger.error(`Failed to send 'send.sms.otp' event for user ${userId}: ${err.message}`, err.stack),
    });
  }

  /**
   * Verifies a phone OTP.
   * @param userId - ID of the user.
   * @param otp - OTP received from user.
   * @returns True if verification is successful.
   * @throws BadRequestException if OTP is invalid or expired.
   * @throws NotFoundException if user is not found.
   */
  async verifyPhone(userId: string, otp: string): Promise<boolean> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    if (user.isPhoneVerified) {
      throw new BadRequestException('Phone already verified.');
    }

    const isValid = await this.otpService.verifyOtp(userId, 'phone', otp);
    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP.');
    }

    await this.usersService.updatePhoneVerificationStatus(userId, true);
    this.logger.log(`Phone verified for user: ${userId}`);
    return true;
  }

  /**
   * Microservice message pattern to handle doctor verification status updates.
   * Consumed from RabbitMQ `auth_queue`.
   * @param data - Payload from Doctor Verification Service.
   */
  @MessagePattern('doctor.verification.status.updated')
  async handleDoctorVerificationStatusUpdate(@Payload() data: { userId: string; isVerified: boolean }, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();
    try {
      this.logger.log(`Received doctor verification status update for user: ${data.userId}, isVerified: ${data.isVerified}`);
      await this.usersService.updateOverallVerificationStatus(data.userId, data.isVerified);
      channel.ack(originalMessage);
    } catch (error) {
      this.logger.error(`Error processing doctor.verification.status.updated for ${data.userId}: ${error.message}`, error.stack);
      channel.nack(originalMessage, false, false);
    }
  }

  private parseDuration(durationStr: string): number {
    const unit = durationStr.slice(-1);
    const value = parseInt(durationStr.slice(0, -1), 10);

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: throw new Error('Invalid duration unit provided in JWT expiration time.');
    }
  }
}