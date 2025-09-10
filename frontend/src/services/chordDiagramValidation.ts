/**
 * Chord Diagram Validation (...args: unknown[]) => unknowns
 * 
 * This module provides comprehensive validation for chord diagram data structures,
 * ensuring data integrity and musical accuracy.
 */

import {
  ChordDiagram,
  ChordDiagramValidationResult,
  ChordDiagramValidationError,
  ChordDiagramValidationWarning,
  StringPosition,
  BarreChord,
  InstrumentConfig,
  INSTRUMENT_CONFIGS,
  InstrumentType,
  FingerNumber
} from '../types/chordDiagram';

/**
 * Maximum realistic finger stretch (frets) for each difficulty level
 */
const MAX_FINGER_STRETCH: Record<string, number> = {
  beginner: 2,
  intermediate: 3,
  advanced: 4,
  expert: 5
};

/**
 * Validate a complete chord diagram
 */
export function validateChordDiagram(diagram: ChordDiagram): ChordDiagramValidationResult {
  const errors: ChordDiagramValidationError[] = [];
  const warnings: ChordDiagramValidationWarning[] = [];

  // Validate basic structure
  errors.push(...validateBasicStructure(diagram));

  // Validate instrument configuration
  errors.push(...validateInstrumentConfig(diagram.instrument));

  // Validate string positions
  errors.push(...validateStringPositions(diagram.positions, diagram.instrument));

  // Validate barre chord if present
  if (diagram.barre) {
    errors.push(...validateBarreChord(diagram.barre, diagram.instrument));
  }

  // Validate finger assignments
  errors.push(...validateFingerAssignments(diagram.positions, diagram.barre));

  // Validate fret positions are within range
  errors.push(...validateFretRange(diagram.positions, diagram.instrument));

  // Generate warnings for potential issues
  warnings.push(...generateWarnings(diagram));

  // Calculate validation score
  const score = calculateValidationScore(errors, warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    score
  };
}

/**
 * Validate basic structure of chord diagram
 */
function validateBasicStructure(diagram: ChordDiagram): ChordDiagramValidationError[] {
  const errors: ChordDiagramValidationError[] = [];

  if (!diagram.id || diagram.id.trim() === '') {
    errors.push({
      type: 'missing_required',
      message: 'Chord diagram must have a valid ID'
    });
  }

  if (!diagram.name || diagram.name.trim() === '') {
    errors.push({
      type: 'missing_required',
      message: 'Chord diagram must have a valid name'
    });
  }

  if (!diagram.positions || diagram.positions.length === 0) {
    errors.push({
      type: 'missing_required',
      message: 'Chord diagram must have at least one string position'
    });
  }

  if (!diagram.instrument) {
    errors.push({
      type: 'missing_required',
      message: 'Chord diagram must specify an instrument'
    });
  }

  return errors;
}

/**
 * Validate instrument configuration
 */
function validateInstrumentConfig(instrument: InstrumentConfig): ChordDiagramValidationError[] {
  const errors: ChordDiagramValidationError[] = [];

  if (!instrument.type || !['guitar', 'ukulele', 'mandolin'].includes(instrument.type)) {
    errors.push({
      type: 'invalid_string',
      message: 'Invalid instrument type. Must be guitar, ukulele, or mandolin'
    });
  }

  const expectedConfig = INSTRUMENT_CONFIGS[instrument.type as InstrumentType];
  if (expectedConfig) {
    if (instrument.stringCount !== expectedConfig.stringCount) {
      errors.push({
        type: 'invalid_string',
        message: `${instrument.type} must have ${expectedConfig.stringCount} strings, got ${instrument.stringCount}`
      });
    }

    if (instrument.standardTuning.length !== expectedConfig.stringCount) {
      errors.push({
        type: 'invalid_string',
        message: `Standard tuning must have ${expectedConfig.stringCount} notes for ${instrument.type}`
      });
    }
  }

  return errors;
}

/**
 * Validate string positions
 */
