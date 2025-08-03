// services/user-management-service/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './controllers/auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshToken } from './entities/refresh-token.entity';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    // Configure JwtModule asynchronously using ConfigService
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.accessTokenSecret'),
        signOptions: { expiresIn: configService.get<string>('jwt.accessTokenExpirationTime') },
      }),
    }),
    TypeOrmModule.forFeature([RefreshToken]),
    // Clients for communicating with other microservices
    ClientsModule.registerAsync([
      {
        name: 'DOCTOR_VERIFICATION_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const rabbitmqUrl = configService.get<string>('rabbitmq.url');
          const doctorVerificationQueue = configService.get<string>('rabbitmq.doctorVerificationQueue');

          if (!rabbitmqUrl || !doctorVerificationQueue) {
            throw new Error('Missing RabbitMQ configuration for DOCTOR_VERIFICATION_SERVICE.');
          }

          return {
            transport: Transport.RMQ,
            options: {
              urls: [rabbitmqUrl],
              queue: doctorVerificationQueue,
              queueOptions: { durable: true },
            },
          };
        },
      },
      {
        name: 'PATIENT_MANAGEMENT_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const rabbitmqUrl = configService.get<string>('rabbitmq.url');
          const patientManagementQueue = configService.get<string>('rabbitmq.patientManagementQueue');

          if (!rabbitmqUrl || !patientManagementQueue) {
            throw new Error('Missing RabbitMQ configuration for PATIENT_MANAGEMENT_SERVICE.');
          }

          return {
            transport: Transport.RMQ,
            options: {
              urls: [rabbitmqUrl],
              queue: patientManagementQueue,
              queueOptions: { durable: true },
            },
          };
        },
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}