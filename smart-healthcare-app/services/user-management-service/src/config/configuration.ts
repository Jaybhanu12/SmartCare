// services/user-management-service/src/config/configuration.ts
export default () => ({
  // Application settings
  port: parseInt(process.env.PORT_USER_MANAGEMENT || '3000', 10),
  appName: process.env.APP_NAME_USER_MANAGEMENT || 'UserManagementService',
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database settings for PostgreSQL
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    name: process.env.DATABASE_NAME_AUTH,
  },

  // JWT configuration for authentication
  jwt: {
    accessTokenSecret: process.env.JWT_ACCESS_TOKEN_SECRET,
    accessTokenExpirationTime: process.env.JWT_ACCESS_TOKEN_EXPIRATION_TIME,
    refreshTokenSecret: process.env.JWT_REFRESH_TOKEN_SECRET,
    refreshTokenExpirationTime: process.env.JWT_REFRESH_TOKEN_EXPIRATION_TIME,
  },

  // Bcrypt salt rounds for password hashing strength
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
  },

  // RabbitMQ configuration for microservice communication
  rabbitmq: {
    url: process.env.RABBITMQ_URL,
    authQueue: process.env.RABBITMQ_AUTH_QUEUE,
    doctorVerificationQueue: process.env.RABBITMQ_DOCTOR_VERIFICATION_QUEUE,
    patientManagementQueue: process.env.RABBITMQ_PATIENT_MANAGEMENT_QUEUE,
    notificationQueue: process.env.RABBITMQ_NOTIFICATION_QUEUE,
  },

  // Redis configuration for OTP storage
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined, // Use undefined if no password
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  otp: {
    expirationSeconds: parseInt(process.env.OTP_EXPIRATION_SECONDS || '300', 10),
  },

  // External API keys (e.g., for OTP services, KYC, etc.)
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