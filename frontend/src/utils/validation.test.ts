import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validateRequired,
} from './validation';

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    it('should pass for valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'first.last+tag@subdomain.example.com',
        'x@y.z',
      ];

      validEmails.forEach((email) => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should fail for invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain',
        'user.domain.com',
        '',
      ];

      invalidEmails.forEach((email) => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should fail for empty or whitespace-only emails', () => {
      const emptyEmails = ['', '   ', '\t', '\n'];

      emptyEmails.forEach((email) => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
        // Allow for different error messages for empty vs whitespace-only
        expect(result.error).toMatch(/required|cannot be empty/i);
      });
    });

    it('should fail for emails that are too long', () => {
      const longEmail = 'a'.repeat(110) + '@example.com'; // 121 characters
      const result = validateEmail(longEmail);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('120 characters');
    });
  });

  describe('validatePassword', () => {
    it('should pass for valid passwords', () => {
      const validPasswords = [
        'MyPassword1!',
        'AnotherValidPass123@',
        'Complex#Password99',
        'StrongPass1$',
      ];

      validPasswords.forEach((password) => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should fail for passwords that are too short', () => {
      const result = validatePassword('Short1!');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('8 characters');
    });

    it('should fail for passwords without uppercase letters', () => {
      const result = validatePassword('lowercase123!');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('uppercase letter');
    });

    it('should fail for passwords without lowercase letters', () => {
      const result = validatePassword('UPPERCASE123!');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('lowercase letter');
    });

    it('should fail for passwords without numbers', () => {
      const result = validatePassword('NoNumbers!');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('number');
    });

    it('should fail for passwords without special characters', () => {
      const result = validatePassword('NoSpecialChars123');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('special character');
    });

    it('should fail for empty passwords', () => {
      const result = validatePassword('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should fail for passwords that are too long', () => {
      const longPassword = 'A1!' + 'a'.repeat(130); // 133 characters
      const result = validatePassword(longPassword);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('128 characters');
    });
  });

  describe('validateRequired', () => {
    it('should pass for non-empty values', () => {
      const validValues = ['test', 'hello world', '123', 'a'];

      validValues.forEach((value) => {
        const result = validateRequired(value, 'TestField');
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should fail for empty or whitespace-only values', () => {
      const emptyValues = ['', '   ', '\t', '\n'];

      emptyValues.forEach((value) => {
        const result = validateRequired(value, 'TestField');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('TestField is required');
      });

      // Test undefined and null separately since they need type casting
      const undefinedResult = validateRequired(
        undefined as unknown as string,
        'TestField'
      );
      expect(undefinedResult.isValid).toBe(false);
      expect(undefinedResult.error).toContain('TestField is required');

      const nullResult = validateRequired(
        null as unknown as string,
        'TestField'
      );
      expect(nullResult.isValid).toBe(false);
      expect(nullResult.error).toContain('TestField is required');
    });

    it('should include field name in error message', () => {
      const result = validateRequired('', 'Username');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Username is required');
    });
  });
});
