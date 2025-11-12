import { validateTimestamp } from '../middleware/validator.ts';

describe('Validator', () => {
  describe('validateTimestamp', () => {
    it('should return true for valid timestamp within 5 minutes', () => {
      const now = Date.now();
      expect(validateTimestamp(now)).toBe(true);
      expect(validateTimestamp(now - 2 * 60 * 1000)).toBe(true); // 2 minutes ago
      expect(validateTimestamp(now + 2 * 60 * 1000)).toBe(true); // 2 minutes from now
    });

    it('should return false for timestamp older than 5 minutes', () => {
      const oldTimestamp = Date.now() - 6 * 60 * 1000; // 6 minutes ago
      expect(validateTimestamp(oldTimestamp)).toBe(false);
    });

    it('should return false for timestamp more than 5 minutes in future', () => {
      const futureTimestamp = Date.now() + 6 * 60 * 1000; // 6 minutes from now
      expect(validateTimestamp(futureTimestamp)).toBe(false);
    });

    it('should return true for undefined timestamp', () => {
      expect(validateTimestamp(undefined)).toBe(true);
    });
  });
});
