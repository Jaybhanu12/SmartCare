// services/user-management-service/src/auth/entities/refresh-token.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity'; // Import User entity

@Entity('refresh_tokens') // Maps to a table named 'refresh_tokens'
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid') // Generates a UUID for the primary key
  id: string;

  @Column({ nullable: false })
  token: string; // Stores the hashed refresh token

  @Column({ nullable: false, name: 'expires_at' })
  expiresAt: Date; // Timestamp when the refresh token expires

  @Column({ default: false, name: 'is_revoked' })
  isRevoked: boolean; // Flag to manually revoke a token (e.g., on logout or compromise)

  // One-to-one relationship with User entity
  // 'user => user.refreshToken' defines the inverse side
  // { onDelete: 'CASCADE' } ensures that if a User is deleted, their RefreshToken is also deleted
  @OneToOne(() => User, user => user.refreshToken, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' }) // Defines the foreign key column in this table
  user: User;

  @Column({ name: 'user_id', unique: true }) // Stores the user ID, must be unique as one user has one refresh token entry
  userId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}