// services/user-management-service/src/users/users.service.ts
import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserRole } from '../common/dtos/user-role.enum';
import { RegisterDto } from '../auth/dtos/register.dto';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        private configService: ConfigService,
    ) { }

    /**
     * Creates a new user in the database.
     * @param registerDto - Data for user registration.
     * @returns The newly created User entity.
     * @throws ConflictException if a user with the given email already exists.
     */
    async createUser(registerDto: RegisterDto): Promise<User> {
        const { password, email, role } = registerDto;

        const existingUser = await this.usersRepository.findOne({ where: { email } });
        if (existingUser) {
            throw new ConflictException('User with this email already exists.');
        }

        // Use a default value for saltRounds if not found in config
        const saltRounds = this.configService.get<number>('bcrypt.saltRounds') || 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const newUser = this.usersRepository.create({
            email,
            passwordHash,
            role,
            isEmailVerified: false,
            isPhoneVerified: false,
            isVerified: role === UserRole.DOCTOR ? false : true,
        });

        await this.usersRepository.save(newUser);
        this.logger.log(`New user created: ${newUser.email} (Role: ${newUser.role}, ID: ${newUser.id})`);
        return newUser;
    }

    /**
     * Finds a user by their email address.
     * @param email - The email to search for.
     * @returns User entity or null if not found.
     */
    async findByEmail(email: string): Promise<User | null> {
        return this.usersRepository.findOne({ where: { email } });
    }

    /**
     * Finds a user by their ID.
     * @param id - The user ID to search for.
     * @returns User entity or null if not found.
     */
    async findById(id: string): Promise<User | null> {
        return this.usersRepository.findOne({ where: { id } });
    }

    /**
     * Updates the overall professional verification status of a user (primarily for doctors).
     * @param userId - The ID of the user to update.
     * @param isVerified - The new verification status.
     */
    async updateOverallVerificationStatus(userId: string, isVerified: boolean): Promise<void> {
        const result = await this.usersRepository.update(userId, { isVerified });
        if (result.affected === 0) {
            this.logger.warn(`Attempted to update verification status for non-existent user: ${userId}`);
            throw new NotFoundException(`User with ID ${userId} not found.`);
        }
        this.logger.log(`User ${userId} overall verification status updated to: ${isVerified}`);
    }

    /**
     * Updates the email verification status of a user.
     * @param userId - The ID of the user to update.
     * @param status - The new email verification status.
     */
    async updateEmailVerificationStatus(userId: string, status: boolean): Promise<void> {
        const result = await this.usersRepository.update(userId, { isEmailVerified: status });
        if (result.affected === 0) {
            this.logger.warn(`Attempted to update email verification status for non-existent user: ${userId}`);
            throw new NotFoundException(`User with ID ${userId} not found.`);
        }
        this.logger.log(`User ${userId} email verification status updated to: ${status}`);
    }

    /**
     * Updates the phone verification status of a user.
     * @param userId - The ID of the user to update.
     * @param status - The new phone verification status.
     */
    async updatePhoneVerificationStatus(userId: string, status: boolean): Promise<void> {
        const result = await this.usersRepository.update(userId, { isPhoneVerified: status });
        if (result.affected === 0) {
            this.logger.warn(`Attempted to update phone verification status for non-existent user: ${userId}`);
            throw new NotFoundException(`User with ID ${userId} not found.`);
        }
        this.logger.log(`User ${userId} phone verification status updated to: ${status}`);
    }
}