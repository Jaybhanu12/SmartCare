// services/doctor-verification-service/src/doctor-profiles/dtos/upload-selfie-id.dto.ts
import { IsUUID, IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class UploadSelfieIdDto {
  @IsUUID()
  userId: string;

  @IsUrl({}, { message: 'Selfie image URL must be a valid URL' })
  @IsNotEmpty({ message: 'Selfie image URL cannot be empty' })
  selfieImageUrl: string; // Assuming a pre-signed S3 URL or similar temporary storage

  @IsUrl({}, { message: 'ID document URL must be a valid URL' })
  @IsNotEmpty({ message: 'ID document URL cannot be empty' })
  idDocumentUrl: string; // Assuming a pre-signed S3 URL or similar temporary storage
}