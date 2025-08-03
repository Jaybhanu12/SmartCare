// services/doctor-verification-service/src/doctor-verification.service.ts
import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { DoctorProfilesService } from './doctor-profiles/doctor-profiles.service';
import { NmcVerificationService } from './medical-council-verification/nmc-verification.service';
import { KycVerificationService } from './kyc-verification/kyc-verification.service';
import { DigiLockerService } from './digilocker/digilocker.service';
import { InitiateDoctorVerificationDto } from './doctor-profiles/dtos/initiate-doctor-verification.dto';
import { UploadSelfieIdDto } from './doctor-profiles/dtos/upload-selfie-id.dto';
import { DoctorVerificationStatus, NmcStatus, KycStatus, DigiLockerStatus } from './common/dtos/doctor-verification-status.enum';
import { ClientProxy } from '@nestjs/microservices';
import { DoctorProfile } from './doctor-profiles/entities/doctor-profile.entity';
import { DoctorVerificationStatusResponseDto } from './doctor-profiles/dtos/doctor-verification-status.response.dto';
import { AdminUpdateVerificationDto } from './doctor-profiles/dtos/admin-update-verification.dto';
import { DigiLockerVerification } from './digilocker/entities/digilocker-verification.entity'; // Import new entity

@Injectable()
export class DoctorVerificationService {
  private readonly logger = new Logger(DoctorVerificationService.name);

  constructor(
    private doctorProfilesService: DoctorProfilesService,
    private nmcVerificationService: NmcVerificationService,
    private kycVerificationService: KycVerificationService,
    private digiLockerService: DigiLockerService,
    @Inject('AUTH_SERVICE') private authService: ClientProxy,
    @Inject('PATIENT_MANAGEMENT_SERVICE') private patientManagementService: ClientProxy, // Or a dedicated doctor management service
    // @Inject('FILE_STORAGE_SERVICE') private fileStorageService: ClientProxy, // Example for a dedicated file storage service
  ) {}

  /**
   * Initiates the doctor verification process upon receiving a message from Auth Service.
   * @param data - Initial doctor registration data.
   */
  async handleDoctorRegistrationInitiated(data: InitiateDoctorVerificationDto): Promise<void> {
    this.logger.log(`Initiating verification for doctor: ${data.userId}`);
    try {
      const doctorProfile = await this.doctorProfilesService.createDoctorProfile(data);

      // Perform initial automated checks immediately
      await this.performAutomatedChecks(doctorProfile);

    } catch (error: any) {
      this.logger.error(`Failed to initiate doctor verification for ${data.userId}: ${error.message}`, error.stack);
      // Log for admin review or send notification if profile creation fails
    }
  }

  /**
   * Performs automated NMC and KYC checks.
   * This can be called initially or re-triggered.
   * @param doctorProfile - The doctor's profile.
   */
  private async performAutomatedChecks(doctorProfile: DoctorProfile): Promise<void> {
    // 1. NMC Verification
    try {
      const nmcResult = await this.nmcVerificationService.verifyNmcRegistration(
        doctorProfile.medicalCouncilRegNo,
        doctorProfile.fullName,
      );
      await this.doctorProfilesService.updateNmcVerification(
        doctorProfile.userId,
        nmcResult.status,
        nmcResult.data,
        nmcResult.errorMessage,
      );
    } catch (error: any) {
      this.logger.error(`NMC verification failed for ${doctorProfile.userId}: ${error.message}`);
      await this.doctorProfilesService.updateNmcVerification(
        doctorProfile.userId,
        NmcStatus.FAILED,
        null,
        error.message,
      );
    }

    // 2. KYC Verification (requires selfie/ID upload from frontend)
    // This part is triggered by a separate HTTP endpoint (uploadSelfieAndId)
    // and its status will be updated asynchronously.

    // 3. Update overall status based on current checks
    await this.updateOverallDoctorStatus(doctorProfile.userId);
  }

