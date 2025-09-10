/**
 * Chord Quality Assurance and Validation Service
 * 
 * This service provides comprehensive validation and quality assurance
 * for the expanded chord database, ensuring accuracy and playability.
 */

import {
  ChordDiagram,
  StringPosition,
  ChordDiagramValidationResult,
  ChordDiagramValidationError,
  ChordDiagramValidationWarning,
  DifficultyLevel,
  InstrumentConfig,
  INSTRUMENT_CONFIGS
} from '../types/chordDiagram';

/**
 * Comprehensive chord validation service
 */
export class ChordQualityAssuranceService {
  private instrumentConfig: InstrumentConfig;

  constructor(instrument: keyof typeof INSTRUMENT_CONFIGS = 'guitar') {
    this.instrumentConfig = INSTRUMENT_CONFIGS[instrument];
  }

  /**
   * Validate a chord diagram for quality and accuracy
   */
  validateChordDiagram(chord: ChordDiagram): ChordDiagramValidationResult {
    const errors: ChordDiagramValidationError[] = [];
    const warnings: ChordDiagramValidationWarning[] = [];

    // Basic structure validation
    this.validateBasicStructure(chord, errors);
    
    // String position validation
    this.validateStringPositions(chord.positions, errors, warnings);
    
    // Finger assignment validation
    this.validateFingerAssignments(chord.positions, errors, warnings);
    
    // Barre chord validation
    if (chord.barre) {
      this.validateBarreChord(chord.barre, chord.positions, errors, warnings);
    }
    
    // Physical playability validation
    this.validatePhysicalPlayability(chord.positions, warnings);
    
    // Musical theory validation
    this.validateMusicalTheory(chord, warnings);
    
    // Difficulty assessment validation
    this.validateDifficultyAssessment(chord, warnings);

    const score = this.calculateValidationScore(errors, warnings);
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score
    };
  }

  /**
   * Validate basic chord structure
   */
  private validateBasicStructure(chord: ChordDiagram, errors: ChordDiagramValidationError[]): void {
    if (!chord.name || chord.name.trim() === '') {
      errors.push({
        type: 'missing_required',
        message: 'Chord name is required',
        suggestion: 'Provide a valid chord name (e.g., "C", "Am7", "Fmaj9")'
      });
    }

    if (!chord.positions || chord.positions.length === 0) {
      errors.push({
        type: 'missing_required',
        message: 'Chord positions are required',
        suggestion: 'Provide at least one string position'
      });
    }

    if (chord.positions && chord.positions.length !== this.instrumentConfig.stringCount) {
      errors.push({
        type: 'invalid_string',
        message: `Expected ${this.instrumentConfig.stringCount} string positions, got ${chord.positions.length}`,
        suggestion: `Provide exactly ${this.instrumentConfig.stringCount} string positions for ${this.instrumentConfig.type}`
      });
    }
  }

  /**
   * Validate string positions
   */
  private validateStringPositions(positions: StringPosition[], errors: ChordDiagramValidationError[], warnings: ChordDiagramValidationWarning[]): void {
    const usedStrings = new Set<number>();

    positions.forEach(position => {
      // Check string number validity
      if (position.stringNumber < 1 || position.stringNumber > this.instrumentConfig.stringCount) {
        errors.push({
          type: 'invalid_string',
          message: `Invalid string number: ${position.stringNumber}`,
          stringNumber: position.stringNumber,
          suggestion: `String number must be between 1 and ${this.instrumentConfig.stringCount}`
        });
      }

      // Check for duplicate string assignments
      if (usedStrings.has(position.stringNumber)) {
        errors.push({
          type: 'invalid_string',
          message: `Duplicate string assignment: string ${position.stringNumber}`,
          stringNumber: position.stringNumber,
          suggestion: 'Each string should be assigned only once'
        });
      }
      usedStrings.add(position.stringNumber);

      // Check fret validity
      if (position.fret < -1 || position.fret > this.instrumentConfig.fretRange.max) {
        errors.push({
          type: 'invalid_fret',
          message: `Invalid fret number: ${position.fret}`,
          stringNumber: position.stringNumber,
          fret: position.fret,
          suggestion: `Fret must be between -1 (muted) and ${this.instrumentConfig.fretRange.max}`
        });
      }

      // Warn about high fret positions
      if (position.fret > 12) {
        warnings.push({
          type: 'uncommon_fingering',
          message: `High fret position on string ${position.stringNumber}: fret ${position.fret}`,
          severity: 'medium',
          suggestion: 'Consider if this position is practical for most players'
        });
      }
    });
  }

  /**
   * Validate finger assignments
   */
  private validateFingerAssignments(positions: StringPosition[], errors: ChordDiagramValidationError[], warnings: ChordDiagramValidationWarning[]): void {
    const fingerAssignments = new Map<number, number[]>(); // finger -> frets
    
    positions.forEach(position => {
      // Check finger validity
      if (position.finger < -1 || position.finger > 4) {
        errors.push({
          type: 'invalid_finger',
          message: `Invalid finger assignment: ${position.finger}`,
          stringNumber: position.stringNumber,
          suggestion: 'Finger must be -1 (muted), 0 (open), or 1-4 (fingers)'
        });
        return;
      }

      // Check finger-fret consistency
      if (position.fret === 0 && position.finger !== 0) {
        errors.push({
          type: 'invalid_finger',
          message: `Open string (fret 0) must have finger 0`,
          stringNumber: position.stringNumber,
          fret: position.fret,
          suggestion: 'Set finger to 0 for open strings'
        });
      }

      if (position.fret === -1 && position.finger !== -1) {
        errors.push({
          type: 'invalid_finger',
          message: `Muted string (fret -1) must have finger -1`,
          stringNumber: position.stringNumber,
          fret: position.fret,
          suggestion: 'Set finger to -1 for muted strings'
        });
      }

      if (position.fret > 0 && (position.finger < 1 || position.finger > 4)) {
        errors.push({
          type: 'invalid_finger',
          message: `Fretted string must use finger 1-4`,
          stringNumber: position.stringNumber,
          fret: position.fret,
          suggestion: 'Assign finger 1, 2, 3, or 4 for fretted strings'
        });
      }

      // Track finger assignments for conflict detection
      if (position.finger >= 1 && position.finger <= 4 && !position.isBarre) {
        if (!fingerAssignments.has(position.finger)) {
          fingerAssignments.set(position.finger, []);
        }
        fingerAssignments.get(position.finger)!.push(position.fret);
      }
    });

    // Check for finger conflicts (same finger on different frets, not barre)
    fingerAssignments.forEach((frets, finger) => {
      const uniqueFrets = new Set(frets);
      if (uniqueFrets.size > 1) {
        warnings.push({
          type: 'uncommon_fingering',
          message: `Finger ${finger} assigned to multiple frets: ${Array.from(uniqueFrets).join(', ')}`,
          severity: 'high',
          suggestion: 'Consider if this fingering is physically possible or if a barre is needed'
        });
      }
    });
  }

  /**
   * Validate barre chord structure
   */
  private validateBarreChord(barre: unknown, positions: StringPosition[], errors: ChordDiagramValidationError[], warnings: ChordDiagramValidationWarning[]): void {
    // Check barre fret validity
    if (barre.fret < 1 || barre.fret > this.instrumentConfig.fretRange.max) {
      errors.push({
        type: 'invalid_barre',
        message: `Invalid barre fret: ${barre.fret}`,
        fret: barre.fret,
        suggestion: `Barre fret must be between 1 and ${this.instrumentConfig.fretRange.max}`
      });
    }

    // Check barre string range
    if (barre.startString < 1 || barre.startString > this.instrumentConfig.stringCount ||
        barre.endString < 1 || barre.endString > this.instrumentConfig.stringCount ||
        barre.startString >= barre.endString) {
      errors.push({
        type: 'invalid_barre',
        message: `Invalid barre string range: ${barre.startString}-${barre.endString}`,
        suggestion: 'Barre must span at least 2 strings with valid string numbers'
      });
    }

    // Validate that barre positions match the barre definition
    const barrePositions = positions.filter(p => p.isBarre);
    const expectedBarrePositions = barre.endString - barre.startString + 1;
    
    if (barrePositions.length !== expectedBarrePositions) {
      warnings.push({
        type: 'uncommon_fingering',
        message: `Barre definition mismatch: expected ${expectedBarrePositions} barre positions, found ${barrePositions.length}`,
        severity: 'medium',
        suggestion: 'Ensure all strings in barre range are marked as barre positions'
      });
    }
  }

  /**
   * Validate physical playability
   */
  private validatePhysicalPlayability(positions: StringPosition[], warnings: ChordDiagramValidationWarning[]): void {
    const frettedPositions = positions.filter(p => p.fret > 0);
    
    if (frettedPositions.length === 0) return;

    const frets = frettedPositions.map(p => p.fret);
    const minFret = Math.min(...frets);
    const maxFret = Math.max(...frets);
    const stretch = maxFret - minFret;

    // Check for excessive stretch
    if (stretch > 4) {
      warnings.push({
        type: 'difficult_stretch',
        message: `Large finger stretch: ${stretch} frets (${minFret}-${maxFret})`,
        severity: 'high',
        suggestion: 'Consider alternative fingering or mark as expert difficulty'
      });
    } else if (stretch > 3) {
      warnings.push({
        type: 'difficult_stretch',
        message: `Moderate finger stretch: ${stretch} frets`,
        severity: 'medium',
        suggestion: 'May be challenging for beginners'
      });
    }

    // Check for cramped fingering (multiple fingers on same fret)
    const fretCounts = new Map<number, number>();
    frettedPositions.forEach(p => {
      if (!p.isBarre) {
        fretCounts.set(p.fret, (fretCounts.get(p.fret) || 0) + 1);
      }
    });

    fretCounts.forEach((count, fret) => {
      if (count > 2) {
        warnings.push({
          type: 'difficult_stretch',
          message: `Multiple fingers on fret ${fret}`,
          severity: 'medium',
          suggestion: 'May be difficult to fit multiple fingers on same fret'
        });
      }
    });
  }

  /**
   * Validate musical theory accuracy
   */
  private validateMusicalTheory(chord: ChordDiagram, warnings: ChordDiagramValidationWarning[]): void {
    // This would involve checking if the chord produces the expected notes
    // For now, we'll do basic validation
    
    const frettedPositions = chord.positions.filter(p => p.fret >= 0);
    
    if (frettedPositions.length < 3) {
      warnings.push({
        type: 'incomplete_chord',
        message: 'Chord has fewer than 3 notes',
        severity: 'low',
        suggestion: 'Consider if this forms a complete chord'
      });
    }

    // Check for common chord naming conventions
    if (chord.name.includes('maj7') && !chord.name.includes('maj9')) {
      // Should contain major 7th interval
      // This would require more complex note calculation
    }
  }

  /**
   * Validate difficulty assessment
   */
  private validateDifficultyAssessment(chord: ChordDiagram, warnings: ChordDiagramValidationWarning[]): void {
    const actualDifficulty = this.assessDifficulty(chord.positions, chord.barre);
    
    if (chord.difficulty !== actualDifficulty) {
      warnings.push({
        type: 'uncommon_fingering',
        message: `Difficulty mismatch: marked as ${chord.difficulty}, calculated as ${actualDifficulty}`,
        severity: 'low',
        suggestion: `Consider updating difficulty to ${actualDifficulty}`
      });
    }
  }

  /**
   * Assess chord difficulty based on technical requirements
   */
  private assessDifficulty(positions: StringPosition[], barre?: unknown): DifficultyLevel {
    const frettedPositions = positions.filter(p => p.fret > 0);
    
    if (frettedPositions.length === 0) return 'beginner';
    
    const frets = frettedPositions.map(p => p.fret);
    const stretch = Math.max(...frets) - Math.min(...frets);
    const highestFret = Math.max(...frets);
    
    // Expert level criteria
    if (highestFret > 12 || stretch > 4) return 'expert';
    
    // Advanced level criteria  
    if (highestFret > 7 || stretch > 3 || barre) return 'advanced';
    
    // Intermediate level criteria
    if (stretch > 2 || frettedPositions.length > 3) return 'intermediate';
    
    return 'beginner';
  }

  /**
   * Calculate overall validation score
   */
  private calculateValidationScore(errors: ChordDiagramValidationError[], warnings: ChordDiagramValidationWarning[]): number {
    let score = 1.0;
    
    // Deduct for errors
    score -= errors.length * 0.2;
    
    // Deduct for warnings based on severity
    warnings.forEach(warning => {
      switch (warning.severity) {
        case 'high':
          score -= 0.1;
          break;
        case 'medium':
          score -= 0.05;
          break;
        case 'low':
          score -= 0.02;
          break;
      }
    });
    
    return Math.max(0, score);
  }

  /**
   * Batch validate multiple chord diagrams
   */
  validateChordDiagrams(chords: ChordDiagram[]): { chord: ChordDiagram; validation: ChordDiagramValidationResult }[] {
    return chords.map(chord => ({
      chord,
      validation: this.validateChordDiagram(chord)
    }));
  }

  /**
   * Get validation statistics for a collection
   */
  getValidationStatistics(validations: ChordDiagramValidationResult[]): {
    totalChords: number;
    validChords: number;
    invalidChords: number;
    averageScore: number;
    totalErrors: number;
    totalWarnings: number;
    errorsByType: Record<string, number>;
    warningsBySeverity: Record<string, number>;
  } {
    const totalChords = validations.length;
    const validChords = validations.filter(v => v.isValid).length;
    const invalidChords = totalChords - validChords;
    const averageScore = validations.reduce((sum, v) => sum + v.score, 0) / totalChords;
    const totalErrors = validations.reduce((sum, v) => sum + v.errors.length, 0);
    const totalWarnings = validations.reduce((sum, v) => sum + v.warnings.length, 0);
    
    const errorsByType: Record<string, number> = {};
    const warningsBySeverity: Record<string, number> = {};
    
    validations.forEach(validation => {
      validation.errors.forEach(error => {
        errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      });
      
      validation.warnings.forEach(warning => {
        warningsBySeverity[warning.severity] = (warningsBySeverity[warning.severity] || 0) + 1;
      });
    });
    
    return {
      totalChords,
      validChords,
      invalidChords,
      averageScore,
      totalErrors,
      totalWarnings,
      errorsByType,
      warningsBySeverity
    };
  }

  /**
   * Auto-fix common chord issues
   */
  autoFixChordIssues(chord: ChordDiagram): ChordDiagram {
    const fixedChord = { ...chord };
    
    // Fix finger assignments for open and muted strings
    fixedChord.positions = chord.positions.map(position => {
      const fixedPosition = { ...position };
      
      if (position.fret === 0 && position.finger !== 0) {
        fixedPosition.finger = 0;
      }
      
      if (position.fret === -1 && position.finger !== -1) {
        fixedPosition.finger = -1;
      }
      
      return fixedPosition;
    });
    
    // Auto-assess difficulty
    fixedChord.difficulty = this.assessDifficulty(fixedChord.positions, fixedChord.barre);
    
    return fixedChord;
  }
}

/**
 * Create quality assurance service instance
 */
export const chordQualityAssurance = new ChordQualityAssuranceService();

/**
 * Convenience function for validating a single chord
 */
export function validateChord(chord: ChordDiagram): ChordDiagramValidationResult {
  return chordQualityAssurance.validateChordDiagram(chord);
}

/**
 * Convenience function for batch validation
 */
export function validateChords(chords: ChordDiagram[]): { chord: ChordDiagram; validation: ChordDiagramValidationResult }[] {
  return chordQualityAssurance.validateChordDiagrams(chords);
}