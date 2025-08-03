// services/doctor-verification-service/src/common/dtos/doctor-verification-status.enum.ts
export enum DoctorVerificationStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  REQUIRES_MORE_INFO = 'requires_more_info',
}

export enum NmcStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  FAILED = 'failed',
}

export enum KycStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  FAILED = 'failed',
}

export enum DigiLockerStatus { // New enum for DigiLocker status
  PENDING = 'pending',
  CONNECTED = 'connected',
  FAILED = 'failed',
  DISCONNECTED = 'disconnected',
}