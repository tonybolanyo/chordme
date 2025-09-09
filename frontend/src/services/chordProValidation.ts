/**
 * Frontend ChordPro validation service that mirrors backend validation logic
 * Provides real-time validation with error detection and highlighting
 */

import { chordRecognitionEngine } from './chordRecognition';

export interface ValidationError {
  type: 'chord' | 'directive' | 'bracket' | 'syntax' | 'security' | 'format';
  severity: 'error' | 'warning' | 'info';
  message: string;
  position: {
    start: number;
    end: number;
    line: number;
    column: number;
  };
  suggestion?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface ValidationConfig {
  strictMode: boolean;
  checkSecurity: boolean;
  checkBrackets: boolean;
  checkEmptyElements: boolean;
  checkTypos: boolean;
  maxSpecialCharPercent: number;
  customRules: ValidationRule[];
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  pattern: RegExp | string;
  severity: 'error' | 'warning' | 'info';
  category: 'chord' | 'directive' | 'syntax' | 'format';
  message: string;
  enabled: boolean;
}

export class ChordProValidator {
  private config: ValidationConfig;

  // Common ChordPro directives - mirroring backend
  private static readonly COMMON_DIRECTIVES = new Set([
    'title', 'artist', 'album', 'year', 'key', 'capo', 'tempo',
    'time', 'duration', 'comment', 'start_of_verse', 'end_of_verse',
    'start_of_chorus', 'end_of_chorus', 'start_of_bridge', 'end_of_bridge',
    'verse', 'chorus', 'bridge', 'c', 'soc', 'eoc', 'sov', 'eov', 'sob', 'eob'
  ]);

  private static readonly DEFAULT_CONFIG: ValidationConfig = {
    strictMode: false,
    checkSecurity: true,
    checkBrackets: true,
    checkEmptyElements: true,
    checkTypos: true,
    maxSpecialCharPercent: 0.1,
    customRules: []
  };

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = { ...ChordProValidator.DEFAULT_CONFIG, ...config };
  }

  /**
   * Validate ChordPro content and return comprehensive results
   */
  public validateContent(content: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (!content) {
      return { isValid: true, errors: [], warnings: [] };
    }

    // Security validation
    if (this.config.checkSecurity) {
      this.validateSecurity(content, errors, warnings);
    }

    // Bracket validation
    if (this.config.checkBrackets) {
      this.validateBrackets(content, errors, warnings);
    }

    // Empty elements validation
    if (this.config.checkEmptyElements) {
      this.validateEmptyElements(content, errors, warnings);
    }

    // Chord validation
    this.validateChords(content, errors, warnings);

    // Directive validation
    this.validateDirectives(content, errors, warnings);

    // Typo validation
    if (this.config.checkTypos) {
      this.validateTypos(content, errors, warnings);
    }

    // Custom rules validation
    this.validateCustomRules(content, errors, warnings);

    const isValid = errors.length === 0;
    return { isValid, errors, warnings };
  }

  /**
   * Validate chord syntax (enhanced with new chord recognition engine)
   */
  public isValidChord(chord: string): boolean {
    if (!chord.trim()) {
      return false;
    }

    // Use enhanced chord recognition engine for improved validation
    // Fall back to original pattern for backward compatibility
    try {
      // Use imported recognition engine
      return chordRecognitionEngine.isValidChord(chord.trim());
    } catch (error) {
      // Fallback to original regex pattern if enhanced engine fails
      const chordPattern = /^[A-G][#b]?[mM]?(?:maj|min|dim|aug|sus|add)?[0-9]*(?:[#b]?[0-9]*)?(?:\/[A-G][#b]?)?$/;
      return chordPattern.test(chord.trim());
    }
  }

  /**
   * Validate directive syntax (mirrors backend pattern)
   */
  public isValidDirective(directive: string): boolean {
    if (!directive.trim()) {
      return false;
    }

    // Basic directive pattern: {directive: value} or {directive}
    const directivePattern = /^\{[^}]+\}$/;
    return directivePattern.test(directive.trim());
  }

