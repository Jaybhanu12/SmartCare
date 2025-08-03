// services/doctor-verification-service/src/doctor-profiles/dtos/digilocker-callback.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class DigiLockerCallbackDto {
  @IsString()
  @IsNotEmpty()
  code: string; // Authorization code from DigiLocker

  @IsString()
  @IsNotEmpty()
  state: string; // State parameter to prevent CSRF, should contain userId

  @IsOptional()
  @IsString()
  error?: string; // Error from DigiLocker, if any
}