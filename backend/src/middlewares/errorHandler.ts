import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ApiResponse, BusinessErrorCode } from '../types';

// Custom error class for business logic errors
export class AppError extends Error {
  public statusCode: number;
  public errorCode: BusinessErrorCode | number;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: BusinessErrorCode | number = 0,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Validation error
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 0, true);
  }
}

// Bad request error
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request') {
    super(message, 400, 0, true);
  }
}

// Not found error
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', errorCode: BusinessErrorCode | number = 0) {
    super(message, 404, errorCode, true);
  }
}

// Unauthorized error
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 0, true);
  }
}

// Forbidden error
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 0, true);
  }
}

// Business logic error
export class BusinessError extends AppError {
  constructor(message: string, errorCode: BusinessErrorCode) {
    super(message, 422, errorCode, true);
  }
}

// Error handler middleware
export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Default error values
  let statusCode = 500;
  let errorCode = 0;
  let message = 'Internal server error';
  let isOperational = false;

  // Handle AppError instances
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.errorCode;
    message = err.message;
    isOperational = err.isOperational;
  } else if (err instanceof SyntaxError && 'body' in err) {
    // Handle JSON parse errors
    statusCode = 400;
    message = 'Invalid JSON in request body';
    isOperational = true;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    isOperational = true;
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    isOperational = true;
  }

  // Log error
  if (!isOperational) {
    logger.error('Unhandled error', {
      message: err.message,
      stack: err.stack,
      statusCode,
    });
  } else {
    logger.warn('Operational error', {
      message: err.message,
      statusCode,
      errorCode,
    });
  }

  // Send response
  const response: ApiResponse = {
    success: false,
    error: {
      code: errorCode,
      message: process.env.NODE_ENV === 'production' && !isOperational ? 'Internal server error' : message,
    },
  };

  res.status(statusCode).json(response);
};

// Async handler wrapper to catch async errors
export const asyncHandler = <T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
