// services/user-management-service/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import * as Joi from 'joi';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { WinstonModule } from 'nest-winston';
import { winstonModuleOptions } from './config/winston.config';
import { ClientsModule, Transport } from '@nestjs/microservices';

// Import your entities for this service
import { User } from './users/entities/user.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';

// Import your feature modules
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module'; // Import RedisModule
import { OtpModule } from './otp/otp.module'; // Import OtpModule

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: `../../.env.${process.env.NODE_ENV || 'development'}`, // Point to monorepo root .env
      ignoreEnvFile: false,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PORT_USER_MANAGEMENT: Joi.number().default(3000), // Use specific port name
        DATABASE_HOST: Joi.string().required(),
        DATABASE_PORT: Joi.number().default(5432),
        DATABASE_USERNAME: Joi.string().required(),
        DATABASE_PASSWORD: Joi.string().required(),
        DATABASE_NAME_AUTH: Joi.string().required(), // Use specific DB name
        JWT_ACCESS_TOKEN_SECRET: Joi.string().required(),
        JWT_ACCESS_TOKEN_EXPIRATION_TIME: Joi.string().required(),
        JWT_REFRESH_TOKEN_SECRET: Joi.string().required(),
        JWT_REFRESH_TOKEN_EXPIRATION_TIME: Joi.string().required(),
        BCRYPT_SALT_ROUNDS: Joi.number().default(10),
        RABBITMQ_URL: Joi.string().required(),
        RABBITMQ_AUTH_QUEUE: Joi.string().required(),
        RABBITMQ_DOCTOR_VERIFICATION_QUEUE: Joi.string().required(),
        RABBITMQ_PATIENT_MANAGEMENT_QUEUE: Joi.string().required(),
        RABBITMQ_NOTIFICATION_QUEUE: Joi.string().required(), // New queue for notifications
        CORS_ORIGIN: Joi.string().default('*'),

        // Redis validation
        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.number().default(6379),
        REDIS_PASSWORD: Joi.string().allow('').optional(), // Allow empty string for no password
        REDIS_DB: Joi.number().default(0),
        OTP_EXPIRATION_SECONDS: Joi.number().default(300),

        // External API Keys (for other services, but validated here if shared)
        NMC_VERIFICATION_API_BASE_URL: Joi.string().uri().optional(),
        NMC_VERIFICATION_API_KEY: Joi.string().optional(),
        KYC_LIVENESS_API_BASE_URL: Joi.string().uri().optional(),
        KYC_LIVENESS_API_KEY: Joi.string().optional(),
        DIGILOCKER_CLIENT_ID: Joi.string().optional(),
        DIGILOCKER_CLIENT_SECRET: Joi.string().optional(),
        DIGILOCKER_REDIRECT_URI: Joi.string().uri().optional(),

        // Email service validation (for Notification Service, but good to have here for completeness)
        EMAIL_SERVICE_HOST: Joi.string().optional(),
        EMAIL_SERVICE_PORT: Joi.number().optional(),
        EMAIL_SERVICE_SECURE: Joi.boolean().optional(),
        EMAIL_SERVICE_USER: Joi.string().email().optional(),
        EMAIL_SERVICE_PASS: Joi.string().optional(),
        EMAIL_FROM_ADDRESS: Joi.string().optional(),

        // Twilio service validation (for Notification Service)
        TWILIO_ACCOUNT_SID: Joi.string().optional(),
        TWILIO_AUTH_TOKEN: Joi.string().optional(),
        TWILIO_PHONE_NUMBER: Joi.string().optional(),
      }),
      validationOptions: {
        abortEarly: false,
      },
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        entities: [
          User,
          RefreshToken,
        ],
        synchronize: process.env.NODE_ENV === 'development',
        logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
      }),
    }),

    WinstonModule.forRoot(winstonModuleOptions),

    ClientsModule.registerAsync([
      {
        name: 'DOCTOR_VERIFICATION_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: async (configService: ConfigService) => {
          const rabbitmqUrl = configService.get<string>('rabbitmq.url');
          if (!rabbitmqUrl) { throw new Error('RABBITMQ_URL is not configured for DOCTOR_VERIFICATION_SERVICE client.'); }
          return { transport: Transport.RMQ, options: { urls: [rabbitmqUrl], queue: configService.get<string>('rabbitmq.doctorVerificationQueue') as string, queueOptions: { durable: true } } };
        },
      },
      {
        name: 'PATIENT_MANAGEMENT_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: async (configService: ConfigService) => {
          const rabbitmqUrl = configService.get<string>('rabbitmq.url');
          if (!rabbitmqUrl) { throw new Error('RABBITMQ_URL is not configured for PATIENT_MANAGEMENT_SERVICE client.'); }
          return { transport: Transport.RMQ, options: { urls: [rabbitmqUrl], queue: configService.get<string>('rabbitmq.patientManagementQueue') as string, queueOptions: { durable: true } } };
        },
      },
      {
        name: 'NOTIFICATION_SERVICE', // Configure the Notification Service client
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: async (configService: ConfigService) => {
          const rabbitmqUrl = configService.get<string>('rabbitmq.url');
          if (!rabbitmqUrl) { throw new Error('RABBITMQ_URL is not configured for NOTIFICATION_SERVICE client.'); }
          return { transport: Transport.RMQ, options: { urls: [rabbitmqUrl], queue: configService.get<string>('rabbitmq.notificationQueue') as string, queueOptions: { durable: true } } };
        },
      },
    ]),

    UsersModule,
    AuthModule,
    RedisModule, // Import RedisModule
    OtpModule, // Import OtpModule
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}