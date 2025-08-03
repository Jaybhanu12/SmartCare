// services/user-management-service/src/users/users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // Import TypeORM module
import { UsersService } from './users.service'; // User service
import { User } from './entities/user.entity'; // User entity

@Module({
  imports: [TypeOrmModule.forFeature([User])], // Register User entity with TypeORM
  providers: [UsersService], // Provide UsersService
  exports: [UsersService], // Export UsersService so other modules (like AuthModule) can use it
})
export class UsersModule {}