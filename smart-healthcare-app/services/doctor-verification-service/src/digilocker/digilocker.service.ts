// services/doctor-verification-service/src/digilocker/digilocker.service.ts
import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class DigiLockerService {
  private readonly logger = new Logger(DigiLockerService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly authUrl = 'https://api.digilocker.gov.in/public/oauth2/1/authorize';
  private readonly tokenUrl = 'https://api.digilocker.gov.in/public/oauth2/1/token';
  private readonly pullUri = 'https://api.digilocker.gov.in/public/oauth2/1/pull'; // Base for fetching documents

  constructor(private configService: ConfigService) {
    const digilockerConfig = this.configService.get('externalApis.digilocker');
    if (!digilockerConfig || !digilockerConfig.clientId || !digilockerConfig.clientSecret || !digilockerConfig.redirectUri) {
      this.logger.error('DigiLocker API configuration is missing or incomplete. Please check .env and config files.');
      throw new InternalServerErrorException('DigiLocker API configuration is missing. Cannot proceed with integration.');
    }
    this.clientId = digilockerConfig.clientId;
    this.clientSecret = digilockerConfig.clientSecret;
    this.redirectUri = digilockerConfig.redirectUri;
  }

  /**
   * Generates the DigiLocker authorization URL.
   * This URL should be provided to the frontend for redirection.
   * @param userId - User ID to include in the state parameter for CSRF protection.
   * @returns The authorization URL.
   */
  getAuthorizationUrl(userId: string): string {
    const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state: state,
      // scope: 'profile,documents', // Specify required scopes (e.g., for Aadhaar, Driving License, etc.)
      // Always consult DigiLocker API documentation for required scopes and parameters.
      // Example scopes for Aadhaar and educational certificates: "profile:aadhaar,doc:education:degree_certificate"
    });
    return `${this.authUrl}?${params.toString()}`;
  }

  /**
   * Exchanges the authorization code for an access token and fetches user details/documents.
   * @param code - Authorization code received from DigiLocker callback.
   * @param state - State parameter received from DigiLocker callback.
   * @returns Decoded user ID and fetched document data.
   */
  async handleCallback(code: string, state: string): Promise<{ userId: string; documentData: any; rawApiResponse: any }> {
    let decodedState: { userId: string; timestamp: number };
    try {
      decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
      if (!decodedState.userId || !decodedState.timestamp || (Date.now() - decodedState.timestamp) > 300000) { // 5 min expiry
        throw new BadRequestException('Invalid or expired state parameter.');
      }
    } catch (e: any) {
      this.logger.error(`Invalid state parameter: ${state}, Error: ${e.message}`, e.stack);
      throw new BadRequestException('Invalid state parameter.');
    }

    let rawApiResponse: any = {};
    try {
      // 1. Exchange authorization code for access token
      const tokenResponse = await axios.post(this.tokenUrl, new URLSearchParams({
        code: code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }).toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const accessToken = tokenResponse.data.access_token;
      rawApiResponse.tokenResponse = tokenResponse.data;

      if (!accessToken) {
        throw new InternalServerErrorException('Failed to obtain DigiLocker access token.');
      }
      this.logger.log(`DigiLocker access token obtained for user: ${decodedState.userId}`);

      // 2. Use access token to pull documents
      // IMPORTANT: The exact endpoints and required parameters for pulling documents
      // depend heavily on the specific DigiLocker API version and the type of document.
      // You MUST consult the official DigiLocker developer documentation for this.
      // The examples below are illustrative.

      let aadhaarData = null;
      try {
        // Example: Fetching Aadhaar data (illustrative endpoint/method)
        const aadhaarResponse = await axios.get(`${this.pullUri}/aadhaar`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        });
        aadhaarData = aadhaarResponse.data;
        rawApiResponse.aadhaarResponse = aadhaarResponse.data;
        this.logger.log(`Aadhaar data fetched for user: ${decodedState.userId}`);
      } catch (aadhaarError: any) {
        this.logger.warn(`Failed to fetch Aadhaar from DigiLocker for ${decodedState.userId}: ${aadhaarError.message}`);
        rawApiResponse.aadhaarError = aadhaarError.response?.data || aadhaarError.message;
      }

      let medicalDegreeData = null;
      try {
        // Example: Fetching a Medical Degree certificate (illustrative endpoint/method)
        // You would need the specific document URI or a search mechanism provided by DigiLocker.
        const medicalDegreeResponse = await axios.get(`${this.pullUri}/medical_degree_certificate`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        });
        medicalDegreeData = medicalDegreeResponse.data;
        rawApiResponse.medicalDegreeResponse = medicalDegreeResponse.data;
        this.logger.log(`Medical Degree data fetched for user: ${decodedState.userId}`);
      } catch (medicalDegreeError: any) {
        this.logger.warn(`Failed to fetch Medical Degree from DigiLocker for ${decodedState.userId}: ${medicalDegreeError.message}`);
        rawApiResponse.medicalDegreeError = medicalDegreeError.response?.data || medicalDegreeError.message;
      }

      const documentData = {
        aadhaar: aadhaarData,
        medicalDegree: medicalDegreeData,
        // Combine all fetched documents
      };

      this.logger.log(`DigiLocker documents fetching process completed for user: ${decodedState.userId}`);

      return { userId: decodedState.userId, documentData: documentData, rawApiResponse: rawApiResponse };

    } catch (error: any) {
      this.logger.error(`Error during DigiLocker callback for user ${decodedState.userId}: ${error.message}`, error.stack);
      rawApiResponse.finalError = error.response?.data || error.message;
      throw new InternalServerErrorException(`DigiLocker integration failed: ${error.message}`);
    }
  }
}