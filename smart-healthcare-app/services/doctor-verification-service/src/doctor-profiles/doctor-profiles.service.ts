// services/doctor-verification-service/src/doctor-profiles/doctor-profiles.service.ts
import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DoctorProfile, DoctorVerificationStatus } from './entities/doctor-profile.entity';
import { InitiateDoctorVerificationDto } from '../doctor-profiles/dtos/initiate-doctor-verification.dto';
import { NmcStatus } from '../medical-council-verification/entities/medical-council-verification.entity';
import { KycStatus } from '../kyc-verification/entities/kyc-verification.entity';
import { DigiLockerStatus } from '../common/dtos/doctor-verification-status.enum';
import { MedicalCouncilVerification } from '../medical-council-verification/entities/medical-council-verification.entity';
import { KycVerification } from '../kyc-verification/entities/kyc-verification.entity';
import { DigiLockerVerification } from '../digilocker/entities/digilocker-verification.entity';

@Injectable()
export class DoctorProfilesService {
  private readonly logger = new Logger(DoctorProfilesService.name);

  constructor(
    @InjectRepository(DoctorProfile)
    private doctorProfileRepository: Repository<DoctorProfile>,
  ) {}

  /**
   * Creates a new doctor profile entry upon initial registration.
   * Initializes all fields, including optional ones, to ensure type safety.
   * @param data - Initial doctor data from Auth Service.
   * @returns The created DoctorProfile.
   * @throws ConflictException if a doctor profile for the given user ID already exists.
   */
  async createDoctorProfile(data: InitiateDoctorVerificationDto): Promise<DoctorProfile> {
    const existingProfile = await this.doctorProfileRepository.findOne({ where: { userId: data.userId } });
    if (existingProfile) {
      throw new ConflictException(`Doctor profile for user ID ${data.userId} already exists.`);
    }

    const newProfile = this.doctorProfileRepository.create({
      userId: data.userId,
      fullName: data.fullName,
      medicalCouncilRegNo: data.medicalCouncilRegNo,
      specialization: data.specialization,
      contactNumber: data.contactNumber,
      overallVerificationStatus: DoctorVerificationStatus.PENDING,
      // Explicitly initialize all nullable fields to null or default empty arrays
      profilePictureUrl: null,
      bio: null,
      clinicName: null,
      clinicAddress: null,
      yearsOfExperience: null,
      educationDetails: [], // Initialize as empty array for JSONB
      certifications: [], // Initialize as empty array for JSONB
      averageRating: 0.00,
      totalReviews: 0,
      adminNotes: null,
      // Relations are not created here, they are managed by update methods
      medicalCouncilVerification: null,
      kycVerification: null,
      digilockerVerification: null,
    });

    return this.doctorProfileRepository.save(newProfile);
  }

  /**
   * Finds a doctor profile by user ID, eagerly loading all related verification data.
   * @param userId - The user ID associated with the doctor.
   * @returns DoctorProfile or null if not found.
   */
  async findByUserId(userId: string): Promise<DoctorProfile | null> {
    return this.doctorProfileRepository.findOne({
      where: { userId },
      relations: ['medicalCouncilVerification', 'kycVerification', 'digilockerVerification'],
    });
  }

