// services/doctor-verification-service/src/digilocker/entities/digilocker-verification.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne } from 'typeorm';
import { DoctorProfile } from '../../doctor-profiles/entities/doctor-profile.entity';

export enum DigiLockerStatus {
  PENDING = 'pending',
  CONNECTED = 'connected', // Successfully authenticated and fetched some data
  FAILED = 'failed',     // Connection or data fetch failed
  DISCONNECTED = 'disconnected', // User revoked access
}

@Entity('digilocker_verifications')
export class DigiLockerVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false, unique: true, name: 'user_id' })
  userId: string; // Foreign key to DoctorProfile.userId

  @Column({
    type: 'enum',
    enum: DigiLockerStatus,
    default: DigiLockerStatus.PENDING,
    nullable: false,
  })
  status: DigiLockerStatus;

  @Column({ type: 'jsonb', nullable: true, name: 'aadhaar_data' }) // <-- ADD nullable: true
  aadhaarData: Record<string, any> | null; // <-- ADD | null

  @Column({ type: 'jsonb', nullable: true, name: 'medical_degree_data' }) // <-- ADD nullable: true
  medicalDegreeData: Record<string, any> | null; // <-- ADD | null

  @Column({ type: 'jsonb', nullable: true, name: 'raw_api_response' }) // <-- ADD nullable: true
  rawApiResponse: Record<string, any> | null; // <-- ADD | null

  @Column({ nullable: true, name: 'error_message' }) // <-- ADD nullable: true
  errorMessage: string | null; // <-- ADD | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => DoctorProfile, doctorProfile => doctorProfile.digilockerVerification)
  doctorProfile: DoctorProfile;
}