function validateStringPositions(positions: StringPosition[], instrument: InstrumentConfig): ChordDiagramValidationError[] {
  const errors: ChordDiagramValidationError[] = [];

  if (!positions || positions.length === 0) {
    return errors;
  }

  // Check for duplicate string numbers
  const stringNumbers = new Set<number>();
  for (const position of positions) {
    if (stringNumbers.has(position.stringNumber)) {
      errors.push({
        type: 'invalid_string',
        message: `Duplicate position for string ${position.stringNumber}`,
        stringNumber: position.stringNumber
      });
    }
    stringNumbers.add(position.stringNumber);
  }

  // Validate each position
  for (const position of positions) {
    errors.push(...validateSingleStringPosition(position, instrument));
  }

  return errors;
}

/**
 * Validate a single string position
 */
function validateSingleStringPosition(position: StringPosition, instrument: InstrumentConfig): ChordDiagramValidationError[] {
  const errors: ChordDiagramValidationError[] = [];

  // Validate string number
  if (position.stringNumber < 1 || position.stringNumber > instrument.stringCount) {
    errors.push({
      type: 'invalid_string',
      message: `Invalid string number ${position.stringNumber}. Must be between 1 and ${instrument.stringCount}`,
      stringNumber: position.stringNumber
    });
  }

  // Validate fret number
  if (position.fret < -1 || position.fret > instrument.fretRange.max) {
    errors.push({
      type: 'invalid_fret',
      message: `Invalid fret ${position.fret}. Must be between -1 (muted) and ${instrument.fretRange.max}`,
      stringNumber: position.stringNumber,
      fret: position.fret
    });
  }

  // Validate finger number
  if (![0, 1, 2, 3, 4, -1].includes(position.finger)) {
    errors.push({
      type: 'invalid_finger',
      message: `Invalid finger assignment ${position.finger}. Must be -1 (muted), 0 (open), or 1-4 (fingers)`,
      stringNumber: position.stringNumber
    });
  }

  // Logical consistency checks
  if (position.fret === 0 && position.finger !== 0) {
    errors.push({
      type: 'invalid_finger',
      message: `Open string (fret 0) should have finger 0, got finger ${position.finger}`,
      stringNumber: position.stringNumber,
      fret: position.fret
    });
  }

  if (position.fret === -1 && position.finger !== -1) {
    errors.push({
      type: 'invalid_finger',
      message: `Muted string (fret -1) should have finger -1, got finger ${position.finger}`,
      stringNumber: position.stringNumber,
      fret: position.fret
    });
  }

  if (position.fret > 0 && position.finger === 0) {
    errors.push({
      type: 'invalid_finger',
      message: `Fretted string (fret ${position.fret}) cannot have finger 0 (open)`,
      stringNumber: position.stringNumber,
      fret: position.fret
    });
  }

  // Validate barre information
  if (position.isBarre && (!position.barreSpan || position.barreSpan < 2)) {
    errors.push({
      type: 'invalid_barre',
      message: `Barre position must have barreSpan of at least 2 strings`,
      stringNumber: position.stringNumber
    });
  }

  return errors;
}

/**
 * Validate barre chord information
 */
function validateBarreChord(barre: BarreChord, instrument: InstrumentConfig): ChordDiagramValidationError[] {
  const errors: ChordDiagramValidationError[] = [];

  // Validate fret
  if (barre.fret < 1 || barre.fret > instrument.fretRange.max) {
    errors.push({
      type: 'invalid_barre',
      message: `Barre fret ${barre.fret} is out of range. Must be between 1 and ${instrument.fretRange.max}`,
      fret: barre.fret
    });
  }

  // Validate finger
  if (![1, 2, 3, 4].includes(barre.finger)) {
    errors.push({
      type: 'invalid_barre',
      message: `Barre finger ${barre.finger} is invalid. Must be 1, 2, 3, or 4`
    });
  }

  // Validate string range
  if (barre.startString < 1 || barre.startString > instrument.stringCount) {
    errors.push({
      type: 'invalid_barre',
      message: `Barre start string ${barre.startString} is out of range`,
      stringNumber: barre.startString
    });
  }

  if (barre.endString < 1 || barre.endString > instrument.stringCount) {
    errors.push({
      type: 'invalid_barre',
      message: `Barre end string ${barre.endString} is out of range`,
      stringNumber: barre.endString
    });
  }

  if (barre.endString <= barre.startString) {
    errors.push({
      type: 'invalid_barre',
      message: `Barre end string (${barre.endString}) must be higher than start string (${barre.startString})`
    });
  }

  // Validate partial barre logic
  const barreSpan = barre.endString - barre.startString + 1;
  if (barre.isPartial && barreSpan >= instrument.stringCount) {
    errors.push({
      type: 'invalid_barre',
      message: `Partial barre cannot span all ${instrument.stringCount} strings`
    });
  }

  return errors;
}

