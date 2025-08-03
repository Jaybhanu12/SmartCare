// services/user-management-service/src/auth/dtos/token-response.dto.ts
import { IsString, IsNotEmpty, IsBoolean } from 'class-validator';

export class TokenResponseDto {
  @IsString()
  @IsNotEmpty()
  accessToken: string; // The short-lived JWT for API access

  @IsString()
  @IsNotEmpty()
  refreshToken: string; // The long-lived token for refreshing access tokens

  @IsBoolean()
  isVerified: boolean; // Overall verification status of the user (e.g., professional for doctors)
}