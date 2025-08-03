// services/doctor-verification-service/src/medical-council-verification/nmc-verification.service.ts
import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { NmcStatus } from './entities/medical-council-verification.entity';

@Injectable()
export class NmcVerificationService {
  private readonly logger = new Logger(NmcVerificationService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    const nmcConfig = this.configService.get('externalApis.nmc');
    if (!nmcConfig || !nmcConfig.baseUrl || !nmcConfig.apiKey) {
      this.logger.error('NMC API configuration is missing or incomplete. Please check .env and config files.');
      throw new InternalServerErrorException('NMC API configuration is missing. Cannot proceed with verification.');
    }

    this.axiosInstance = axios.create({
      baseURL: nmcConfig.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': nmcConfig.apiKey, // Assuming API key in header
      },
      timeout: 10000, // 10 seconds timeout
    });
    this.apiKey = nmcConfig.apiKey;
  }

  /**
   * Calls an external API to verify a doctor's medical council registration.
   * Implements exponential backoff for retries.
   * @param medicalCouncilRegNo - The doctor's medical council registration number.
   * @param fullName - The doctor's full name (for cross-verification).
   * @returns Verification result or throws an error.
   */
  async verifyNmcRegistration(
    medicalCouncilRegNo: string,
    fullName: string,
  ): Promise<{ status: NmcStatus; data?: any; errorMessage?: string }> {
    const maxRetries = 3;
    let currentRetry = 0;

    while (currentRetry < maxRetries) {
      try {
        this.logger.log(`Attempting NMC verification for Reg No: ${medicalCouncilRegNo} (Retry: ${currentRetry + 1})`);
        // The actual request body and response structure depend on the chosen NMC API provider (e.g., Surepass, Decentro, IDfy).
        // This is a generic placeholder. Replace with the exact API call as per provider's documentation.
        const response = await this.axiosInstance.post('/verify', {
          registrationNumber: medicalCouncilRegNo,
          name: fullName,
          // Add other required parameters like stateCouncil, yearOfRegistration if the provider needs them
        });

        if (response.data && response.data.status === 'success' && response.data.isVerified) {
          this.logger.log(`NMC verification successful for ${medicalCouncilRegNo}`);
          return { status: NmcStatus.VERIFIED, data: response.data.details };
        } else if (response.data && response.data.status === 'success' && !response.data.isVerified) {
          this.logger.warn(`NMC verification failed for ${medicalCouncilRegNo}: ${response.data.message}`);
          return { status: NmcStatus.REJECTED, errorMessage: response.data.message };
        } else {
          this.logger.error(`Unexpected NMC API response for ${medicalCouncilRegNo}: ${JSON.stringify(response.data)}`);
          return { status: NmcStatus.FAILED, errorMessage: 'Unexpected API response from NMC provider. Please check logs.' };
        }
      } catch (error: any) {
        currentRetry++;
        const delay = Math.pow(2, currentRetry) * 1000;
        this.logger.warn(
          `NMC verification failed for ${medicalCouncilRegNo} (Attempt ${currentRetry}/${maxRetries}). Retrying in ${delay / 1000}s. Error: ${error.message}`,
        );
        if (currentRetry < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          this.logger.error(`NMC verification failed after ${maxRetries} retries for ${medicalCouncilRegNo}. Error: ${error.message}`, error.stack);
          throw new InternalServerErrorException(
            `Failed to verify NMC registration after multiple attempts: ${error.message}. Please check NMC API provider status.`,
          );
        }
      }
    }
    // This line should ideally not be reached if maxRetries logic is sound.
    throw new InternalServerErrorException('NMC verification process encountered an unhandled state.');
  }
}