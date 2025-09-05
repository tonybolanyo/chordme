/**
 * React hook for managing real-time ChordPro validation
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  ChordProValidator, 
  ValidationResult, 
  ValidationConfig, 
  ValidationError,
  defaultValidator 
} from '../services/chordProValidation';

export interface UseValidationOptions {
  validator?: ChordProValidator;
  debounceMs?: number;
  enableRealTime?: boolean;
  onValidationChange?: (result: ValidationResult) => void;
}

export interface ValidationState {
  isValidating: boolean;
  result: ValidationResult | null;
  hasErrors: boolean;
  hasWarnings: boolean;
  errorCount: number;
  warningCount: number;
}

export function useChordProValidation(
  content: string,
  options: UseValidationOptions = {}
) {
  const {
    validator = defaultValidator,
    debounceMs = 300,
    enableRealTime = true,
    onValidationChange
  } = options;

  const [validationState, setValidationState] = useState<ValidationState>({
    isValidating: false,
    result: null,
    hasErrors: false,
    hasWarnings: false,
    errorCount: 0,
    warningCount: 0
  });

  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const previousContentRef = useRef<string>('');

  // Perform validation
  const validate = useCallback(
    (contentToValidate: string) => {
      if (!enableRealTime || contentToValidate === previousContentRef.current) {
        return;
      }

      setValidationState(prev => ({ ...prev, isValidating: true }));

      try {
        const result = validator.validateContent(contentToValidate);
        
        const newState: ValidationState = {
          isValidating: false,
          result,
          hasErrors: result.errors.length > 0,
          hasWarnings: result.warnings.length > 0,
          errorCount: result.errors.length,
          warningCount: result.warnings.length
        };

        setValidationState(newState);
        previousContentRef.current = contentToValidate;
        
        if (onValidationChange) {
          onValidationChange(result);
        }
      } catch (error) {
        console.error('Validation error:', error);
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

  return {
    // Validation state
    ...validationState,
    
    // Manual control
    validateNow,
    updateConfig,
    
    // Query helpers
    getErrorsAtPosition,
    getErrorsInRange,
    getErrorsByType,
    getErrorsBySeverity,
    
    // Configuration
    validator
  };
}

// Hook for validation configuration management
export function useValidationConfig(initialConfig?: Partial<ValidationConfig>) {
  const [config, setConfig] = useState<ValidationConfig>(() => {
    const validator = new ChordProValidator(initialConfig);
    return validator.getConfig();
  });

  const updateConfig = useCallback((newConfig: Partial<ValidationConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  const resetConfig = useCallback(() => {
    const validator = new ChordProValidator();
    setConfig(validator.getConfig());
  }, []);

  return {
    config,
    updateConfig,
    resetConfig
  };
}