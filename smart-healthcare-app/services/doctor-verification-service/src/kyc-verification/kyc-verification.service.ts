// services/doctor-verification-service/src/kyc-verification/kyc-verification.service.ts
import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { KycStatus } from './entities/kyc-verification.entity';

@Injectable()
export class KycVerificationService {
  private readonly logger = new Logger(KycVerificationService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    const kycConfig = this.configService.get('externalApis.kyc');
    if (!kycConfig || !kycConfig.baseUrl || !kycConfig.apiKey) {
      this.logger.error('KYC API configuration is missing or incomplete. Please check .env and config files.');
      throw new InternalServerErrorException('KYC API configuration is missing. Cannot proceed with verification.');
    }

    this.axiosInstance = axios.create({
      baseURL: kycConfig.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${kycConfig.apiKey}`, // Assuming Bearer token
      },
      timeout: 15000, // 15 seconds timeout for image processing
    });
    this.apiKey = kycConfig.apiKey;
  }

  /**
   * Calls an external API for KYC (Face Match & Liveness Detection).
   * Implements exponential backoff for retries.
   * @param selfieImageUrl - URL of the uploaded selfie image.
   * @param idDocumentUrl - URL of the uploaded ID document image.
   * @returns KYC verification result or throws an error.
   */
  async performKycCheck(
    selfieImageUrl: string,
    idDocumentUrl: string,
  ): Promise<{ status: KycStatus; data?: any; errorMessage?: string }> {
    const maxRetries = 3;
    let currentRetry = 0;

    while (currentRetry < maxRetries) {
      try {
        this.logger.log(`Attempting KYC verification (Retry: ${currentRetry + 1}) for selfie: ${selfieImageUrl.substring(0, 30)}...`);
        // The actual request body and response structure depend on the chosen KYC API provider (e.g., iDenfy, AuthBridge).
        // This is a generic placeholder. Replace with the exact API call as per provider's documentation.
        const response = await this.axiosInstance.post('/kyc/check', {
          selfie: selfieImageUrl,
          document: idDocumentUrl,
          // Add other parameters like callback URLs if the provider supports async results
        });

        if (response.data && response.data.status === 'success') {
          // Assuming response.data.result contains faceMatch, liveness, idType, idNumber, etc.
          if (response.data.result.faceMatch && response.data.result.liveness) {
            this.logger.log('KYC verification successful.');
            return { status: KycStatus.VERIFIED, data: response.data.result };
          } else {
            this.logger.warn(`KYC verification failed: ${response.data.message || 'Face match or liveness failed'}`);
            return { status: KycStatus.REJECTED, errorMessage: response.data.message || 'Face match or liveness failed.' };
          }
        } else {
          this.logger.error(`Unexpected KYC API response: ${JSON.stringify(response.data)}`);
          return { status: KycStatus.FAILED, errorMessage: 'Unexpected API response from KYC provider. Please check logs.' };
        }
      } catch (error: any) {
        currentRetry++;
        const delay = Math.pow(2, currentRetry) * 1000;
        this.logger.warn(
          `KYC verification failed (Attempt ${currentRetry}/${maxRetries}). Retrying in ${delay / 1000}s. Error: ${error.message}`,
        );
        if (currentRetry < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          this.logger.error(`KYC verification failed after ${maxRetries} retries. Error: ${error.message}`, error.stack);
          throw new InternalServerErrorException(
            `Failed to perform KYC verification after multiple attempts: ${error.message}. Please check KYC API provider status.`,
          );
        }
      }
    }
    throw new InternalServerErrorException('KYC verification process encountered an unhandled state.');
  }
}