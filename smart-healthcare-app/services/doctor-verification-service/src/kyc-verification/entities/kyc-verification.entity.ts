// services/doctor-verification-service/src/kyc-verification/entities/kyc-verification.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne } from 'typeorm';
import { DoctorProfile } from '../../doctor-profiles/entities/doctor-profile.entity';

export enum KycStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  FAILED = 'failed', // API call failed
}

@Entity('kyc_verifications')
export class KycVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false, unique: true, name: 'user_id' })
  userId: string; // Foreign key to DoctorProfile.userId

  @Column({ nullable: true, name: 'selfie_image_url' }) // <-- ADD nullable: true
  selfieImageUrl: string | null; // <-- ADD | null

  @Column({ nullable: true, name: 'id_document_url' }) // <-- ADD nullable: true
  idDocumentUrl: string | null; // <-- ADD | null

  @Column({
    type: 'enum',
    enum: KycStatus,
    default: KycStatus.PENDING,
    nullable: false,
  })
  status: KycStatus;

  @Column({ type: 'jsonb', nullable: true, name: 'api_response_data' }) // <-- ADD nullable: true
  apiResponseData: Record<string, any> | null; // <-- ADD | null

  @Column({ nullable: true, name: 'error_message' }) // <-- ADD nullable: true
  errorMessage: string | null; // <-- ADD | null

  @Column({ nullable: true, name: 'verified_id_type' }) // <-- ADD nullable: true
  verifiedIdType: string | null; // <-- ADD | null

  @Column({ nullable: true, name: 'verified_id_number' }) // <-- ADD nullable: true
  verifiedIdNumber: string | null; // <-- ADD | null

  @Column({ nullable: true, name: 'face_match_score', type: 'decimal', precision: 5, scale: 2 }) // <-- ADD nullable: true
  faceMatchScore: number | null; // <-- ADD | null

  @Column({ nullable: true, name: 'liveness_detected' }) // <-- ADD nullable: true
  livenessDetected: boolean | null; // <-- ADD | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => DoctorProfile, doctorProfile => doctorProfile.kycVerification)
  doctorProfile: DoctorProfile;
}