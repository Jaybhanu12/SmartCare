// services/user-management-service/src/auth/dtos/register.dto.ts
import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, IsEnum, Matches, IsDate, IsOptional } from 'class-validator';
import { UserRole } from '../../common/dtos/user-role.enum'; // Import shared enum
import { Type } from 'class-transformer'; // For transforming date strings to Date objects

// Base DTO for common registration fields
export class RegisterDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email cannot be empty' })
  email: string;

  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password cannot be empty' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(30, { message: 'Password cannot exceed 30 characters' })
  // Regex for strong password: at least one uppercase, one lowercase, one number, one special character
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+={}\[\]|\\:;"'<>,.?/~`]).{8,30}$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
  })
  password: string;

  @IsString({ message: 'Full name must be a string' })
  @IsNotEmpty({ message: 'Full name cannot be empty' })
  fullName: string;

  @IsString({ message: 'Contact number must be a string' })
  @IsNotEmpty({ message: 'Contact number cannot be empty' })
  // Regex for international phone numbers (e.g., +919876543210 or 9876543210)
  @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'Invalid phone number format. Must be 10-15 digits, optionally starting with "+".' })
  contactNumber: string;

  @IsEnum(UserRole, { message: 'Invalid user role' })
  @IsNotEmpty({ message: 'Role cannot be empty' })
  role: UserRole;
}

// DTO for Doctor-specific registration
export class RegisterDoctorDto extends RegisterDto {
  @IsString({ message: 'Medical Council Registration Number must be a string' })
  @IsNotEmpty({ message: 'Medical Council Registration Number cannot be empty' })
  medicalCouncilRegNo: string;

  // Enforce role to be DOCTOR for this DTO
  @IsEnum(UserRole, { message: 'Role must be doctor for doctor registration' })
  declare role: UserRole.DOCTOR; // Ensures that only 'doctor' is accepted for this endpoint

  @IsString({ message: 'Specialization must be a string' })
  @IsNotEmpty({ message: 'Specialization cannot be empty' })
  specialization: string;

  // Optional fields for initial doctor profile, will be populated by verification service
  @IsOptional()
  @IsString()
  profilePictureUrl?: string;

  @IsOptional()
  @IsString()
  bio?: string;
}

// DTO for Patient-specific registration
export class RegisterPatientDto extends RegisterDto {
  // Enforce role to be PATIENT for this DTO
  @IsEnum(UserRole, { message: 'Role must be patient for patient registration' })
  declare role: UserRole.PATIENT; // Ensures that only 'patient' is accepted for this endpoint

  @Type(() => Date) // Ensures the string date is transformed into a Date object
  @IsDate({ message: 'Date of birth must be a valid date' })
  @IsNotEmpty({ message: 'Date of birth cannot be empty' })
  dateOfBirth: Date;

  @IsEnum(['male', 'female', 'other'], { message: 'Invalid gender' })
  @IsNotEmpty({ message: 'Gender cannot be empty' })
  gender: string;
}

// Note: Admin registration will NOT have a public DTO or endpoint.
// Admin users are created internally for security.