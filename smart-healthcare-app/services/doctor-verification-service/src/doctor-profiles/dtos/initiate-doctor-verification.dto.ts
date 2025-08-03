// services/doctor-verification-service/src/doctor-profiles/dtos/initiate-doctor-verification.dto.ts
import { IsUUID, IsString, IsNotEmpty, Matches } from 'class-validator';

export class InitiateDoctorVerificationDto {
  @IsUUID()
  userId: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  medicalCouncilRegNo: string;

  @IsString()
  @IsNotEmpty()
  specialization: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'Invalid phone number format. Must be 10-15 digits, optionally starting with "+".' })
  contactNumber: string;
}