/**
 * Validate finger assignments for physical playability
 */
function validateFingerAssignments(positions: StringPosition[], barre?: BarreChord): ChordDiagramValidationError[] {
  const errors: ChordDiagramValidationError[] = [];

  // Get all fretted positions (excluding open and muted)
  const frettedPositions = positions.filter(p => p.fret > 0);

  if (frettedPositions.length === 0) {
    return errors; // No fretted notes to validate
  }

  // Check for finger conflicts (same finger used on different frets)
  const fingerFretMap = new Map<FingerNumber, Set<number>>();

  for (const position of frettedPositions) {
    if (position.finger > 0) {
      if (!fingerFretMap.has(position.finger)) {
        fingerFretMap.set(position.finger, new Set());
      }
      fingerFretMap.get(position.finger)!.add(position.fret);
    }
  }

  // Check for conflicts (same finger on different frets, except for barre)
  for (const [finger, frets] of fingerFretMap.entries()) {
    if (frets.size > 1) {
      const fretsArray = Array.from(frets);
      
      // Allow same finger on same fret (barre) or if barre is defined
      if (barre && finger === barre.finger) {
        // Check if all frets for this finger are at the barre fret
        const nonBarreFrets = fretsArray.filter(f => f !== barre.fret);
        if (nonBarreFrets.length > 0) {
          errors.push({
            type: 'invalid_finger',
            message: `Finger ${finger} is used for barre at fret ${barre.fret} but also at fret(s) ${nonBarreFrets.join(', ')}`
          });
        }
      } else {
        errors.push({
          type: 'invalid_finger',
          message: `Finger ${finger} cannot be used on multiple frets: ${fretsArray.join(', ')}`
        });
      }
    }
  }

  return errors;
}

/**
 * Validate fret positions are within reasonable range
 */
function validateFretRange(positions: StringPosition[], instrument: InstrumentConfig): ChordDiagramValidationError[] {
  const errors: ChordDiagramValidationError[] = [];

  const frettedPositions = positions.filter(p => p.fret > 0);
  if (frettedPositions.length === 0) {
    return errors;
  }

  const frets = frettedPositions.map(p => p.fret);
  const minFret = Math.min(...frets);
  const maxFret = Math.max(...frets);
  const fretSpread = maxFret - minFret;

  // Check if spread is too wide for any difficulty level
  const maxAllowedSpread = Math.max(...Object.values(MAX_FINGER_STRETCH));
  if (fretSpread > maxAllowedSpread) {
    errors.push({
      type: 'impossible_stretch',
      message: `Fret spread of ${fretSpread} frets (${minFret}-${maxFret}) is too wide to play`
    });
  }

  return errors;
}

/**
 * Generate warnings for potential issues
 */
function generateWarnings(diagram: ChordDiagram): ChordDiagramValidationWarning[] {
  const warnings: ChordDiagramValidationWarning[] = [];

  // Check finger stretch difficulty
  const frettedPositions = diagram.positions.filter(p => p.fret > 0);
  if (frettedPositions.length > 1) {
    const frets = frettedPositions.map(p => p.fret);
    const minFret = Math.min(...frets);
    const maxFret = Math.max(...frets);
    const fretSpread = maxFret - minFret;

    const maxStretchForDifficulty = MAX_FINGER_STRETCH[diagram.difficulty];
    if (fretSpread > maxStretchForDifficulty) {
      warnings.push({
        type: 'difficult_stretch',
        message: `Fret spread of ${fretSpread} is challenging for ${diagram.difficulty} level`,
        severity: 'medium',
        suggestion: `Consider marking as ${getNextDifficultyLevel(diagram.difficulty)} or provide alternative fingering`
      });
    }
  }

  // Check for uncommon fingerings
  warnings.push(...checkUncommonFingerings(diagram));

  // Check for incomplete chords (missing chord tones)
  warnings.push(...checkChordCompleteness(diagram));

  // Check for high fret positions
  const highFretPositions = diagram.positions.filter(p => p.fret > 12);
  if (highFretPositions.length > 0) {
    warnings.push({
      type: 'uncommon_fingering',
      message: 'Chord uses high fret positions (above 12th fret)',
      severity: 'low',
      suggestion: 'Consider providing a lower position alternative'
    });
  }

  return warnings;
}

