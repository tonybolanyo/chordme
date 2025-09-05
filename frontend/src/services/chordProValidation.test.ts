/**
 * Tests for ChordPro validation service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  ChordProValidator,
  ValidationPresets,
  defaultValidator
} from './chordProValidation';

describe('ChordProValidator', () => {
  let validator: ChordProValidator;

  beforeEach(() => {
    validator = new ChordProValidator();
  });

  describe('isValidChord', () => {
    it('validates basic major chords', () => {
      expect(validator.isValidChord('C')).toBe(true);
      expect(validator.isValidChord('D')).toBe(true);
      expect(validator.isValidChord('G')).toBe(true);
    });

    it('validates minor chords', () => {
      expect(validator.isValidChord('Am')).toBe(true);
      expect(validator.isValidChord('Dm')).toBe(true);
      expect(validator.isValidChord('Em')).toBe(true);
    });

    it('validates sharp and flat chords', () => {
      expect(validator.isValidChord('F#')).toBe(true);
      expect(validator.isValidChord('Bb')).toBe(true);
      expect(validator.isValidChord('C#m')).toBe(true);
    });

    it('validates extended chords', () => {
      expect(validator.isValidChord('Cmaj7')).toBe(true);
      expect(validator.isValidChord('Dm7')).toBe(true);
      expect(validator.isValidChord('Gsus4')).toBe(true);
    });

    it('validates slash chords', () => {
      expect(validator.isValidChord('C/E')).toBe(true);
      expect(validator.isValidChord('Am/C')).toBe(true);
    });

    it('rejects invalid chords', () => {
      expect(validator.isValidChord('')).toBe(false);
      expect(validator.isValidChord('H')).toBe(false); // Invalid note
      expect(validator.isValidChord('c')).toBe(false); // Lowercase
      expect(validator.isValidChord('123')).toBe(false); // Numbers only
      expect(validator.isValidChord('X')).toBe(false); // Invalid note
    });
  });

  describe('isValidDirective', () => {
    it('validates basic directives', () => {
      expect(validator.isValidDirective('{title: Test Song}')).toBe(true);
      expect(validator.isValidDirective('{artist: Test Artist}')).toBe(true);
      expect(validator.isValidDirective('{comment}')).toBe(true);
    });

    it('rejects invalid directives', () => {
      expect(validator.isValidDirective('')).toBe(false);
      expect(validator.isValidDirective('title: Test')).toBe(false); // Missing braces
      expect(validator.isValidDirective('{title')).toBe(false); // Missing closing brace
      expect(validator.isValidDirective('title}')).toBe(false); // Missing opening brace
    });
  });

  describe('validateContent', () => {
    it('validates correct ChordPro content', () => {
      const content = `{title: Test Song}
{artist: Test Artist}

[C]Test [G]lyrics [Am]here [F]
{comment: This is valid}`;

      const result = validator.validateContent(content);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects bracket mismatches', () => {
      const content = `{title: Test Song
[C]Test [G lyrics Am] here`;

      const result = validator.validateContent(content);
      expect(result.isValid).toBe(false);
      expect(result.warnings.some(w => w.message.includes('bracket'))).toBe(true);
    });

    it('detects empty elements', () => {
      const content = `{title: Test Song}
{}
[]
[C]Normal chord`;

      const result = validator.validateContent(content);
      expect(result.warnings.some(w => w.message.includes('empty'))).toBe(true);
    });

    it('detects invalid chords', () => {
      const content = `{title: Test Song}
[C]Valid [X]Invalid [G]Valid`;

      const result = validator.validateContent(content);
      expect(result.errors.some(e => e.type === 'chord')).toBe(true);
    });

    it('detects security patterns', () => {
      const content = `{title: Test Song}
<script>alert('bad')</script>
[C]Normal content`;

      const result = validator.validateContent(content);
      expect(result.errors.some(e => e.type === 'security')).toBe(true);
    });

    it('detects common typos in strict mode', () => {
      const strictValidator = new ChordProValidator({ strictMode: true, checkTypos: true });
      const content = `{titel: Test Song}
{artis: Test Artist}`;

      const result = strictValidator.validateContent(content);
      expect(result.warnings.some(w => w.message.includes('typo'))).toBe(true);
    });
  });

  describe('configuration', () => {
    it('updates configuration correctly', () => {
      validator.updateConfig({ strictMode: true });
      expect(validator.getConfig().strictMode).toBe(true);
    });

    it('applies validation presets', () => {
      const strictValidator = new ChordProValidator(ValidationPresets.strict);
      expect(strictValidator.getConfig().strictMode).toBe(true);
      expect(strictValidator.getConfig().maxSpecialCharPercent).toBe(0.05);

      const relaxedValidator = new ChordProValidator(ValidationPresets.relaxed);
      expect(relaxedValidator.getConfig().strictMode).toBe(false);
      expect(relaxedValidator.getConfig().maxSpecialCharPercent).toBe(0.2);
    });
  });

  describe('error positioning', () => {
    it('provides correct line and column positions', () => {
      const content = `{title: Test}
[X]Invalid chord
{artist: Test}`;

      const result = validator.validateContent(content);
      const chordError = result.errors.find(e => e.type === 'chord');
      
      expect(chordError).toBeTruthy();
      expect(chordError?.position.line).toBe(2);
      expect(chordError?.position.column).toBe(2); // Position after opening bracket
    });

    it('handles multiline content correctly', () => {
      const content = `Line 1
Line 2
[Invalid] on line 3`;

      const result = validator.validateContent(content);
      const error = result.errors[0];
      
      expect(error.position.line).toBe(3);
    });
  });

  describe('custom rules', () => {
    it('applies custom validation rules', () => {
      const customValidator = new ChordProValidator({
        customRules: [{
          id: 'no-capitals',
          name: 'No Capital Letters',
          description: 'Disallow capital letters in lyrics',
          pattern: /[A-Z]/g,
          severity: 'warning',
          category: 'format',
          message: 'Capital letters found in content',
          enabled: true
        }]
      });

      const content = `{title: Test}
This Has CAPITALS`;

      const result = customValidator.validateContent(content);
      expect(result.warnings.some(w => w.message.includes('Capital'))).toBe(true);
    });
  });
});

describe('defaultValidator', () => {
  it('is properly configured', () => {
    expect(defaultValidator).toBeInstanceOf(ChordProValidator);
    expect(defaultValidator.getConfig().strictMode).toBe(false);
    expect(defaultValidator.getConfig().checkSecurity).toBe(true);
  });
});

describe('ValidationPresets', () => {
  it('provides different configuration presets', () => {
    expect(ValidationPresets.strict.strictMode).toBe(true);
    expect(ValidationPresets.relaxed.strictMode).toBe(false);
    expect(ValidationPresets.minimal.checkSecurity).toBe(false);
  });
});