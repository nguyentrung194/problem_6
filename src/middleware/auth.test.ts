import { generateToken, authenticateToken, optionalAuth } from '../middleware/auth.ts';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../tests/helpers/mocks.ts';
import jwt from 'jsonwebtoken';

describe('Auth Middleware', () => {
  const originalEnv = process.env.JWT_SECRET;
  const originalExpiration = process.env.JWT_EXPIRATION;
  const TEST_SECRET = 'test-secret-key-for-jwt-tests';

  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET;
    process.env.JWT_EXPIRATION = '1h';
  });

  afterAll(() => {
    if (originalEnv) {
      process.env.JWT_SECRET = originalEnv;
    } else {
      delete process.env.JWT_SECRET;
    }
    if (originalExpiration) {
      process.env.JWT_EXPIRATION = originalExpiration;
    } else {
      delete process.env.JWT_EXPIRATION;
    }
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      // Generate token - it will use the secret from process.env
      const token = generateToken('user123', 'testuser');
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Verify with the same secret
      const decoded = jwt.verify(token, TEST_SECRET) as { userId: string; username: string };
      expect(decoded.userId).toBe('user123');
      expect(decoded.username).toBe('testuser');
    });
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token', () => {
      const token = generateToken('user123', 'testuser');
      const req = createMockRequest({
        headers: {
          authorization: `Bearer ${token}`,
        },
      }) as any;
      const res = createMockResponse();
      const next = createMockNext();

      authenticateToken(req, res as any, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user?.userId).toBe('user123');
      expect(req.user?.username).toBe('testuser');
    });

    it('should reject request without token', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      authenticateToken(req as any, res as any, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid token', () => {
      const req = createMockRequest({
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      authenticateToken(req as any, res as any, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should set user if valid token provided', () => {
      const token = generateToken('user123', 'testuser');
      const req = createMockRequest({
        headers: {
          authorization: `Bearer ${token}`,
        },
      }) as any;
      const res = createMockResponse();
      const next = createMockNext();

      optionalAuth(req, res as any, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user?.userId).toBe('user123');
    });

    it('should continue without user if no token', () => {
      const req = createMockRequest() as any;
      const res = createMockResponse();
      const next = createMockNext();

      optionalAuth(req, res as any, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });

    it('should continue without user if invalid token', () => {
      const req = createMockRequest({
        headers: {
          authorization: 'Bearer invalid-token',
        },
      }) as any;
      const res = createMockResponse();
      const next = createMockNext();

      optionalAuth(req, res as any, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });
  });
});
