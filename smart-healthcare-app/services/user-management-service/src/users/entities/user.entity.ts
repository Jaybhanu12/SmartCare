// services/user-management-service/src/users/entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne } from 'typeorm';
import { Exclude } from 'class-transformer'; // Used to exclude passwordHash from JSON responses
import { RefreshToken } from '../../auth/entities/refresh-token.entity'; // Import RefreshToken entity
import { UserRole } from '../../common/dtos/user-role.enum'; // Import shared enum

@Entity('users') // Maps to a table named 'users' in the database
export class User {
  @PrimaryGeneratedColumn('uuid') // Generates a UUID for the primary key
  id: string;

  @Column({ unique: true, nullable: false }) // Email must be unique and not null
  email: string;

  @Exclude() // Excludes this field when converting entity to plain object (e.g., for API responses)
  @Column({ name: 'password_hash', nullable: false }) // Stores the hashed password
  passwordHash: string;

  @Column({
    type: 'enum', // Defines an ENUM type in PostgreSQL
    enum: UserRole, // Uses the UserRole enum
    default: UserRole.PATIENT, // Default role for new registrations
    nullable: false,
  })
  role: UserRole;

  @Column({ default: false, name: 'is_email_verified' })
  isEmailVerified: boolean; // Indicates if email has been verified (e.g., via OTP)

  @Column({ default: false, name: 'is_phone_verified' })
  isPhoneVerified: boolean; // Indicates if phone has been verified (e.g., via OTP)

  @Column({ default: false, name: 'is_verified' })
  isVerified: boolean; // Overall verification status (e.g., professional verification for doctors)

  @CreateDateColumn({ name: 'created_at' }) // Automatically sets creation timestamp
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' }) // Automatically updates timestamp on entity update
  updatedAt: Date;

  // One-to-one relationship with RefreshToken entity
  // 'refreshToken => refreshToken.user' defines the inverse side of the relationship
  @OneToOne(() => RefreshToken, refreshToken => refreshToken.user)
  refreshToken: RefreshToken;
}