import { Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { config } from '../config';
import { AuthenticatedRequest } from '../types';
import { UnauthorizedError } from './errorHandler';

interface JwtPayload {
  userId: string;
  openid?: string;
  iat?: number;
  exp?: number;
}

// Generate JWT token
export const generateToken = (payload: { userId: string; openid?: string }): string => {
  const options: SignOptions = {
    expiresIn: config.jwt.expiresIn as StringValue,
  };
  return jwt.sign(payload, config.jwt.secret, options);
};

// Verify JWT token
export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
};

// Authentication middleware
export const authenticate = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('No authorization header provided');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedError('Invalid authorization header format');
    }

    const token = parts[1];
    const decoded = verifyToken(token);

    req.user = {
      userId: decoded.userId,
      openid: decoded.openid,
    };

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else {
      next(new UnauthorizedError('Authentication failed'));
    }
  }
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const token = parts[1];
        const decoded = verifyToken(token);
        req.user = {
          userId: decoded.userId,
          openid: decoded.openid,
        };
      }
    }

    next();
  } catch {
    // Silently continue without user info
    next();
  }
};
