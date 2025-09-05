/**
 * Internationalized ChordPro validation service
 * Extends the core validation with i18n support and language-specific rules
 */
import { ChordProValidator, ValidationError, ValidationConfig, ValidationRule } from './chordProValidation';
import i18n from '../i18n/config';

export interface I18nValidationError extends Omit<ValidationError, 'message' | 'suggestion'> {
  messageKey: string;
  messageParams: Record<string, string | number>;
  suggestion?: string;
  suggestionKey?: string;
  suggestionParams?: Record<string, string | number>;
}

export interface I18nValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface LanguageSpecificRules {
  chordNotations: {
    [key: string]: string; // mapping from local notation to standard
  };
  directiveAliases: {
    [key: string]: string; // mapping from local directive to standard
  };
  typoCorrections: {
    [key: string]: string; // mapping from common typos to correct form
  };
}

export class I18nChordProValidator extends ChordProValidator {
  private language: string;
  private languageRules: LanguageSpecificRules;

  // Spanish-specific validation rules
  private static readonly SPANISH_RULES: LanguageSpecificRules = {
    chordNotations: {
      'Do': 'C',
      'Re': 'D', 
      'Mi': 'E',
      'Fa': 'F',
      'Sol': 'G',
      'La': 'A',
      'Si': 'B',
      'dom': 'C',
      'rem': 'D',
      'mim': 'E',
      'fam': 'F',
      'solm': 'G',
      'lam': 'A',
      'sim': 'B'
    },
    directiveAliases: {
      'titulo': 'title',
      'artista': 'artist',
      'coro': 'chorus',
      'estrofa': 'verse',
      'puente': 'bridge',
      'comentario': 'comment',
      'inicio_coro': 'start_of_chorus',
      'fin_coro': 'end_of_chorus',
      'inicio_estrofa': 'start_of_verse',
      'fin_estrofa': 'end_of_verse'
    },
    typoCorrections: {
      'titulo': 'title',
      'artis': 'artist',
      'titlo': 'title',
      'aritsta': 'artist',
      'comnentario': 'comment',
      'comentari': 'comment'
    }
  };

  constructor(config: Partial<ValidationConfig> = {}, language?: string) {
    super(config);
    this.language = language || (typeof i18n !== 'undefined' && i18n.language ? i18n.language.split('-')[0] : 'en');
    this.languageRules = this.getLanguageRules(this.language);
  }

  /**
   * Get language-specific validation rules
   */
  private getLanguageRules(language: string): LanguageSpecificRules {
    switch (language) {
      case 'es':
        return I18nChordProValidator.SPANISH_RULES;
      default:
        return {
          chordNotations: {},
          directiveAliases: {},
          typoCorrections: {}
        };
    }
  }

  /**
   * Validate content with internationalization
   */
  public validateContent(content: string): I18nValidationResult {
    // First validate original content
    const originalResult = super.validateContent(content);
    
    // Then preprocess content and validate if language has special rules
    if (Object.keys(this.languageRules.chordNotations).length > 0 || 
        Object.keys(this.languageRules.directiveAliases).length > 0) {
      
      const processedContent = this.preprocessContent(content);
      const processedResult = super.validateContent(processedContent);
      
      // For preprocessed content, we mainly want to catch issues that the original missed
      // But we need to be careful about false positives
      const additionalErrors = processedResult.errors.filter(error => {
        // Only add errors if they represent real improvements
        return !this.hasEquivalentError(originalResult.errors, error);
      });
      
      const additionalWarnings = processedResult.warnings.filter(warning => {
        return !this.hasEquivalentError(originalResult.warnings, warning);
      });
      
      // Combine results, but prefer original positions
      const allErrors = [...originalResult.errors, ...additionalErrors];
      const allWarnings = [...originalResult.warnings, ...additionalWarnings];
      
      const uniqueErrors = this.removeDuplicateErrors(allErrors);
      const uniqueWarnings = this.removeDuplicateErrors(allWarnings);
      
      const translatedErrors = uniqueErrors.map(error => this.translateError(error));
      const translatedWarnings = uniqueWarnings.map(error => this.translateError(error));

      return {
        isValid: translatedErrors.length === 0,
        errors: translatedErrors,
        warnings: translatedWarnings
      };
    } else {
      // No preprocessing needed, just translate messages
      const translatedErrors = originalResult.errors.map(error => this.translateError(error));
      const translatedWarnings = originalResult.warnings.map(error => this.translateError(error));

      return {
        isValid: translatedErrors.length === 0,
        errors: translatedErrors,
        warnings: translatedWarnings
      };
    }
  }

