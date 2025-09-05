/**
 * React hook for managing real-time ChordPro validation with i18n support
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  I18nChordProValidator,
  I18nValidationResult,
  LanguageSpecificRules,
  defaultI18nValidator 
} from '../services/chordProValidationI18n';
import { ValidationConfig, ValidationError } from '../services/chordProValidation';

export interface UseI18nValidationOptions {
  validator?: I18nChordProValidator;
  debounceMs?: number;
  enableRealTime?: boolean;
  onValidationChange?: (result: I18nValidationResult) => void;
  autoDetectLanguage?: boolean;
}

export interface I18nValidationState {
  isValidating: boolean;
  result: I18nValidationResult | null;
  hasErrors: boolean;
  hasWarnings: boolean;
  errorCount: number;
  warningCount: number;
  language: string;
}

export function useI18nChordProValidation(
  content: string,
  options: UseI18nValidationOptions = {}
) {
  const { i18n } = useTranslation();
  
  const {
    validator = defaultI18nValidator,
    debounceMs = 300,
    enableRealTime = true,
    onValidationChange,
    autoDetectLanguage = true
  } = options;

  const [validationState, setValidationState] = useState<I18nValidationState>({
    isValidating: false,
    result: null,
    hasErrors: false,
    hasWarnings: false,
    errorCount: 0,
    warningCount: 0,
    language: i18n.language
  });

  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const previousContentRef = useRef<string>('');
  const previousLanguageRef = useRef<string>(i18n.language);

  // Update validator language when i18n language changes
  useEffect(() => {
    if (autoDetectLanguage && i18n.language !== previousLanguageRef.current) {
      validator.setLanguage(i18n.language);
      setValidationState(prev => ({ ...prev, language: i18n.language }));
      previousLanguageRef.current = i18n.language;
      
      // Re-validate with new language
      if (enableRealTime && content) {
        validateNow();
      }
    }
  }, [i18n.language, autoDetectLanguage, validator, enableRealTime, content]);

  // Perform validation
  const validate = useCallback(
    (contentToValidate: string) => {
      if (!enableRealTime || contentToValidate === previousContentRef.current) {
        return;
      }

      setValidationState(prev => ({ ...prev, isValidating: true }));

      try {
        const result = validator.validateContent(contentToValidate);
        
        const newState: I18nValidationState = {
          isValidating: false,
          result,
          hasErrors: result.errors.length > 0,
          hasWarnings: result.warnings.length > 0,
          errorCount: result.errors.length,
          warningCount: result.warnings.length,
          language: validator.getLanguage()
        };

        setValidationState(newState);
        previousContentRef.current = contentToValidate;
        
        if (onValidationChange) {
          onValidationChange(result);
        }
      } catch (error) {
        console.error('I18n validation error:', error);
        setValidationState(prev => ({ 
          ...prev, 
          isValidating: false,
          result: { isValid: false, errors: [], warnings: [] }
        }));
      }
    },
    [validator, enableRealTime, onValidationChange]
  );

  // Debounced validation effect
  useEffect(() => {
    if (!enableRealTime) {
      return;
    }

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout for validation
    debounceTimeoutRef.current = setTimeout(() => {
      validate(content);
    }, debounceMs);

    // Cleanup timeout on unmount or dependency change
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [content, validate, debounceMs, enableRealTime]);

  // Manual validation trigger
  const validateNow = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    validate(content);
  }, [content, validate]);

  // Get errors at a specific position
  const getErrorsAtPosition = useCallback(
    (position: number): ValidationError[] => {
      if (!validationState.result) {
        return [];
      }

      return [
        ...validationState.result.errors,
        ...validationState.result.warnings
      ].filter(error => 
        position >= error.position.start && position <= error.position.end
      );
    },
    [validationState.result]
  );

  // Get errors in a range
  const getErrorsInRange = useCallback(
    (start: number, end: number): ValidationError[] => {
      if (!validationState.result) {
        return [];
      }

      return [
        ...validationState.result.errors,
        ...validationState.result.warnings
      ].filter(error => 
        (error.position.start >= start && error.position.start <= end) ||
        (error.position.end >= start && error.position.end <= end) ||
        (error.position.start <= start && error.position.end >= end)
      );
    },
    [validationState.result]
  );

  // Get all errors by type
  const getErrorsByType = useCallback(
    (type: ValidationError['type']): ValidationError[] => {
      if (!validationState.result) {
        return [];
      }

      return [
        ...validationState.result.errors,
        ...validationState.result.warnings
      ].filter(error => error.type === type);
    },
    [validationState.result]
  );

  // Get all errors by severity
  const getErrorsBySeverity = useCallback(
    (severity: ValidationError['severity']): ValidationError[] => {
      if (!validationState.result) {
        return [];
      }

      return [
        ...validationState.result.errors,
        ...validationState.result.warnings
      ].filter(error => error.severity === severity);
    },
    [validationState.result]
  );

  // Update validator configuration
  const updateConfig = useCallback(
    (newConfig: Partial<ValidationConfig>) => {
      validator.updateConfig(newConfig);
      // Re-validate with new config
      if (enableRealTime) {
        validateNow();
      }
    },
    [validator, enableRealTime, validateNow]
  );

  // Set validation language manually
  const setLanguage = useCallback(
    (language: string) => {
      validator.setLanguage(language);
      setValidationState(prev => ({ ...prev, language }));
      // Re-validate with new language
      if (enableRealTime) {
        validateNow();
      }
    },
    [validator, enableRealTime, validateNow]
  );

  // Add language-specific rules
  const addLanguageRules = useCallback(
    (language: string, rules: Partial<LanguageSpecificRules>) => {
      validator.addLanguageRules(language, rules);
      // Re-validate if current language matches
      if (validator.getLanguage() === language && enableRealTime) {
        validateNow();
      }
    },
    [validator, enableRealTime, validateNow]
  );

  // Get chord correction for current language
  const getChordCorrection = useCallback(
    (chord: string) => {
      return validator.getChordCorrection(chord);
    },
    [validator]
  );

  return {
    // Validation state
    ...validationState,
    
    // Manual control
    validateNow,
    updateConfig,
    setLanguage,
    addLanguageRules,
    
    // Query helpers
    getErrorsAtPosition,
    getErrorsInRange,
    getErrorsByType,
    getErrorsBySeverity,
    getChordCorrection,
    
    // Configuration
    validator
  };
}

// Hook for internationalized validation configuration management
export function useI18nValidationConfig(initialConfig?: Partial<ValidationConfig>) {
  const { i18n } = useTranslation();
  
  const [config, setConfig] = useState<ValidationConfig>(() => {
    const validator = new I18nChordProValidator(initialConfig, i18n.language);
    return validator.getConfig();
  });

  const [language, setLanguage] = useState(i18n.language);

  const updateConfig = useCallback((newConfig: Partial<ValidationConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  const resetConfig = useCallback(() => {
    const validator = new I18nChordProValidator({}, language);
    setConfig(validator.getConfig());
  }, [language]);

  const updateLanguage = useCallback((newLanguage: string) => {
    setLanguage(newLanguage);
  }, []);

  return {
    config,
    language,
    updateConfig,
    resetConfig,
    updateLanguage
  };
}