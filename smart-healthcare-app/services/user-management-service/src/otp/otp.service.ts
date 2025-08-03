// services/user-management-service/src/otp/otp.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly otpExpirationSeconds: number;

  constructor(
    private redisService: RedisService,
    private configService: ConfigService,
  ) {
    this.otpExpirationSeconds = this.configService.get<number>('otp.expirationSeconds') ?? 300; // default to 300 seconds if undefined
  }

  /**
   * Generates a numeric OTP.
   * @param length - Length of the OTP (default 6).
   * @returns Generated OTP string.
   */
  generateOtp(length: number = 6): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
  }

  /**
   * Stores an OTP in Redis with an expiration time.
   * @param userId - ID of the user.
   * @param type - Type of OTP (e.g., 'email', 'phone', 'password_reset').
   * @param otp - The OTP to store.
   * @returns True if stored successfully.
   */
  async storeOtp(userId: string, type: string, otp: string): Promise<boolean> {
    const key = `otp:${userId}:${type}`;
    try {
      await this.redisService.set(key, otp, this.otpExpirationSeconds);
      this.logger.log(`OTP for user ${userId} (${type}) stored in Redis. Expires in ${this.otpExpirationSeconds}s.`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to store OTP for user ${userId} (${type}): ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Verifies an OTP against the stored value in Redis.
   * @param userId - ID of the user.
   * @param type - Type of OTP.
   * @param otp - The OTP provided by the user.
   * @returns True if OTP is valid and not expired, false otherwise.
   */
  async verifyOtp(userId: string, type: string, otp: string): Promise<boolean> {
    const key = `otp:${userId}:${type}`;
    try {
      const storedOtp = await this.redisService.get(key);
      if (!storedOtp) {
        this.logger.warn(`OTP for user ${userId} (${type}) not found or expired in Redis.`);
        return false; // OTP not found or expired
      }
      if (storedOtp === otp) {
        await this.redisService.del(key); // Delete OTP after successful verification
        this.logger.log(`OTP for user ${userId} (${type}) verified successfully.`);
        return true;
      } else {
        this.logger.warn(`Invalid OTP provided for user ${userId} (${type}).`);
        return false; // OTP mismatch
      }
    } catch (error) {
      this.logger.error(`Error verifying OTP for user ${userId} (${type}): ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Deletes an OTP from Redis.
   * @param userId - ID of the user.
   * @param type - Type of OTP.
   */
  async deleteOtp(userId: string, type: string): Promise<void> {
    const key = `otp:${userId}:${type}`;
    try {
      await this.redisService.del(key);
      this.logger.log(`OTP for user ${userId} (${type}) deleted from Redis.`);
    } catch (error) {
      this.logger.error(`Failed to delete OTP for user ${userId} (${type}): ${error.message}`, error.stack);
    }
  }
}