/**
 * Check for uncommon fingering patterns
 */
function checkUncommonFingerings(diagram: ChordDiagram): ChordDiagramValidationWarning[] {
  const warnings: ChordDiagramValidationWarning[] = [];

  const frettedPositions = diagram.positions.filter(p => p.fret > 0);
  
  // Check for finger order violations (lower numbered fingers on higher frets)
  for (let i = 0; i < frettedPositions.length; i++) {
    for (let j = i + 1; j < frettedPositions.length; j++) {
      const pos1 = frettedPositions[i];
      const pos2 = frettedPositions[j];
      
      if (pos1.finger > 0 && pos2.finger > 0 && 
          pos1.finger < pos2.finger && pos1.fret > pos2.fret) {
        warnings.push({
          type: 'uncommon_fingering',
          message: `Finger ${pos1.finger} on fret ${pos1.fret} is higher than finger ${pos2.finger} on fret ${pos2.fret}`,
          severity: 'low',
          suggestion: 'This fingering pattern may be difficult for some players'
        });
      }
    }
  }

  return warnings;
}

/**
 * Check if chord contains all essential chord tones
 */
function checkChordCompleteness(diagram: ChordDiagram): ChordDiagramValidationWarning[] {
  const warnings: ChordDiagramValidationWarning[] = [];

  if (!diagram.notes || !diagram.notes.notes || diagram.notes.notes.length < 3) {
    warnings.push({
      type: 'incomplete_chord',
      message: 'Chord may be incomplete (fewer than 3 unique notes)',
      severity: 'medium',
      suggestion: 'Verify that all essential chord tones are present'
    });
  }

  return warnings;
}

/**
 * Calculate validation score based on errors and warnings
 */
function calculateValidationScore(errors: ChordDiagramValidationError[], warnings: ChordDiagramValidationWarning[]): number {
  if (errors.length > 0) {
    return 0; // Invalid diagrams get 0 score
  }

  let score = 1.0;

  // Deduct points for warnings based on severity
  for (const warning of warnings) {
    switch (warning.severity) {
      case 'high':
        score -= 0.2;
        break;
      case 'medium':
        score -= 0.1;
        break;
      case 'low':
        score -= 0.05;
        break;
    }
  }

  return Math.max(0, score);
}

/**
 * Get the next difficulty level
 */
function getNextDifficultyLevel(current: string): string {
  const levels = ['beginner', 'intermediate', 'advanced', 'expert'];
  const currentIndex = levels.indexOf(current);
  return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : current;
}

/**
 * Validate multiple chord diagrams
 */
export function validateChordDiagrams(diagrams: ChordDiagram[]): Map<string, ChordDiagramValidationResult> {
  const results = new Map<string, ChordDiagramValidationResult>();

  for (const diagram of diagrams) {
    const result = validateChordDiagram(diagram);
    results.set(diagram.id, result);
  }

  return results;
}

/**
 * Quick validation check for chord diagram
 */
export function isValidChordDiagram(diagram: ChordDiagram): boolean {
  const result = validateChordDiagram(diagram);
  return result.isValid;
}

/**
 * Validate chord diagram and throw on errors
 */
export function validateChordDiagramStrict(diagram: ChordDiagram): void {
  const result = validateChordDiagram(diagram);
  if (!result.isValid) {
    const errorMessages = result.errors.map(e => e.message).join('; ');
    throw new Error(`Invalid chord diagram: ${errorMessages}`);
  }
}