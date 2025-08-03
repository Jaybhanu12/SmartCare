// services/doctor-verification-service/src/app.module.ts
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

// Import your modules
import { DoctorVerificationModule } from './doctor-verification.module';

// Import your entities here
import { DoctorProfile } from './doctor-profiles/entities/doctor-profile.entity';
import { MedicalCouncilVerification } from './medical-council-verification/entities/medical-council-verification.entity';
import { KycVerification } from './kyc-verification/entities/kyc-verification.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: `../../.env.${process.env.NODE_ENV || 'development'}`, // Point to monorepo root .env
      ignoreEnvFile: false,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PORT_DOCTOR_VERIFICATION: Joi.number().default(3002), // Use specific port name
        DATABASE_HOST: Joi.string().required(),
        DATABASE_PORT: Joi.number().default(5432),
        DATABASE_USERNAME: Joi.string().required(),
        DATABASE_PASSWORD: Joi.string().required(),
        DATABASE_NAME_DOCTOR_VERIFICATION: Joi.string().required(), // Use specific DB name
        RABBITMQ_URL: Joi.string().required(),
        RABBITMQ_AUTH_QUEUE: Joi.string().required(),
        RABBITMQ_DOCTOR_VERIFICATION_QUEUE: Joi.string().required(),
        RABBITMQ_PATIENT_MANAGEMENT_QUEUE: Joi.string().required(),
        RABBITMQ_NOTIFICATION_QUEUE: Joi.string().required(), // New queue
        NMC_VERIFICATION_API_BASE_URL: Joi.string().uri().required(),
        NMC_VERIFICATION_API_KEY: Joi.string().required(),
        KYC_LIVENESS_API_BASE_URL: Joi.string().uri().required(),
        KYC_LIVENESS_API_KEY: Joi.string().required(),
        DIGILOCKER_CLIENT_ID: Joi.string().required(),
        DIGILOCKER_CLIENT_SECRET: Joi.string().required(),
        DIGILOCKER_REDIRECT_URI: Joi.string().uri().required(),
        CORS_ORIGIN: Joi.string().default('*'),
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
        database: configService.get<string>('database.name'), // This will use DATABASE_NAME_DOCTOR_VERIFICATION
        entities: [
          DoctorProfile,
          MedicalCouncilVerification,
          KycVerification,
        ],
        synchronize: process.env.NODE_ENV === 'development',
        logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
      }),
    }),
    WinstonModule.forRoot(winstonModuleOptions),
    ClientsModule.registerAsync([ // Clients for communicating with other services
      {
        name: 'AUTH_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: async (configService: ConfigService) => {
          const rabbitmqUrl = configService.get<string>('rabbitmq.url');
          if (!rabbitmqUrl) {
            throw new Error('RABBITMQ_URL is not configured for AUTH_SERVICE client.');
          }
          return {
            transport: Transport.RMQ,
            options: {
              urls: [rabbitmqUrl],
              queue: configService.get<string>('rabbitmq.authQueue') as string,
              queueOptions: { durable: true },
            },
          };
        },
      },
      {
        name: 'PATIENT_MANAGEMENT_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: async (configService: ConfigService) => {
          const rabbitmqUrl = configService.get<string>('rabbitmq.url');
          if (!rabbitmqUrl) {
            throw new Error('RABBITMQ_URL is not configured for PATIENT_MANAGEMENT_SERVICE client.');
          }
          return {
            transport: Transport.RMQ,
            options: {
              urls: [rabbitmqUrl],
              queue: configService.get<string>('rabbitmq.patientManagementQueue') as string,
              queueOptions: { durable: true },
            },
          };
        },
      },
    ]),
    DoctorVerificationModule, // Your main Doctor Verification module
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