  /**
   * Handles the upload of selfie and ID document URLs.
   * Triggers KYC check.
   * @param uploadDto - DTO containing user ID and image URLs.
   */
  async handleSelfieIdUpload(uploadDto: UploadSelfieIdDto): Promise<void> {
    this.logger.log(`Received selfie/ID upload for user: ${uploadDto.userId}`);
    const doctorProfile = await this.doctorProfilesService.findByUserId(uploadDto.userId);
    if (!doctorProfile) {
      throw new NotFoundException(`Doctor profile for user ID ${uploadDto.userId} not found.`);
    }

    // Update KYC entity with image URLs and set status to IN_PROGRESS
    await this.doctorProfilesService.updateKycVerification(
      uploadDto.userId,
      KycStatus.IN_PROGRESS,
      { selfieImageUrl: uploadDto.selfieImageUrl, idDocumentUrl: uploadDto.idDocumentUrl },
      'Images uploaded, KYC in progress.',
    );

    // Trigger KYC check asynchronously
    try {
      const kycResult = await this.kycVerificationService.performKycCheck(
        uploadDto.selfieImageUrl,
        uploadDto.idDocumentUrl,
      );
      await this.doctorProfilesService.updateKycVerification(
        uploadDto.userId,
        kycResult.status,
        kycResult.data,
        kycResult.errorMessage,
      );
      await this.updateOverallDoctorStatus(uploadDto.userId);
    } catch (error: any) {
      this.logger.error(`KYC verification failed for ${uploadDto.userId}: ${error.message}`);
      await this.doctorProfilesService.updateKycVerification(
        uploadDto.userId,
        KycStatus.FAILED,
        null,
        error.message,
      );
      await this.updateOverallDoctorStatus(uploadDto.userId);
    }

    // After processing, you might want to trigger deletion of temporary images from S3/cloud storage
    // Example (requires a file storage service):
    // this.fileStorageService.emit('delete.temporary.files', { urls: [uploadDto.selfieImageUrl, uploadDto.idDocumentUrl] });
    this.logger.log(`Temporary image URLs for ${uploadDto.userId} processed. Consider implementing secure deletion.`);
  }

  /**
   * Handles DigiLocker callback to fetch documents.
   * @param code - Authorization code from DigiLocker.
   * @param state - State parameter.
   * @returns The user ID for redirection.
   */
  async handleDigiLockerCallback(code: string, state: string): Promise<string> {
    this.logger.log(`Received DigiLocker callback with code: ${code}, state: ${state}`);
    let userId: string;
    let documentData: any;
    let rawApiResponse: any;
    try {
      const result = await this.digiLockerService.handleCallback(code, state);
      userId = result.userId;
      documentData = result.documentData;
      rawApiResponse = result.rawApiResponse;

      const doctorProfile = await this.doctorProfilesService.findByUserId(userId);
      if (!doctorProfile) {
        throw new NotFoundException(`Doctor profile for user ID ${userId} not found after DigiLocker callback.`);
      }

      // Process `documentData` and update the DoctorProfile and DigiLockerVerification entity
      await this.doctorProfilesService.updateDigiLockerVerification(
        userId,
        DigiLockerStatus.CONNECTED,
        documentData,
        rawApiResponse,
        null, // No error message for success
      );

      // Re-evaluate overall status after DigiLocker data is processed
      await this.updateOverallDoctorStatus(userId);
      this.logger.log(`DigiLocker connected and data processed for user: ${userId}`);
      return userId; // Return userId for frontend redirection
    } catch (error: any) {
      this.logger.error(`Error handling DigiLocker callback for user ${userId || 'unknown'}: ${error.message}`, error.stack);
      // Attempt to update DigiLocker status to FAILED if profile exists
      if (userId) {
        await this.doctorProfilesService.updateDigiLockerVerification(
          userId,
          DigiLockerStatus.FAILED,
          null,
          rawApiResponse,
          error.message,
        );
        await this.updateOverallDoctorStatus(userId); // Re-evaluate overall status
      }
      throw error; // Re-throw for global exception filter
    }
  }

