// services/user-management-service/src/auth/controllers/auth.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Request, Get, Param, Logger } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { RegisterDoctorDto, RegisterPatientDto } from '../dtos/register.dto';
import { LoginDto } from '../dtos/login.dto';
import { TokenResponseDto } from '../dtos/token-response.dto';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../common/dtos/user-role.enum';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @Post('register/patient')
  @HttpCode(HttpStatus.CREATED)
  async registerPatient(@Body() registerPatientDto: RegisterPatientDto): Promise<User> {
    this.logger.log(`Patient registration request for: ${registerPatientDto.email}`);
    return this.authService.registerPatient(registerPatientDto);
  }

  @Post('register/doctor')
  @HttpCode(HttpStatus.CREATED)
  async registerDoctor(@Body() registerDoctorDto: RegisterDoctorDto): Promise<User> {
    this.logger.log(`Doctor registration request for: ${registerDoctorDto.email}`);
    return this.authService.registerDoctor(registerDoctorDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<TokenResponseDto> {
    this.logger.log(`Login request for: ${loginDto.email}`);
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(@Body() refreshTokenDto: RefreshTokenDto): Promise<TokenResponseDto> {
    this.logger.log(`Refresh token request received.`);
    return this.authService.rotateRefreshToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req): Promise<{ message: string }> {
    this.logger.log(`Logout request for user: ${req.user.id}`);
    await this.authService.revokeRefreshToken(req.user.id);
    return { message: 'Logged out successfully from all devices.' };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Request() req): any {
    this.logger.log(`Profile request for user: ${req.user.id}`);
    return req.user;
  }

  @Get('admin-dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getAdminDashboard(@Request() req): string {
    this.logger.log(`Admin dashboard accessed by: ${req.user.email}`);
    return `Welcome to the Admin Dashboard, ${req.user.email}!`;
  }

  @Get('doctor-panel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  getDoctorPanel(@Request() req): string {
    this.logger.log(`Doctor panel accessed by: ${req.user.email}`);
    return `Welcome to your Doctor Panel, Dr. ${req.user.fullName || req.user.email}!`;
  }

  @Get('patient-portal')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PATIENT)
  getPatientPortal(@Request() req): string {
    this.logger.log(`Patient portal accessed by: ${req.user.email}`);
    return `Welcome to your Patient Portal, ${req.user.fullName || req.user.email}!`;
  }

  /**
   * Endpoint to send email verification OTP.
   * @param userId - The ID of the user.
   * @param email - The email to send OTP to.
   */
  @Post('verify/email/send-otp')
  @HttpCode(HttpStatus.OK)
  async sendEmailVerificationOtp(@Body('userId') userId: string, @Body('email') email: string): Promise<{ message: string }> {
    this.logger.log(`Sending email verification OTP to user: ${userId}`);
    await this.authService.sendEmailOtp(userId, email);
    return { message: 'Verification OTP sent to your email.' };
  }

  /**
   * Endpoint to verify email using an OTP.
   * @param userId - The ID of the user.
   * @param otp - The OTP provided by the user.
   * @returns Success status.
   */
  @Post('verify/email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body('userId') userId: string, @Body('otp') otp: string): Promise<{ success: boolean }> {
    this.logger.log(`Email verification attempt for user: ${userId}`);
    const success = await this.authService.verifyEmail(userId, otp);
    return { success };
  }

  /**
   * Endpoint to send phone verification OTP.
   * @param userId - The ID of the user.
   * @param phoneNumber - The phone number to send OTP to.
   */
  @Post('verify/phone/send-otp')
  @HttpCode(HttpStatus.OK)
  async sendPhoneVerificationOtp(@Body('userId') userId: string, @Body('phoneNumber') phoneNumber: string): Promise<{ message: string }> {
    this.logger.log(`Sending phone verification OTP to user: ${userId}`);
    await this.authService.sendPhoneOtp(userId, phoneNumber);
    return { message: 'Verification OTP sent to your phone.' };
  }

  /**
   * Endpoint to verify phone using an OTP.
   * @param userId - The ID of the user.
   * @param otp - The OTP provided by the user.
   * @returns Success status.
   */
  @Post('verify/phone')
  @HttpCode(HttpStatus.OK)
  async verifyPhone(@Body('userId') userId: string, @Body('otp') otp: string): Promise<{ success: boolean }> {
    this.logger.log(`Phone verification attempt for user: ${userId}`);
    const success = await this.authService.verifyPhone(userId, otp);
    return { success };
  }
}