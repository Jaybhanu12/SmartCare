// services/user-management-service/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN') || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Start the HTTP listener for the API Gateway
  const httpPort = configService.get<number>('port') || 3000;
  await app.listen(httpPort, () => {
    console.log(`User Management Service (HTTP) listening on port ${httpPort}`);
  });

  // Start the Microservice listener (RabbitMQ)
  const rabbitmqUrl = configService.get<string>('rabbitmq.url');
  const authQueue = configService.get<string>('rabbitmq.authQueue');

  // Handle cases where critical config values are missing
  if (!rabbitmqUrl || !authQueue) {
    throw new Error('RabbitMQ configuration is incomplete. Ensure rabbitmq.url and rabbitmq.authQueue are set.');
  }

  const microservice = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: authQueue,
      queueOptions: {
        durable: true,
      },
      noAck: false,
    },
  });

  await microservice.listen();
  console.log(`User Management Service (Microservice) listening on queue: ${authQueue}`);
}

bootstrap();