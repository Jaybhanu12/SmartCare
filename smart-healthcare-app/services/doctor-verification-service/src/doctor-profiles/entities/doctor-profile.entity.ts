// services/doctor-verification-service/src/doctor-profiles/entities/doctor-profile.entity.ts
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { MedicalCouncilVerification } from '../../medical-council-verification/entities/medical-council-verification.entity';
import { KycVerification } from '../../kyc-verification/entities/kyc-verification.entity';
import { DigiLockerVerification } from '../../digilocker/entities/digilocker-verification.entity';

export enum DoctorVerificationStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  REQUIRES_MORE_INFO = 'requires_more_info',
}

@Entity('doctor_profiles')
export class DoctorProfile {
  @PrimaryColumn('uuid') // userId from User Management Service
  userId: string;

  @Column({ nullable: false })
  fullName: string;

  @Column({ nullable: false, unique: true, name: 'medical_council_reg_no' })
  medicalCouncilRegNo: string;

  @Column({ nullable: true })
  specialization: string | null; // Explicitly allow null

  @Column({ nullable: true, name: 'contact_number' })
  contactNumber: string | null; // Explicitly allow null

  @Column({ nullable: true, name: 'profile_picture_url' })
  profilePictureUrl: string | null; // Explicitly allow null

  @Column({ nullable: true })
  bio: string | null; // Explicitly allow null

  @Column({ nullable: true, name: 'clinic_name' })
  clinicName: string | null; // Explicitly allow null

  @Column({ nullable: true, name: 'clinic_address' })
  clinicAddress: string | null; // Explicitly allow null

  @Column({ nullable: true, name: 'years_of_experience', type: 'int' })
  yearsOfExperience: number | null; // Explicitly allow null

  @Column({ nullable: true, name: 'education_details', type: 'jsonb', default: '[]' }) // Default to empty array for JSONB
  educationDetails: { degree: string; university: string; year: number }[] | null; // Explicitly allow null, or use `object` type

  @Column({ nullable: true, name: 'certifications', type: 'jsonb', default: '[]' }) // Default to empty array for JSONB
  certifications: string[] | null; // Explicitly allow null, or use `object` type

  @Column({ nullable: true, name: 'average_rating', type: 'decimal', precision: 3, scale: 2, default: 0.00 })
  averageRating: number | null; // Explicitly allow null

  @Column({ nullable: true, name: 'total_reviews', type: 'int', default: 0 })
  totalReviews: number | null; // Explicitly allow null

  @Column({
    type: 'enum',
    enum: DoctorVerificationStatus,
    default: DoctorVerificationStatus.PENDING,
    nullable: false,
    name: 'overall_verification_status',
  })
  overallVerificationStatus: DoctorVerificationStatus;

  @Column({ nullable: true, name: 'admin_notes' })
  adminNotes: string | null; // Explicitly allow null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations to detailed verification records
  @OneToOne(() => MedicalCouncilVerification, mcv => mcv.doctorProfile, { cascade: true, nullable: true }) // Allow nullable relation
  @JoinColumn({ name: 'user_id', referencedColumnName: 'userId' })
  medicalCouncilVerification: MedicalCouncilVerification | null; // Explicitly allow null

  @OneToOne(() => KycVerification, kyc => kyc.doctorProfile, { cascade: true, nullable: true }) // Allow nullable relation
  @JoinColumn({ name: 'user_id', referencedColumnName: 'userId' })
  kycVerification: KycVerification | null; // Explicitly allow null

  @OneToOne(() => DigiLockerVerification, digi => digi.doctorProfile, { cascade: true, nullable: true }) // Allow nullable relation
  @JoinColumn({ name: 'user_id', referencedColumnName: 'userId' })
  digilockerVerification: DigiLockerVerification | null; // Explicitly allow null
}