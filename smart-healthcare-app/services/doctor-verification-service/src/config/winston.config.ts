// services/doctor-verification-service/src/config/winston.config.ts
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { WinstonModuleOptions } from 'nest-winston';

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.ms(),
      winston.format.colorize(),
      winston.format.printf(
        ({ level, message, context, timestamp, ms }) =>
          `${timestamp} [${context}] ${level}: ${message} ${ms}`,
      ),
    ),
  }),
  new winston.transports.DailyRotateFile({
    filename: 'logs/application-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    level: 'info',
  }),
  new winston.transports.DailyRotateFile({
    filename: 'logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    level: 'error',
  }),
];

export const winstonModuleOptions: WinstonModuleOptions = {
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.errors({ stack: true }),
  ),
  transports: transports,
};