  /**
   * Retrieves the current verification status for a doctor.
   * @param userId - The user ID of the doctor.
   * @returns Detailed verification status.
   */
  async getDoctorVerificationStatus(userId: string): Promise<DoctorVerificationStatusResponseDto> {
    const doctorProfile = await this.doctorProfilesService.findByUserId(userId);
    if (!doctorProfile) {
      throw new NotFoundException(`Doctor profile for user ID ${userId} not found.`);
    }

    return {
      userId: doctorProfile.userId,
      fullName: doctorProfile.fullName,
      medicalCouncilRegNo: doctorProfile.medicalCouncilRegNo,
      overallStatus: doctorProfile.overallVerificationStatus,
      nmcStatus: doctorProfile.medicalCouncilVerification?.status || NmcStatus.PENDING,
      nmcErrorMessage: doctorProfile.medicalCouncilVerification?.errorMessage,
      kycStatus: doctorProfile.kycVerification?.status || KycStatus.PENDING,
      kycErrorMessage: doctorProfile.kycVerification?.errorMessage,
      digilockerStatus: doctorProfile.digilockerVerification?.status || DigiLockerStatus.PENDING, // Use actual status
      digilockerErrorMessage: doctorProfile.digilockerVerification?.errorMessage,
      adminNotes: doctorProfile.adminNotes, // Use the actual adminNotes field
      requiresMoreInfo: doctorProfile.overallVerificationStatus === DoctorVerificationStatus.REQUIRES_MORE_INFO,
    };
  }

  /**
   * Admin action to update a doctor's overall verification status.
   * This endpoint should be highly secured (e.g., via API Gateway, JWT Auth, and RolesGuard for ADMIN role).
   * @param adminUpdateDto - DTO with user ID, new status, and admin notes.
   */
  async adminUpdateVerificationStatus(adminUpdateDto: AdminUpdateVerificationDto): Promise<void> {
    const { userId, overallStatus, adminNotes } = adminUpdateDto;
    this.logger.log(`Admin updating verification status for ${userId} to ${overallStatus}`);

    await this.doctorProfilesService.updateOverallVerificationStatus(userId, overallStatus, adminNotes);

    // If status becomes VERIFIED or REJECTED, notify Auth Service
    if (overallStatus === DoctorVerificationStatus.VERIFIED || overallStatus === DoctorVerificationStatus.REJECTED) {
      this.authService.emit('doctor.verification.status.updated', {
        userId,
        isVerified: overallStatus === DoctorVerificationStatus.VERIFIED,
      }).subscribe({
        next: () => this.logger.log(`'doctor.verification.status.updated' event sent to Auth Service for user ${userId}`),
        error: (err: any) => this.logger.error(`Failed to send 'doctor.verification.status.updated' event for user ${userId}: ${err.message}`, err.stack),
      });

      if (overallStatus === DoctorVerificationStatus.VERIFIED) {
        const doctorProfile = await this.doctorProfilesService.findByUserId(userId);
        if (doctorProfile) {
          // Publish doctor profile data to other services (e.g., Patient Management to create a public doctor listing)
          this.patientManagementService.emit('doctor.profile.created', {
            userId: doctorProfile.userId,
            fullName: doctorProfile.fullName,
            specialization: doctorProfile.specialization,
            contactNumber: doctorProfile.contactNumber,
            medicalCouncilRegNo: doctorProfile.medicalCouncilRegNo,
            profilePictureUrl: doctorProfile.profilePictureUrl,
            bio: doctorProfile.bio,
            clinicName: doctorProfile.clinicName,
            clinicAddress: doctorProfile.clinicAddress,
            yearsOfExperience: doctorProfile.yearsOfExperience,
            educationDetails: doctorProfile.educationDetails,
            certifications: doctorProfile.certifications,
            averageRating: doctorProfile.averageRating,
            totalReviews: doctorProfile.totalReviews,
          }).subscribe({
            next: () => this.logger.log(`'doctor.profile.created' event sent to Patient Management Service for verified doctor ${userId}`),
            error: (err: any) => this.logger.error(`Failed to send 'doctor.profile.created' event for doctor ${userId}: ${err.message}`, err.stack),
          });
        }
      }
    }
  }

