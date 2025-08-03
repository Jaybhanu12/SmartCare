// services/user-management-service/src/redis/redis.module.ts
import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global() // Makes RedisService available throughout the application
@Module({
  imports: [ConfigModule],
  providers: [
    RedisService,
    {
      // Custom provider to ensure Redis client is initialized with config
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const redisConfig = configService.get('redis');
        const redisService = new RedisService(configService); // Pass configService
        await redisService.onModuleInit(); // Manually call init
        return redisService.getClient();
      },
      inject: [ConfigService],
    },
  ],
  exports: [RedisService, 'REDIS_CLIENT'], // Export both the service and the client token
})
export class RedisModule {}