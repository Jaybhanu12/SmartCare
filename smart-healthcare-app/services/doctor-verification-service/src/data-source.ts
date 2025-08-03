// services/doctor-verification-service/src/data-source.ts
import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv'; // Keep dotenv here for CLI context

// Import entities for this service's database
import { DoctorProfile } from './doctor-profiles/entities/doctor-profile.entity';
import { MedicalCouncilVerification } from './medical-council-verification/entities/medical-council-verification.entity';
import { KycVerification } from './kyc-verification/entities/kyc-verification.entity';

// Load environment variables for CLI context
// This path needs to be relative to where the CLI command is executed (monorepo root)
config({ path: `./.env.${process.env.NODE_ENV || 'development'}` });

const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME_DOCTOR_VERIFICATION, // Use this service's specific DB name
  entities: [
    DoctorProfile,
    MedicalCouncilVerification,
    KycVerification,
  ],
  migrations: [__dirname + '/migrations/*.ts'],
  synchronize: false, // Always false for migrations in production
  logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
};

export const AppDataSource = new DataSource(dataSourceOptions);