  /**
   * Re-evaluates and updates the overall doctor verification status based on sub-statuses.
   * This method should be called after any sub-verification (NMC, KYC, DigiLocker) completes.
   * @param userId - The user ID of the doctor.
   */
  async updateOverallDoctorStatus(userId: string): Promise<void> {
    const doctorProfile = await this.doctorProfilesService.findByUserId(userId);
    if (!doctorProfile) {
      this.logger.warn(`Doctor profile not found for user ID ${userId} during overall status update.`);
      return;
    }

    const nmcStatus = doctorProfile.medicalCouncilVerification?.status || NmcStatus.PENDING;
    const kycStatus = doctorProfile.kycVerification?.status || KycStatus.PENDING;
    const digilockerStatus = doctorProfile.digilockerVerification?.status || DigiLockerStatus.PENDING;

    let newOverallStatus = DoctorVerificationStatus.PENDING;

    // Determine overall status based on sub-statuses
    if (nmcStatus === NmcStatus.REJECTED || kycStatus === KycStatus.REJECTED || digilockerStatus === DigiLockerStatus.FAILED) {
      newOverallStatus = DoctorVerificationStatus.REJECTED;
      this.logger.warn(`Doctor ${userId} rejected due to one or more verification failures (NMC: ${nmcStatus}, KYC: ${kycStatus}, DigiLocker: ${digilockerStatus}).`);
    } else if (nmcStatus === NmcStatus.FAILED || kycStatus === KycStatus.FAILED) {
      newOverallStatus = DoctorVerificationStatus.REQUIRES_MORE_INFO;
      this.logger.warn(`Doctor ${userId} requires more info due to automated check failure (NMC: ${nmcStatus}, KYC: ${kycStatus}).`);
    } else if (nmcStatus === NmcStatus.VERIFIED && kycStatus === KycStatus.VERIFIED && digilockerStatus === DigiLockerStatus.CONNECTED) {
      newOverallStatus = DoctorVerificationStatus.VERIFIED;
      this.logger.log(`Doctor ${userId} fully verified through all automated checks.`);
    } else if (nmcStatus === NmcStatus.IN_PROGRESS || kycStatus === KycStatus.IN_PROGRESS || digilockerStatus === DigiLockerStatus.CONNECTED) {
      // If any check is in progress, overall status is in review
      newOverallStatus = DoctorVerificationStatus.IN_REVIEW;
    } else {
      newOverallStatus = DoctorVerificationStatus.PENDING;
    }

    // Only update if status has changed
    if (doctorProfile.overallVerificationStatus !== newOverallStatus) {
      await this.doctorProfilesService.updateOverallVerificationStatus(userId, newOverallStatus);

      // If status changed to VERIFIED or REJECTED, notify Auth Service
      if (newOverallStatus === DoctorVerificationStatus.VERIFIED || newOverallStatus === DoctorVerificationStatus.REJECTED) {
        this.authService.emit('doctor.verification.status.updated', {
          userId,
          isVerified: newOverallStatus === DoctorVerificationStatus.VERIFIED,
        }).subscribe({
          next: () => this.logger.log(`'doctor.verification.status.updated' event sent to Auth Service for user ${userId} (from overall status update)`),
          error: (err: any) => this.logger.error(`Failed to send 'doctor.verification.status.updated' event for user ${userId} (from overall status update): ${err.message}`, err.stack),
        });

        if (newOverallStatus === DoctorVerificationStatus.VERIFIED) {
          const doctorProfileToSend = await this.doctorProfilesService.findByUserId(userId);
          if (doctorProfileToSend) {
            // Publish comprehensive doctor profile data to other services
            this.patientManagementService.emit('doctor.profile.created', {
              userId: doctorProfileToSend.userId,
              fullName: doctorProfileToSend.fullName,
              specialization: doctorProfileToSend.specialization,
              contactNumber: doctorProfileToSend.contactNumber,
              medicalCouncilRegNo: doctorProfileToSend.medicalCouncilRegNo,
              profilePictureUrl: doctorProfileToSend.profilePictureUrl,
              bio: doctorProfileToSend.bio,
              clinicName: doctorProfileToSend.clinicName,
              clinicAddress: doctorProfileToSend.clinicAddress,
              yearsOfExperience: doctorProfileToSend.yearsOfExperience,
              educationDetails: doctorProfileToSend.educationDetails,
              certifications: doctorProfileToSend.certifications,
              averageRating: doctorProfileToSend.averageRating,
              totalReviews: doctorProfileToSend.totalReviews,
            }).subscribe({
              next: () => this.logger.log(`'doctor.profile.created' event sent to Patient Management Service for verified doctor ${userId} (from overall status update)`),
              error: (err: any) => this.logger.error(`Failed to send 'doctor.profile.created' event for doctor ${userId} (from overall status update): ${err.message}`, err.stack),
            });
          }
        }
      }
    }
  }
}