  /**
   * Check if an equivalent error already exists
   */
  private hasEquivalentError(existingErrors: ValidationError[], newError: ValidationError): boolean {
    return existingErrors.some(existing => 
      existing.type === newError.type &&
      Math.abs(existing.position.start - newError.position.start) < 10 && // Allow small position differences
      existing.message.includes(newError.message.split('"')[1] || '') // Check if same element is referenced
    );
  }

  /**
   * Preprocess content to handle language-specific notations
   */
  private preprocessContent(content: string): string {
    let processed = content;

    // Convert language-specific chord notations
    Object.entries(this.languageRules.chordNotations).forEach(([local, standard]) => {
      const pattern = new RegExp(`\\[${local}([^\\]]*)\\]`, 'g');
      processed = processed.replace(pattern, `[${standard}$1]`);
    });

    // Convert language-specific directive aliases
    Object.entries(this.languageRules.directiveAliases).forEach(([local, standard]) => {
      const pattern = new RegExp(`\\{${local}([^}]*)\\}`, 'g');
      processed = processed.replace(pattern, `{${standard}$1}`);
    });

    return processed;
  }

  /**
   * Remove duplicate validation errors
   */
  private removeDuplicateErrors(errors: ValidationError[]): ValidationError[] {
    const seen = new Set<string>();
    return errors.filter(error => {
      const key = `${error.type}-${error.position.start}-${error.position.end}-${error.message}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Translate validation error messages using i18n
   */
  private translateError(error: ValidationError): ValidationError {
    const translatedMessage = this.getTranslatedMessage(error);
    const translatedSuggestion = this.getTranslatedSuggestion(error);

    return {
      ...error,
      message: translatedMessage || error.message,
      suggestion: translatedSuggestion || error.suggestion
    };
  }

  /**
   * Get translated error message
   */
  private getTranslatedMessage(error: ValidationError): string | undefined {
    const ns = 'common';
    
    try {
      switch (error.type) {
        case 'chord':
          if (error.message.includes('Invalid chord notation')) {
            const chordMatch = error.message.match(/"([^"]+)"/);
            const chord = chordMatch ? chordMatch[1] : '';
            return i18n.t('chordProValidation.errors.invalidChord', { 
              chord,
              ns 
            });
          }
          break;

        case 'directive':
          if (error.message.includes('Unknown directive')) {
            const directiveMatch = error.message.match(/"([^"]+)"/);
            const directive = directiveMatch ? directiveMatch[1] : '';
            return i18n.t('chordProValidation.errors.unknownDirective', { 
              directive,
              ns 
            });
          }
          if (error.message.includes('Possible typo')) {
            const typoMatch = error.message.match(/"([^"]+)"/);
            const typo = typoMatch ? typoMatch[1] : '';
            return i18n.t('chordProValidation.errors.typoSuggestion', { 
              typo,
              ns 
            });
          }
          break;

        case 'bracket':
          if (error.message.includes('Mismatched')) {
            const matches = error.message.match(/(\w+) brackets: (\d+) opening, (\d+) closing/);
            if (matches) {
              const [, type, open, close] = matches;
              return i18n.t('chordProValidation.errors.bracketMismatch', { 
                type: type === 'directive' ? i18n.t('chordProValidation.categories.directive', { ns }) : 
                      type === 'chord' ? i18n.t('chordProValidation.categories.chord', { ns }) : type,
                open,
                close,
                ns 
              });
            }
          }
          break;

        case 'format':
          if (error.message.includes('empty directive')) {
            return i18n.t('chordProValidation.errors.emptyDirective', { ns });
          }
          if (error.message.includes('empty chord')) {
            return i18n.t('chordProValidation.errors.emptyChord', { ns });
          }
          break;

        case 'security':
          if (error.message.includes('Script tags')) {
            return i18n.t('chordProValidation.errors.scriptTag', { ns });
          }
          if (error.message.includes('JavaScript protocol')) {
            return i18n.t('chordProValidation.errors.javascript', { ns });
          }
          if (error.message.includes('Event handlers')) {
            return i18n.t('chordProValidation.errors.eventHandler', { ns });
          }
          if (error.message.includes('Iframe tags')) {
            return i18n.t('chordProValidation.errors.iframe', { ns });
          }
          if (error.message.includes('Object tags')) {
            return i18n.t('chordProValidation.errors.object', { ns });
          }
          if (error.message.includes('Embed tags')) {
            return i18n.t('chordProValidation.errors.embed', { ns });
          }
          if (error.message.includes('special characters')) {
            return i18n.t('chordProValidation.errors.specialChars', { ns });
          }
          break;
      }
    } catch (e) {
      console.warn('Failed to translate validation message:', e);
    }

    return undefined;
  }

  /**
   * Get translated suggestion message
   */
  private getTranslatedSuggestion(error: ValidationError): string | undefined {
    if (!error.suggestion) return undefined;

    const ns = 'common';
    
    try {
      // Check if suggestion is a chord correction
      if (error.type === 'chord' && error.suggestion) {
        return i18n.t('chordProValidation.suggestions.useUppercase', { 
          suggestion: error.suggestion,
          ns 
        });
      }

      // Check if suggestion is a directive correction
      if (error.type === 'directive' && error.suggestion) {
        return i18n.t('chordProValidation.suggestions.didYouMean', { 
          suggestion: error.suggestion,
          ns 
        });
      }
    } catch (e) {
      console.warn('Failed to translate validation suggestion:', e);
    }

    return error.suggestion;
  }

  /**
   * Update language and reload rules
   */
  public setLanguage(language: string): void {
    this.language = language;
    this.languageRules = this.getLanguageRules(language);
  }

  /**
   * Get current language
   */
  public getLanguage(): string {
    return this.language;
  }

  /**
   * Add custom language-specific rules
   */
  public addLanguageRules(language: string, rules: Partial<LanguageSpecificRules>): void {
    if (language === this.language) {
      this.languageRules = {
        ...this.languageRules,
        ...rules,
        chordNotations: { ...this.languageRules.chordNotations, ...rules.chordNotations },
        directiveAliases: { ...this.languageRules.directiveAliases, ...rules.directiveAliases },
        typoCorrections: { ...this.languageRules.typoCorrections, ...rules.typoCorrections }
      };
    }
  }

  /**
   * Get language-specific chord correction
   */
  public getChordCorrection(chord: string): string | undefined {
    return this.languageRules.chordNotations[chord] || 
           this.languageRules.typoCorrections[chord] ||
           this.suggestChordCorrection(chord);
  }

  /**
   * Suggest chord correction for invalid chords (protected method from parent)
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
}

// Default internationalized validator instance
export const defaultI18nValidator = new I18nChordProValidator();

// Language-specific validation presets
export const I18nValidationPresets = {
  spanish: {
    strictMode: false,
    checkSecurity: true,
    checkBrackets: true,
    checkEmptyElements: true,
    checkTypos: true,
    maxSpecialCharPercent: 0.1,
    customRules: [
      {
        id: 'spanish-chords',
        name: 'Spanish Chord Notation',
        description: 'Support for Spanish chord notation (Do, Re, Mi, etc.)',
        pattern: /\[(Do|Re|Mi|Fa|Sol|La|Si)[^]]*\]/g,
        severity: 'info' as const,
        category: 'chord' as const,
        message: 'Spanish chord notation detected',
        enabled: true
      }
    ] as ValidationRule[]
  }
} as const;

export type { LanguageSpecificRules, I18nValidationError, I18nValidationResult };