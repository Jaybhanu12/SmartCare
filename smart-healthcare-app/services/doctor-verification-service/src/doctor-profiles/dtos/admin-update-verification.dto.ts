// services/doctor-verification-service/src/doctor-profiles/dtos/admin-update-verification.dto.ts
import { IsUUID, IsEnum, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { DoctorVerificationStatus } from '../../common/dtos/doctor-verification-status.enum';

export class AdminUpdateVerificationDto {
  @IsUUID()
  userId: string;

  @IsEnum(DoctorVerificationStatus, { message: 'Invalid overall verification status' })
  @IsNotEmpty({ message: 'Overall status cannot be empty' })
  overallStatus: DoctorVerificationStatus;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}