  /**
   * Updates the overall verification status of a doctor.
   * @param userId - The user ID of the doctor.
   * @param status - The new overall verification status.
   * @param adminNotes - Optional notes from admin, updates existing notes or sets new.
   * @throws NotFoundException if the doctor profile is not found.
   */
  async updateOverallVerificationStatus(
    userId: string,
    status: DoctorVerificationStatus,
    adminNotes?: string,
  ): Promise<void> {
    const profile = await this.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException(`Doctor profile for user ID ${userId} not found.`);
    }
    profile.overallVerificationStatus = status;
    profile.adminNotes = adminNotes !== undefined ? adminNotes : profile.adminNotes; // Update only if provided
    await this.doctorProfileRepository.save(profile);
    this.logger.log(`Doctor ${userId} overall verification status updated to: ${status}`);
  }

  /**
   * Updates medical council verification status and related data.
   * Creates a new MedicalCouncilVerification entity if one doesn't exist for the profile.
   * @param userId - The user ID of the doctor.
   * @param status - New NMC status.
   * @param data - API response data to store.
   * @param errorMessage - Error message if verification failed.
   * @throws NotFoundException if the doctor profile is not found.
   */
  async updateNmcVerification(
    userId: string,
    status: NmcStatus,
    data?: Record<string, any> | null, // Allow null for data
    errorMessage?: string | null, // Allow null for error message
  ): Promise<void> {
    const profile = await this.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException(`Doctor profile for user ID ${userId} not found.`);
    }

    let nmcVerification = profile.medicalCouncilVerification;
    if (!nmcVerification) {
      nmcVerification = this.doctorProfileRepository.manager.create(MedicalCouncilVerification, { userId });
      profile.medicalCouncilVerification = nmcVerification;
    }

    nmcVerification.status = status;
    nmcVerification.apiResponseData = data || null;
    nmcVerification.errorMessage = errorMessage || null;
    nmcVerification.regNoAtAttempt = profile.medicalCouncilRegNo;

    if (status === NmcStatus.VERIFIED && data) {
      nmcVerification.verifiedName = data.name || null;
      nmcVerification.verifiedSpecialization = data.specialization || null;
      nmcVerification.verifiedCouncil = data.council || null;
      // Also update main DoctorProfile fields if NMC data is authoritative
      profile.fullName = data.name || profile.fullName;
      profile.specialization = data.specialization || profile.specialization;
    }

    await this.doctorProfileRepository.save(profile);
    this.logger.log(`Doctor ${userId} NMC verification status updated to: ${status}`);
  }

  /**
   * Updates KYC verification status and related data.
   * Creates a new KycVerification entity if one doesn't exist for the profile.
   * @param userId - The user ID of the doctor.
   * @param status - New KYC status.
   * @param data - API response data to store.
   * @param errorMessage - Error message if verification failed.
   * @throws NotFoundException if the doctor profile is not found.
   */
  async updateKycVerification(
    userId: string,
    status: KycStatus,
    data?: Record<string, any> | null, // Allow null for data
    errorMessage?: string | null, // Allow null for error message
  ): Promise<void> {
    const profile = await this.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException(`Doctor profile for user ID ${userId} not found.`);
    }

    let kycVerification = profile.kycVerification;
    if (!kycVerification) {
      kycVerification = this.doctorProfileRepository.manager.create(KycVerification, { userId });
      profile.kycVerification = kycVerification;
    }

    kycVerification.status = status;
    kycVerification.apiResponseData = data || null;
    kycVerification.errorMessage = errorMessage || null;

    if (status === KycStatus.VERIFIED && data) {
      kycVerification.verifiedIdType = data.idType || null;
      kycVerification.verifiedIdNumber = data.idNumber || null;
      kycVerification.faceMatchScore = data.faceMatchScore || null;
      kycVerification.livenessDetected = data.livenessDetected || null;
      // Update profile picture if KYC provides a verified one
      profile.profilePictureUrl = data.profilePictureUrl || profile.profilePictureUrl;
    }

    await this.doctorProfileRepository.save(profile);
    this.logger.log(`Doctor ${userId} KYC verification status updated to: ${status}`);
  }

  /**
   * Updates DigiLocker verification status and stores fetched document data.
   * Creates a new DigiLockerVerification entity if one doesn't exist for the profile.
   * @param userId - The user ID of the doctor.
   * @param status - New DigiLocker status.
   * @param documentData - Parsed document data (e.g., Aadhaar, Medical Degree).
   * @param rawApiResponse - Raw API response from DigiLocker.
   * @param errorMessage - Error message if verification failed.
   * @throws NotFoundException if the doctor profile is not found.
   */
  async updateDigiLockerVerification(
    userId: string,
    status: DigiLockerStatus,
    documentData?: { aadhaar?: Record<string, any>; medicalDegree?: Record<string, any> } | null, // Allow null for documentData
    rawApiResponse?: Record<string, any> | null, // Allow null for rawApiResponse
    errorMessage?: string | null, // Allow null for error message
  ): Promise<void> {
    const profile = await this.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException(`Doctor profile for user ID ${userId} not found.`);
    }

    let digilockerVerification = profile.digilockerVerification;
    if (!digilockerVerification) {
      digilockerVerification = this.doctorProfileRepository.manager.create(DigiLockerVerification, { userId });
      profile.digilockerVerification = digilockerVerification;
    }

    digilockerVerification.status = status;
    digilockerVerification.aadhaarData = documentData?.aadhaar || null;
    digilockerVerification.medicalDegreeData = documentData?.medicalDegree || null;
    digilockerVerification.rawApiResponse = rawApiResponse || null;
    digilockerVerification.errorMessage = errorMessage || null;

    // If DigiLocker is connected and provides data, update DoctorProfile fields
    if (status === DigiLockerStatus.CONNECTED && documentData) {
      if (documentData.aadhaar) {
        profile.fullName = documentData.aadhaar.name || profile.fullName;
        profile.contactNumber = documentData.aadhaar.mobile || profile.contactNumber;
      }
      if (documentData.medicalDegree) {
        profile.educationDetails = profile.educationDetails || []; // Ensure it's an array
        const newDegree = {
          degree: documentData.medicalDegree.degree || 'Unknown Degree',
          university: documentData.medicalDegree.university || 'Unknown University',
          year: documentData.medicalDegree.year || null,
        };
        // Prevent duplicates if already added based on degree and university
        const degreeExists = profile.educationDetails.some(
          (edu) => edu.degree === newDegree.degree && edu.university === newDegree.university
        );
        if (!degreeExists) {
          profile.educationDetails.push(newDegree);
        }
      }
    }

    await this.doctorProfileRepository.save(profile);
    this.logger.log(`Doctor ${userId} DigiLocker verification status updated to: ${status}`);
  }
}