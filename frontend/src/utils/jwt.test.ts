import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  decodeJWT, 
  isTokenExpired, 
  getTokenExpiration, 
  isTokenExpiringSoon,
  type JWTPayload 
} from './jwt';

describe('JWT Utilities', () => {
  beforeEach(() => {
    // Mock console.error to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('decodeJWT', () => {
    it('decodes a valid JWT token', () => {
      // Create a valid JWT-like token (header.payload.signature)
      const payload = { sub: '123', email: 'test@example.com', exp: 1234567890 };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${encodedPayload}.signature`;

      const result = decodeJWT(token);
      
      expect(result).toEqual(payload);
    });

    it('handles payload that needs padding', () => {
      // Create payload that will need padding for base64 decoding
      const payload = { sub: '1', exp: 1000 };
      const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, ''); // Remove padding
      const token = `header.${encodedPayload}.signature`;

      const result = decodeJWT(token);
      
      expect(result).toEqual(payload);
    });

    it('returns null for invalid token format', () => {
      const invalidToken = 'not.a.valid.jwt.token';
      
      const result = decodeJWT(invalidToken);
      
      expect(result).toBeNull();
    });

    it('returns null for token with missing parts', () => {
      const incompleteToken = 'header.payload'; // Missing signature
      
      const result = decodeJWT(incompleteToken);
      
      expect(result).toBeNull();
    });

    it('returns null for token with invalid base64 payload', () => {
      const tokenWithInvalidPayload = 'header.invalid-base64!@#.signature';
      
      const result = decodeJWT(tokenWithInvalidPayload);
      
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    it('returns null for token with invalid JSON payload', () => {
      const invalidJson = btoa('{ invalid json }');
      const token = `header.${invalidJson}.signature`;
      
      const result = decodeJWT(token);
      
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    it('handles empty token', () => {
      const result = decodeJWT('');
      
      expect(result).toBeNull();
    });

    it('handles token with extra dots', () => {
      const token = 'part1.part2.part3.part4.part5';
      
      const result = decodeJWT(token);
      
      expect(result).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('returns false for non-expired token', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const payload = { exp: futureExp };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;

      const result = isTokenExpired(token);
      
      expect(result).toBe(false);
    });

    it('returns true for expired token', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const payload = { exp: pastExp };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;

      const result = isTokenExpired(token);
      
      expect(result).toBe(true);
    });

    it('returns true for token without expiration', () => {
      const payload = { sub: '123' }; // No exp field
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;

      const result = isTokenExpired(token);
      
      expect(result).toBe(true);
    });

    it('returns true for invalid token', () => {
      const invalidToken = 'invalid.token';

      const result = isTokenExpired(invalidToken);
      
      expect(result).toBe(true);
    });

    it('returns true for token that expires exactly now', () => {
      const nowExp = Math.floor(Date.now() / 1000) - 1; // 1 second ago to account for timing
      const payload = { exp: nowExp };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;

      const result = isTokenExpired(token);
      
      expect(result).toBe(true);
    });

    it('handles token with non-numeric expiration', () => {
      const payload = { exp: 'not-a-number' };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;

      const result = isTokenExpired(token);
      
      // Should return false for non-numeric expiration (comparison fails)
      expect(result).toBe(false);
    });
  });

  describe('getTokenExpiration', () => {
    it('returns correct Date for valid token', () => {
      const expTimestamp = 1234567890;
      const payload = { exp: expTimestamp };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;

      const result = getTokenExpiration(token);
      
      expect(result).toEqual(new Date(expTimestamp * 1000));
    });

    it('returns null for token without expiration', () => {
      const payload = { sub: '123' }; // No exp field
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;

      const result = getTokenExpiration(token);
      
      expect(result).toBeNull();
    });

    it('returns null for invalid token', () => {
      const invalidToken = 'invalid.token';

      const result = getTokenExpiration(invalidToken);
      
      expect(result).toBeNull();
    });

    it('handles zero expiration timestamp', () => {
      const payload = { exp: 0 };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;

      const result = getTokenExpiration(token);
      
      // Zero timestamp is falsy, so it returns null
      expect(result).toBeNull();
    });

    it('handles very large expiration timestamp', () => {
      const largeExp = 9999999999; // Year 2286
      const payload = { exp: largeExp };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;

      const result = getTokenExpiration(token);
      
      expect(result).toEqual(new Date(largeExp * 1000));
    });
  });

  describe('isTokenExpiringSoon', () => {
    it('returns false for token expiring in the future beyond threshold', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 600; // 10 minutes from now
      const payload = { exp: futureExp };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;

      const result = isTokenExpiringSoon(token, 300); // 5 minute threshold
      
      expect(result).toBe(false);
    });

    it('returns true for token expiring within threshold', () => {
      const soonExp = Math.floor(Date.now() / 1000) + 120; // 2 minutes from now
      const payload = { exp: soonExp };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;

      const result = isTokenExpiringSoon(token, 300); // 5 minute threshold
      
      expect(result).toBe(true);
    });

    it('uses default threshold of 300 seconds', () => {
      const soonExp = Math.floor(Date.now() / 1000) + 200; // ~3 minutes from now
      const payload = { exp: soonExp };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;

      const result = isTokenExpiringSoon(token); // No threshold specified
      
      expect(result).toBe(true);
    });

    it('returns true for already expired token', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const payload = { exp: pastExp };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;

      const result = isTokenExpiringSoon(token);
      
      expect(result).toBe(true);
    });

    it('returns true for token without expiration', () => {
      const payload = { sub: '123' }; // No exp field
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;

      const result = isTokenExpiringSoon(token);
      
      expect(result).toBe(true);
    });

    it('returns true for invalid token', () => {
      const invalidToken = 'invalid.token';

      const result = isTokenExpiringSoon(invalidToken);
      
      expect(result).toBe(true);
    });

    it('handles custom threshold values', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 1800; // 30 minutes from now
      const payload = { exp: futureExp };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;

      // Should not be expiring soon with 60 second threshold
      expect(isTokenExpiringSoon(token, 60)).toBe(false);
      
      // Should be expiring soon with 3600 second (1 hour) threshold
      expect(isTokenExpiringSoon(token, 3600)).toBe(true);
    });

    it('handles zero threshold', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 60; // 1 minute from now
      const payload = { exp: futureExp };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;

      const result = isTokenExpiringSoon(token, 0); // Zero threshold
      
      expect(result).toBe(false);
    });

    it('handles negative threshold', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 60; // 1 minute from now
      const payload = { exp: futureExp };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;

      const result = isTokenExpiringSoon(token, -100); // Negative threshold
      
      expect(result).toBe(false);
    });
  });

  describe('Real-world Scenarios', () => {
    it('handles a realistic JWT token structure', () => {
      const payload: JWTPayload = {
        sub: 'user123',
        email: 'user@example.com',
        iat: Math.floor(Date.now() / 1000) - 300, // Issued 5 minutes ago
        exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
        role: 'user',
        custom_claim: 'some_value'
      };
      
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${encodedPayload}.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c`;

      const decoded = decodeJWT(token);
      expect(decoded).toEqual(payload);
      
      expect(isTokenExpired(token)).toBe(false);
      expect(isTokenExpiringSoon(token, 7200)).toBe(true); // 2 hour threshold
      expect(isTokenExpiringSoon(token, 1800)).toBe(false); // 30 minute threshold
      
      const expiration = getTokenExpiration(token);
      expect(expiration).toEqual(new Date(payload.exp! * 1000));
    });

    it('handles token with minimal payload', () => {
      const payload = { exp: Math.floor(Date.now() / 1000) + 1800 }; // 30 minutes from now
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;

      expect(decodeJWT(token)).toEqual(payload);
      expect(isTokenExpired(token)).toBe(false);
      expect(getTokenExpiration(token)).toEqual(new Date(payload.exp * 1000));
    });

    it('handles timing edge cases', () => {
      // Token expires in exactly 300 seconds (default threshold)
      const exp = Math.floor(Date.now() / 1000) + 300;
      const payload = { exp };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;

      // Should be considered expiring soon when threshold equals remaining time
      expect(isTokenExpiringSoon(token, 300)).toBe(true);
      expect(isTokenExpiringSoon(token, 299)).toBe(false);
    });
  });
});