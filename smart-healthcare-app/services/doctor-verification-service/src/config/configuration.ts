// services/doctor-verification-service/src/config/configuration.ts
export default () => ({
  // Application settings
  port: parseInt(process.env.PORT_DOCTOR_VERIFICATION || '3002', 10),
  appName: process.env.APP_NAME_DOCTOR_VERIFICATION || 'DoctorVerificationService',
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database settings for PostgreSQL (specific to this service)
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    name: process.env.DATABASE_NAME_DOCTOR_VERIFICATION, // Specific DB for this service
  },

  // RabbitMQ configuration for microservice communication
  rabbitmq: {
    url: process.env.RABBITMQ_URL,
    authQueue: process.env.RABBITMQ_AUTH_QUEUE,
    doctorVerificationQueue: process.env.RABBITMQ_DOCTOR_VERIFICATION_QUEUE,
    patientManagementQueue: process.env.RABBITMQ_PATIENT_MANAGEMENT_QUEUE,
    notificationQueue: process.env.RABBITMQ_NOTIFICATION_QUEUE,
  },

  // External API Keys for Doctor Verification
  externalApis: {
    nmc: {
      baseUrl: process.env.NMC_VERIFICATION_API_BASE_URL,
      apiKey: process.env.NMC_VERIFICATION_API_KEY,
    },
    kyc: {
      baseUrl: process.env.KYC_LIVENESS_API_BASE_URL,
      apiKey: process.env.KYC_LIVENESS_API_KEY,
    },
    digilocker: {
      clientId: process.env.DIGILOCKER_CLIENT_ID,
      clientSecret: process.env.DIGILOCKER_CLIENT_SECRET,
      redirectUri: process.env.DIGILOCKER_REDIRECT_URI,
    },
  },
});