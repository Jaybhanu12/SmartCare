// services/user-management-service/src/otp/otp.module.ts
import { Module } from '@nestjs/common';
import { OtpService } from './otp.service';
import { RedisModule } from '../redis/redis.module'; // Import RedisModule
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [RedisModule, ConfigModule], // OtpService depends on Redis and Config
  providers: [OtpService],
  exports: [OtpService], // Export OtpService for use in AuthService
})
export class OtpModule {}