  /**
   * Security validation - check for dangerous patterns
   */
  private validateSecurity(content: string, errors: ValidationError[], warnings: ValidationError[]): void {
    const dangerousPatterns = [
      { pattern: /<script[^>]*>/gi, message: 'Script tags are not allowed' },
      { pattern: /javascript:/gi, message: 'JavaScript protocol is not allowed' },
      { pattern: /on\w+\s*=/gi, message: 'Event handlers are not allowed' },
      { pattern: /<iframe[^>]*>/gi, message: 'Iframe tags are not allowed' },
      { pattern: /<object[^>]*>/gi, message: 'Object tags are not allowed' },
      { pattern: /<embed[^>]*>/gi, message: 'Embed tags are not allowed' },
    ];

    dangerousPatterns.forEach(({ pattern, message }) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const position = this.getPosition(content, match.index);
        errors.push({
          type: 'security',
          severity: 'error',
          message,
          position: {
            start: match.index,
            end: match.index + match[0].length,
            line: position.line,
            column: position.column
          }
        });
      }
    });

    // Check for excessive special characters
    const specialCharCount = (content.match(/[<>&"']/g) || []).length;
    if (specialCharCount > content.length * this.config.maxSpecialCharPercent) {
      warnings.push({
        type: 'security',
        severity: 'warning',
        message: 'High concentration of special characters detected',
        position: { start: 0, end: content.length, line: 1, column: 1 }
      });
    }
  }

  /**
   * Validate bracket matching for chords and directives
   */
  private validateBrackets(content: string, errors: ValidationError[], warnings: ValidationError[]): void {
    // Check directive brackets
    const openDirectives = (content.match(/\{/g) || []).length;
    const closeDirectives = (content.match(/\}/g) || []).length;
    
    if (openDirectives !== closeDirectives) {
      warnings.push({
        type: 'bracket',
        severity: 'warning',
        message: `Mismatched directive brackets: ${openDirectives} opening, ${closeDirectives} closing`,
        position: { start: 0, end: content.length, line: 1, column: 1 }
      });
    }

    // Check chord brackets
    const openChords = (content.match(/\[/g) || []).length;
    const closeChords = (content.match(/\]/g) || []).length;
    
    if (openChords !== closeChords) {
      warnings.push({
        type: 'bracket',
        severity: 'warning',
        message: `Mismatched chord brackets: ${openChords} opening, ${closeChords} closing`,
        position: { start: 0, end: content.length, line: 1, column: 1 }
      });
    }
  }

  /**
   * Validate empty elements
   */
  private validateEmptyElements(content: string, errors: ValidationError[], warnings: ValidationError[]): void {
    // Check for empty directives
    const emptyDirectivePattern = /\{\s*\}/g;
    let match;
    while ((match = emptyDirectivePattern.exec(content)) !== null) {
      const position = this.getPosition(content, match.index);
      warnings.push({
        type: 'format',
        severity: 'warning',
        message: 'Found empty directive {}',
        position: {
          start: match.index,
          end: match.index + match[0].length,
          line: position.line,
          column: position.column
        }
      });
    }

    // Check for empty chords
    const emptyChordPattern = /\[\s*\]/g;
    while ((match = emptyChordPattern.exec(content)) !== null) {
      const position = this.getPosition(content, match.index);
      warnings.push({
        type: 'format',
        severity: 'warning',
        message: 'Found empty chord notation []',
        position: {
          start: match.index,
          end: match.index + match[0].length,
          line: position.line,
          column: position.column
        }
      });
    }
  }

  /**
   * Validate all chords in content
   */
  private validateChords(content: string, errors: ValidationError[], warnings: ValidationError[]): void {
    const chordPattern = /\[([^\]]+)\]/g;
    let match;
    
    while ((match = chordPattern.exec(content)) !== null) {
      const chordName = match[1].trim();
      
      if (!this.isValidChord(chordName)) {
        const position = this.getPosition(content, match.index + 1); // +1 to skip opening bracket
        errors.push({
          type: 'chord',
          severity: 'error',
          message: `Invalid chord notation: "${chordName}"`,
          position: {
            start: match.index + 1,
            end: match.index + 1 + chordName.length,
            line: position.line,
            column: position.column
          },
          suggestion: this.suggestChordCorrection(chordName)
        });
      }
    }
  }

  /**
   * Validate all directives in content
   */
  private validateDirectives(content: string, errors: ValidationError[], warnings: ValidationError[]): void {
    const directivePattern = /\{([^}]+)\}/g;
    let match;
    
    while ((match = directivePattern.exec(content)) !== null) {
      const directiveContent = match[1].trim();
      
      // Check if directive has proper format
      const directiveName = directiveContent.split(':')[0].trim().toLowerCase();
      
      if (this.config.strictMode && !ChordProValidator.COMMON_DIRECTIVES.has(directiveName)) {
        const position = this.getPosition(content, match.index + 1);
        warnings.push({
          type: 'directive',
          severity: 'warning',
          message: `Unknown directive: "${directiveName}"`,
          position: {
            start: match.index + 1,
            end: match.index + 1 + directiveContent.length,
            line: position.line,
            column: position.column
          }
        });
      }
    }
  }

  /**
   * Validate for common typos
   */
  private validateTypos(content: string, errors: ValidationError[], warnings: ValidationError[]): void {
    const typoMap = new Map([
      ['titel', 'title'],
      ['artis', 'artist'],
      ['tite', 'title'],
      ['albun', 'album'],
      ['yesr', 'year']
    ]);

    const directivePattern = /\{([^:}]+)/g;
    let match;
    
    while ((match = directivePattern.exec(content)) !== null) {
      const directiveName = match[1].trim().toLowerCase();
      
      if (typoMap.has(directiveName)) {
        const position = this.getPosition(content, match.index + 1);
        warnings.push({
          type: 'directive',
          severity: 'warning',
          message: `Possible typo in directive: "${directiveName}"`,
          position: {
            start: match.index + 1,
            end: match.index + 1 + directiveName.length,
            line: position.line,
            column: position.column
          },
          suggestion: typoMap.get(directiveName)
        });
      }
    }
  }

  /**
   * Validate custom rules
   */
  private validateCustomRules(content: string, errors: ValidationError[], warnings: ValidationError[]): void {
    this.config.customRules.forEach(rule => {
      if (!rule.enabled) return;

      const pattern = typeof rule.pattern === 'string' ? new RegExp(rule.pattern, 'gi') : rule.pattern;
      let match;
      
      while ((match = pattern.exec(content)) !== null) {
        const position = this.getPosition(content, match.index);
        const targetArray = rule.severity === 'error' ? errors : warnings;
        
        targetArray.push({
          type: rule.category,
          severity: rule.severity,
          message: rule.message,
          position: {
            start: match.index,
            end: match.index + match[0].length,
            line: position.line,
            column: position.column
          }
        });
      }
    });
  }

  /**
   * Get line and column position from character index
   */
  private getPosition(content: string, index: number): { line: number; column: number } {
    const lines = content.substring(0, index).split('\n');
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1
    };
  }

  /**
   * Suggest chord correction for invalid chords
   */
  private suggestChordCorrection(chord: string): string | undefined {
    // Simple correction suggestions
    const corrections: Record<string, string> = {
      'c': 'C',
      'd': 'D', 
      'e': 'E',
      'f': 'F',
      'g': 'G',
      'a': 'A',
      'b': 'B',
      'H': 'B', // German notation
      'CB': 'C/B',
      'DC': 'D/C'
    };

    return corrections[chord] || undefined;
  }

  /**
   * Update validation configuration
   */
  public updateConfig(newConfig: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current validation configuration
   */
  public getConfig(): ValidationConfig {
    return { ...this.config };
  }
}

// Default validator instance
export const defaultValidator = new ChordProValidator();

// Validation configuration presets
export const ValidationPresets = {
  strict: {
    strictMode: true,
    checkSecurity: true,
    checkBrackets: true,
    checkEmptyElements: true,
    checkTypos: true,
    maxSpecialCharPercent: 0.05,
    customRules: []
  },
  relaxed: {
    strictMode: false,
    checkSecurity: true,
    checkBrackets: true,
    checkEmptyElements: false,
    checkTypos: false,
    maxSpecialCharPercent: 0.2,
    customRules: []
  },
  minimal: {
    strictMode: false,
    checkSecurity: false,
    checkBrackets: true,
    checkEmptyElements: false,
    checkTypos: false,
    maxSpecialCharPercent: 0.5,
    customRules: []
  }
} as const;