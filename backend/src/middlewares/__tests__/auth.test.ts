import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, optionalAuth, generateToken, verifyToken } from '../auth';
import { AuthenticatedRequest } from '../../types';
import { config } from '../../config';

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Auth Middleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {};
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const payload = { userId: 'user123', openid: 'openid123' };
      const token = generateToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should generate token with only userId', () => {
      const payload = { userId: 'user123' };
      const token = generateToken(payload);

      expect(token).toBeDefined();
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token and return payload', () => {
      const payload = { userId: 'user123', openid: 'openid123' };
      const token = generateToken(payload);
      const decoded = verifyToken(token);

      expect(decoded.userId).toBe('user123');
      expect(decoded.openid).toBe('openid123');
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyToken('invalid.token.here')).toThrow();
    });

    it('should throw error for expired token', () => {
      const expiredToken = jwt.sign({ userId: 'user123' }, config.jwt.secret, { expiresIn: '-1s' });

      expect(() => verifyToken(expiredToken)).toThrow();
    });
  });

  describe('authenticate middleware', () => {
    it('should authenticate valid token and set user on request', () => {
      const payload = { userId: 'user123', openid: 'openid123' };
      const token = generateToken(payload);
      mockRequest.headers = { authorization: `Bearer ${token}` };

      authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.userId).toBe('user123');
      expect(mockRequest.user?.openid).toBe('openid123');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next with error when no authorization header', () => {
      mockRequest.headers = {};

      authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('No authorization header provided');
      expect(error.statusCode).toBe(401);
    });

    it('should call next with error for invalid header format', () => {
      mockRequest.headers = { authorization: 'InvalidFormat token123' };

      authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('Invalid authorization header format');
    });

    it('should call next with error for invalid token', () => {
      mockRequest.headers = { authorization: 'Bearer invalid.token.here' };

      authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('Invalid token');
    });

    it('should call next with error for expired token', () => {
      const expiredToken = jwt.sign({ userId: 'user123' }, config.jwt.secret, { expiresIn: '-1s' });
      mockRequest.headers = { authorization: `Bearer ${expiredToken}` };

      authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('Token expired');
    });
  });

  describe('optionalAuth middleware', () => {
    it('should set user when valid token provided', () => {
      const payload = { userId: 'user123', openid: 'openid123' };
      const token = generateToken(payload);
      mockRequest.headers = { authorization: `Bearer ${token}` };

      optionalAuth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.userId).toBe('user123');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue without user when no authorization header', () => {
      mockRequest.headers = {};

      optionalAuth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue without user when invalid token', () => {
      mockRequest.headers = { authorization: 'Bearer invalid.token' };

      optionalAuth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue without user when invalid header format', () => {
      mockRequest.headers = { authorization: 'InvalidFormat' };

      optionalAuth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});
