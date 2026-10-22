import { ZodError } from 'zod';

/**
 * Custom application error class for structured error handling.
 */
export class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code
   * @param {string} [errorCode='INTERNAL_ERROR'] - Normalized application error code
   * @param {any} [details=null] - Additional context/validation details
   */
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 Route Not Found handler.
 */
export function notFoundHandler(req, res, next) {
  next(new AppError(`Endpoint ${req.method} ${req.originalUrl} not found`, 404, 'NOT_FOUND'));
}

/**
 * Centralized error handler middleware.
 */
export function errorHandler(err, req, res, next) {
  // Handle Zod Schema Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
      rule: e.code,
    }));

    return res.status(400).json({
      success: false,
      statusCode: 400,
      errorCode: 'VALIDATION_ERROR',
      message: 'Request payload validation failed',
      errors: formattedErrors,
      timestamp: new Date().toISOString(),
    });
  }

  // Handle Prisma Known Errors
  if (err.code === 'P2002') {
    const target = err.meta?.target ? err.meta.target.join(', ') : 'field';
    return res.status(409).json({
      success: false,
      statusCode: 409,
      errorCode: 'CONFLICT',
      message: `A record with this ${target} already exists`,
      timestamp: new Date().toISOString(),
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      statusCode: 404,
      errorCode: 'NOT_FOUND',
      message: 'Resource not found in database',
      timestamp: new Date().toISOString(),
    });
  }

  // Handle JWT Errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      statusCode: 401,
      errorCode: 'AUTH_INVALID',
      message: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid authentication token',
      timestamp: new Date().toISOString(),
    });
  }

  // Handle AppError (Operational) or Error with statusCode
  if (err instanceof AppError || err.statusCode) {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      statusCode,
      errorCode:
        err.errorCode ||
        (statusCode === 401
          ? 'UNAUTHORIZED'
          : statusCode === 403
          ? 'FORBIDDEN'
          : statusCode === 404
          ? 'NOT_FOUND'
          : 'ERROR'),
      message: err.message,
      details: err.details,
      timestamp: new Date().toISOString(),
    });
  }

  // Unhandled / Internal Server Error
  const isDev = process.env.NODE_ENV === 'development';
  console.error('Unhandled Error:', err);

  return res.status(500).json({
    success: false,
    statusCode: 500,
    errorCode: 'INTERNAL_SERVER_ERROR',
    message: isDev ? err.message : 'An unexpected server error occurred',
    stack: isDev ? err.stack : undefined,
    timestamp: new Date().toISOString(),
  });
}
