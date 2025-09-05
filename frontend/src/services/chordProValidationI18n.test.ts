/**
 * Test suite for internationalized ChordPro validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { I18nChordProValidator, I18nValidationPresets } from './chordProValidationI18n';

describe('I18nChordProValidator', () => {
  let validator: I18nChordProValidator;

  beforeEach(() => {
    validator = new I18nChordProValidator();
  });

  describe('Language Support', () => {
    it('should support English by default', () => {
      expect(validator.getLanguage()).toBe('en');
    });

    it('should change language correctly', () => {
      validator.setLanguage('es');
      expect(validator.getLanguage()).toBe('es');
    });

    it('should validate Spanish chord notations', () => {
      validator.setLanguage('es');
      
      const content = '[Do] [Re] [Mi] [Fa] [Sol] [La] [Si]';
      const result = validator.validateContent(content);
      
      // Spanish notations should be converted and validated correctly
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate Spanish directive aliases', () => {
      validator.setLanguage('es');
      
      const content = '{titulo: Test Song}\n{artista: Test Artist}\n{coro}\nChorus content\n{fin_coro}';
      const result = validator.validateContent(content);
      
      // Spanish directive aliases should be recognized
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Error Message Translation', () => {
    it('should translate chord error messages', () => {
      const content = '[X] [Y] [Z]'; // Invalid chords
      const result = validator.validateContent(content);
      
      expect(result.errors).toHaveLength(3);
      result.errors.forEach(error => {
        expect(error.message).toContain('Invalid chord notation');
        expect(error.type).toBe('chord');
      });
    });

    it('should translate directive error messages', () => {
      validator.updateConfig({ strictMode: true });
      const content = '{unknown_directive: value}';
      const result = validator.validateContent(content);
      
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('Unknown directive');
      expect(result.warnings[0].type).toBe('directive');
    });

    it('should translate bracket mismatch messages', () => {
      const content = '[C [D] {title: test';
      const result = validator.validateContent(content);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      const bracketWarning = result.warnings.find(w => w.type === 'bracket');
      expect(bracketWarning).toBeDefined();
      expect(bracketWarning?.message).toContain('Mismatched');
    });
  });

  describe('Language-Specific Rules', () => {
    it('should handle Spanish chord notation conversions', () => {
      validator.setLanguage('es');
      
      const testCases = [
        { input: '[Do]', expectedValid: true },
        { input: '[rem]', expectedValid: true },
        { input: '[mim]', expectedValid: true },
        { input: '[Fa#]', expectedValid: true }, // Should convert to F#
        { input: '[Sol7]', expectedValid: true }, // Should convert to G7
      ];

      testCases.forEach(({ input, expectedValid }) => {
        const result = validator.validateContent(input);
        expect(result.isValid).toBe(expectedValid);
      });
    });

    it('should provide Spanish chord corrections', () => {
      validator.setLanguage('es');
      
      const correction = validator.getChordCorrection('do');
      expect(correction).toBe('C');
      
      const correction2 = validator.getChordCorrection('rem');
      expect(correction2).toBe('D');
    });

    it('should handle custom language rules', () => {
      validator.addLanguageRules('es', {
        chordNotations: { 'DoM': 'C', 'ReM': 'D' },
        directiveAliases: { 'custom': 'title' },
        typoCorrections: { 'tittulo': 'title' }
      });

      const content = '[DoM] {custom: test}';
      const result = validator.validateContent(content);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('Performance with Complex Documents', () => {
    it('should handle large documents efficiently', () => {
      const largeContent = `
        {title: Test Song}
        {artist: Test Artist}
        
        ${Array.from({ length: 100 }, (_, i) => `
        {start_of_verse}
        [C]This is verse ${i + 1} [G]with many chords
        [Am]And multiple [F]lines of [C]content
        {end_of_verse}
        
        {start_of_chorus}
        [F]This is the [C]chorus [G]part
        [Am]With more [F]chord [C]progressions
        {end_of_chorus}
        `).join('')}
      `;

      const startTime = Date.now();
      const result = validator.validateContent(largeContent);
      const endTime = Date.now();

      // Should complete within reasonable time (< 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      expect(result.isValid).toBe(true);
    });

    it('should handle documents with many errors efficiently', () => {
      const errorContent = `
        ${Array.from({ length: 50 }, (_, i) => `
        [X${i}] [Y${i}] [Z${i}] {unknown${i}: value}
        `).join('')}
      `;

      const startTime = Date.now();
      const result = validator.validateContent(errorContent);
      const endTime = Date.now();

      // Should complete within reasonable time even with many errors
      expect(endTime - startTime).toBeLessThan(1000);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Validation Presets', () => {
    it('should use Spanish validation preset correctly', () => {
      const spanishValidator = new I18nChordProValidator(I18nValidationPresets.spanish, 'es');
      
      expect(spanishValidator.getConfig().strictMode).toBe(false);
      expect(spanishValidator.getConfig().checkSecurity).toBe(true);
      expect(spanishValidator.getConfig().customRules).toHaveLength(1);
      expect(spanishValidator.getConfig().customRules[0].id).toBe('spanish-chords');
    });
  });

  describe('Security Validation', () => {
    it('should detect dangerous patterns regardless of language', () => {
      const maliciousContent = `
        {title: Test}
        <script>alert('xss')</script>
        [C]Some content
        <iframe src="malicious.com"></iframe>
      `;

      const result = validator.validateContent(maliciousContent);
      
      expect(result.errors.length).toBeGreaterThan(0);
      const securityErrors = result.errors.filter(e => e.type === 'security');
      expect(securityErrors).toHaveLength(2);
    });
  });

  describe('Error Deduplication', () => {
    it('should remove duplicate errors from preprocessing', () => {
      validator.setLanguage('es');
      
      // Content that might generate duplicate errors during preprocessing
      const content = '[Do] [C] {titulo: test} {title: test}';
      const result = validator.validateContent(content);
      
      // Should not have duplicate chord errors
      const chordErrors = result.errors.filter(e => e.type === 'chord');
      expect(chordErrors).toHaveLength(0); // Both should be valid after conversion
    });
  });

  describe('Position Tracking', () => {
    it('should maintain correct error positions after preprocessing', () => {
      validator.setLanguage('es');
      
      const content = '[Do] invalid [X] more content';
      const result = validator.validateContent(content);
      
      const chordError = result.errors.find(e => e.type === 'chord');
      expect(chordError).toBeDefined();
      // Position should point to the X chord, not shifted by preprocessing
      expect(chordError?.position.start).toBe(content.indexOf('[X]') + 1);
    });
  });
});