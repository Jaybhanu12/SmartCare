// services/doctor-verification-service/src/medical-council-verification/entities/medical-council-verification.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne } from 'typeorm';
import { DoctorProfile } from '../../doctor-profiles/entities/doctor-profile.entity';

export enum NmcStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  FAILED = 'failed', // API call failed
}

@Entity('medical_council_verifications')
export class MedicalCouncilVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false, unique: true, name: 'user_id' })
  userId: string; // Foreign key to DoctorProfile.userId

  @Column({ nullable: false, name: 'reg_no_at_attempt' })
  regNoAtAttempt: string; // Registration number at the time of this verification attempt

  @Column({
    type: 'enum',
    enum: NmcStatus,
    default: NmcStatus.PENDING,
    nullable: false,
  })
  status: NmcStatus;

  @Column({ type: 'jsonb', nullable: true, name: 'api_response_data' }) // <-- ADD nullable: true
  apiResponseData: Record<string, any> | null; // <-- ADD | null

  @Column({ nullable: true, name: 'error_message' }) // <-- ADD nullable: true
  errorMessage: string | null; // <-- ADD | null

  @Column({ nullable: true, name: 'verified_name' }) // <-- ADD nullable: true
  verifiedName: string | null; // <-- ADD | null

  @Column({ nullable: true, name: 'verified_specialization' }) // <-- ADD nullable: true
  verifiedSpecialization: string | null; // <-- ADD | null

  @Column({ nullable: true, name: 'verified_council' }) // <-- ADD nullable: true
  verifiedCouncil: string | null; // <-- ADD | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => DoctorProfile, doctorProfile => doctorProfile.medicalCouncilVerification)
  doctorProfile: DoctorProfile;
}