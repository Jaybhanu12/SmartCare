// services/user-management-service/src/common/filters/all-exceptions.filter.ts
import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch() // Catches all exceptions
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine HTTP status code
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Extract message from exception
    const message =
      exception instanceof HttpException
        ? (exception.getResponse() as any).message || exception.message
        : 'Internal server error';

    // Construct the error response payload
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: Array.isArray(message) ? message.join(', ') : message, // Handle array of messages from class-validator
      error: exception instanceof HttpException ? (exception.getResponse() as any).error || exception.name : 'InternalServerError',
    };

    // Log the error based on severity
    if (status >= 500) {
      this.logger.error(
        `HTTP Status: ${status} - Path: ${request.url} - Message: ${errorResponse.message}`,
        (exception as Error).stack, // Log stack trace for server errors
      );
    } else if (status === HttpStatus.BAD_REQUEST || status === HttpStatus.UNAUTHORIZED || status === HttpStatus.FORBIDDEN) {
      this.logger.warn(
        `HTTP Status: ${status} - Path: ${request.url} - Message: ${errorResponse.message}`,
      );
    } else {
      this.logger.log(
        `HTTP Status: ${status} - Path: ${request.url} - Message: ${errorResponse.message}`,
      );
    }

    // Send the JSON response to the client
    response.status(status).json(errorResponse);
  }
}