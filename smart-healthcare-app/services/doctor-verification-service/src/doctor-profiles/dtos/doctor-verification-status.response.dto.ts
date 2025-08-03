// services/doctor-verification-service/src/doctor-profiles/dtos/doctor-verification-status.response.dto.ts
import { IsUUID, IsString, IsNotEmpty, IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { DoctorVerificationStatus, NmcStatus, KycStatus, DigiLockerStatus } from '../../common/dtos/doctor-verification-status.enum'; // Updated import

export class DoctorVerificationStatusResponseDto {
  @IsUUID()
  userId: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  medicalCouncilRegNo: string;

  @IsEnum(DoctorVerificationStatus)
  overallStatus: DoctorVerificationStatus;

  @IsEnum(NmcStatus)
  nmcStatus: NmcStatus;

  @IsOptional()
  @IsString()
  nmcErrorMessage?: string;

  @IsEnum(KycStatus)
  kycStatus: KycStatus;

  @IsOptional()
  @IsString()
  kycErrorMessage?: string;

  @IsEnum(DigiLockerStatus) // New field
  digilockerStatus: DigiLockerStatus;

  @IsOptional()
  @IsString()
  digilockerErrorMessage?: string;

  @IsOptional()
  @IsString()
  adminNotes?: string;

  @IsOptional()
  @IsBoolean()
  requiresMoreInfo?: boolean;
}