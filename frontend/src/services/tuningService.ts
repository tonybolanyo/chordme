/**
 * Tuning Service for ChordMe
 * 
 * This service provides functionality for managing alternative tunings,
 * converting chord diagrams between tunings, and calculating capo positions.
 */

import { 
  TuningInfo, 
  TuningPreset, 
  TuningConversionResult,
  CapoCalculation,
  TuningComparison,
  TuningSuggestion,
  COMMON_GUITAR_TUNINGS
} from '../types/tuning';
import { ChordDiagram, StringPosition, InstrumentType, INSTRUMENT_CONFIGS } from '../types/chordDiagram';
import { generateId } from '../utils/idGenerator';

/**
 * Main tuning service class
 */
export class TuningService {
  private customTunings: Map<string, TuningInfo> = new Map();
  private tuningLibraries: Map<string, ChordDiagram[]> = new Map();

  /**
   * Get all available tunings for an instrument
   */
  getAllTunings(instrument: InstrumentType = 'guitar'): TuningInfo[] {
    const commonTunings = Object.entries(COMMON_GUITAR_TUNINGS)
      .filter(([_, tuning]) => tuning.instrument === instrument)
      .map(([preset, tuning]) => this.createTuningInfo(preset as TuningPreset, tuning));

    const customTunings = Array.from(this.customTunings.values())
      .filter(tuning => tuning.instrument === instrument);

    return [...commonTunings, ...customTunings];
  }

  /**
   * Get tuning by preset name
   */
  getTuningByPreset(preset: TuningPreset, instrument: InstrumentType = 'guitar'): TuningInfo | null {
    const tuningTemplate = COMMON_GUITAR_TUNINGS[preset];
    if (!tuningTemplate || tuningTemplate.instrument !== instrument) {
      return null;
    }
    return this.createTuningInfo(preset, tuningTemplate);
  }

  /**
   * Get standard tuning for an instrument
   */
  getStandardTuning(instrument: InstrumentType = 'guitar'): TuningInfo {
    return this.getTuningByPreset('standard', instrument)!;
  }

  /**
   * Create a custom tuning
   */
  createCustomTuning(
    name: string,
    description: string,
    notes: string[],
    instrument: InstrumentType = 'guitar',
    options: {
      genres?: string[];
      difficulty?: 'easy' | 'medium' | 'hard';
      createdBy?: string;
    } = {}
  ): TuningInfo {
    const standardTuning = this.getStandardTuning(instrument);
    const semitoneOffsets = this.calculateSemitoneOffsets(notes, standardTuning.notes);
    
    const customTuning: TuningInfo = {
      id: generateId(),
      name,
      description,
      preset: 'custom',
      instrument,
      notes,
      semitoneOffsets,
      isStandard: false,
      difficulty: options.difficulty || 'medium',
      genres: options.genres || ['experimental'],
      localization: {
        names: { en: name },
        descriptions: { en: description }
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: options.createdBy,
        isCustom: true,
        isVerified: false,
        popularityScore: 0
      }
    };

    this.customTunings.set(customTuning.id, customTuning);
    return customTuning;
  }

  /**
   * Convert chord diagram between tunings
   */
  convertChordBetweenTunings(
    chordDiagram: ChordDiagram,
    fromTuning: TuningInfo,
    toTuning: TuningInfo,
    options: {
      allowCapo?: boolean;
      maxCapoPosition?: number;
      preferSimpleFingering?: boolean;
    } = {}
  ): TuningConversionResult {
    const { allowCapo = true, maxCapoPosition = 7, preferSimpleFingering = true } = options;

    // Extract fret positions from chord diagram
    const originalPositions = chordDiagram.positions.map(pos => pos.fret);
    
    // Calculate the difference in tuning between strings
    const tuningDifferences = fromTuning.notes.map((note, index) => {
      return this.calculateSemitoneDifference(note, toTuning.notes[index]);
    });

    // Try direct conversion first
    let convertedPositions = originalPositions.map((fret, stringIndex) => {
      if (fret < 0) return fret; // Keep muted strings muted
      if (fret === 0) {
        // Open string: adjust if tuning changed
        const adjustment = tuningDifferences[stringIndex];
        return adjustment <= 0 ? 0 : Math.abs(adjustment);
      }
      // Fretted string: adjust for tuning difference
      const newFret = fret - tuningDifferences[stringIndex];
      return newFret < 0 ? -1 : newFret; // Mute if would go below fret 0
    });

    let adjustments = tuningDifferences;
    let requiresCapo = false;
    let capoPosition = 0;
    let confidence = 100;
    let notes: string[] = [];

    // Check if we need a capo
    const minValidFret = Math.min(...convertedPositions.filter(fret => fret >= 0));
    if (minValidFret < 0 && allowCapo) {
      // Calculate optimal capo position
      const capoCalc = this.calculateOptimalCapo(originalPositions, fromTuning, toTuning, maxCapoPosition);
      if (capoCalc.achievesChord && capoCalc.position <= maxCapoPosition) {
        requiresCapo = true;
        capoPosition = capoCalc.position;
        convertedPositions = originalPositions.map((fret, stringIndex) => {
          if (fret < 0) return fret;
          const adjustedFret = fret - tuningDifferences[stringIndex] + capoPosition;
          return adjustedFret < capoPosition ? -1 : adjustedFret;
        });
        notes.push(`Capo on fret ${capoPosition} recommended`);
        confidence = capoCalc.achievesChord ? 85 : 60;
      }
    }

    // Check for impossible stretches or high fret positions
    const maxFret = Math.max(...convertedPositions.filter(fret => fret >= 0));
    const minFret = Math.min(...convertedPositions.filter(fret => fret > 0));
    
    if (maxFret > 15) {
      confidence -= 20;
      notes.push('Chord requires high fret positions');
    }
    
    if (maxFret - minFret > 4) {
      confidence -= 15;
      notes.push('Wide finger stretch required');
    }

    // Check for muted strings that shouldn't be muted
    const newlyMutedStrings = convertedPositions
      .map((fret, index) => ({ fret, index, original: originalPositions[index] }))
      .filter(pos => pos.fret === -1 && pos.original >= 0)
      .length;
    
    if (newlyMutedStrings > 0) {
      confidence -= newlyMutedStrings * 10;
      notes.push(`${newlyMutedStrings} string(s) had to be muted`);
    }

    return {
      success: confidence >= 50,
      originalPositions,
      convertedPositions,
      adjustments,
      requiresCapo,
      capoPosition: requiresCapo ? capoPosition : undefined,
      notes,
      confidence: Math.max(0, confidence)
    };
  }

  /**
   * Calculate optimal capo position for chord conversion
   */
  calculateOptimalCapo(
    positions: number[],
    fromTuning: TuningInfo,
    toTuning: TuningInfo,
    maxCapoPosition: number = 7
  ): CapoCalculation {
    let bestCapo = 0;
    let bestScore = 0;
    let bestEffectiveTuning: string[] = [];
    let alternatives: Array<{ position: number; confidence: number; notes: string }> = [];

    for (let capoPos = 1; capoPos <= maxCapoPosition; capoPos++) {
      // Calculate effective tuning with capo
      const effectiveTuning = toTuning.notes.map(note => 
        this.transposeNote(note, capoPos)
      );
      
      // Calculate how well this capo position works
      let score = 100;
      let validPositions = 0;
      
      positions.forEach((fret, stringIndex) => {
        if (fret < 0) return; // Skip muted strings
        
        const originalNote = this.transposeNote(fromTuning.notes[stringIndex], fret);
        const targetNote = this.transposeNote(effectiveTuning[stringIndex], fret - capoPos);
        
        if (this.notesEqual(originalNote, targetNote)) {
          validPositions++;
        } else {
          score -= 20;
        }
        
        if (fret - capoPos < 0) {
          score -= 25; // Penalty for impossible positions
        }
      });

      alternatives.push({
        position: capoPos,
        confidence: score,
        notes: `${validPositions}/${positions.filter(f => f >= 0).length} notes match`
      });

      if (score > bestScore) {
        bestScore = score;
        bestCapo = capoPos;
        bestEffectiveTuning = effectiveTuning;
      }
    }

    return {
      position: bestCapo,
      effectiveTuning: bestEffectiveTuning,
      effectiveOffsets: bestEffectiveTuning.map((note, index) => 
        this.calculateSemitoneDifference(toTuning.notes[index], note)
      ),
      achievesChord: bestScore >= 70,
      alternatives: alternatives
        .filter(alt => alt.position !== bestCapo)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3)
    };
  }

  /**
   * Compare two tunings
   */
  compareTunings(tuning1: TuningInfo, tuning2: TuningInfo): TuningComparison {
    const matchingStrings: number[] = [];
    const differentStrings: number[] = [];
    
    const minLength = Math.min(tuning1.notes.length, tuning2.notes.length);
    
    for (let i = 0; i < minLength; i++) {
      if (this.notesEqual(tuning1.notes[i], tuning2.notes[i])) {
        matchingStrings.push(i + 1);
      } else {
        differentStrings.push(i + 1);
      }
    }

    const similarity = (matchingStrings.length / minLength) * 100;
    
    let conversionDifficulty: 'easy' | 'medium' | 'hard' = 'easy';
    if (differentStrings.length > 2) conversionDifficulty = 'hard';
    else if (differentStrings.length > 1) conversionDifficulty = 'medium';

    // Find common chord shapes (simplified)
    const commonChords = this.findCommonChords(tuning1, tuning2);

    return {
      tuning1,
      tuning2,
      matchingStrings,
      differentStrings,
      similarity,
      conversionDifficulty,
      commonChords
    };
  }

  /**
   * Suggest tunings based on chord progression or musical style
   */
  suggestTunings(
    criteria: {
      chords?: string[];
      genre?: string;
      preferredDifficulty?: 'easy' | 'medium' | 'hard';
      currentTuning?: TuningInfo;
      instrument?: InstrumentType;
    }
  ): TuningSuggestion[] {
    const { genre, preferredDifficulty, currentTuning, instrument = 'guitar' } = criteria;
    const allTunings = this.getAllTunings(instrument);
    const suggestions: TuningSuggestion[] = [];

    for (const tuning of allTunings) {
      let confidence = 50;
      let reason = 'General alternative tuning';
      const benefits: string[] = [];
      const challenges: string[] = [];

      // Genre matching
      if (genre && tuning.genres.includes(genre)) {
        confidence += 30;
        reason = `Commonly used in ${genre} music`;
        benefits.push(`Popular in ${genre} genre`);
      }

      // Difficulty matching
      if (preferredDifficulty && tuning.difficulty === preferredDifficulty) {
        confidence += 20;
        benefits.push(`Matches preferred difficulty level (${preferredDifficulty})`);
      } else if (preferredDifficulty === 'easy' && tuning.difficulty === 'hard') {
        confidence -= 25;
        challenges.push('May be challenging for beginners');
      }

      // Current tuning comparison
      if (currentTuning && tuning.id !== currentTuning.id) {
        const comparison = this.compareTunings(currentTuning, tuning);
        confidence += comparison.similarity * 0.2;
        
        if (comparison.conversionDifficulty === 'easy') {
          benefits.push('Easy to retune from current tuning');
        } else if (comparison.conversionDifficulty === 'hard') {
          challenges.push('Requires significant retuning');
        }
      }

      // Don't suggest current tuning
      if (currentTuning && tuning.id === currentTuning.id) {
        continue;
      }

      // Standard tuning bonus for beginners
      if (tuning.isStandard && preferredDifficulty === 'easy') {
        confidence += 25;
        benefits.push('Most common tuning with abundant learning resources');
      }

      // Artist popularity
      if (tuning.artists && tuning.artists.length > 0) {
        confidence += 10;
        benefits.push(`Used by notable artists: ${tuning.artists.slice(0, 2).join(', ')}`);
      }

      suggestions.push({
        tuning,
        reason,
        confidence: Math.max(0, Math.min(100, confidence)),
        benefits,
        challenges
      });
    }

    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Return top 5 suggestions
  }

  /**
   * Get chord library for specific tuning
   */
  getTuningChordLibrary(tuning: TuningInfo): ChordDiagram[] {
    return this.tuningLibraries.get(tuning.id) || [];
  }

  /**
   * Helper method to create TuningInfo from template
   */
  private createTuningInfo(preset: TuningPreset, template: any): TuningInfo {
    return {
      id: `${template.instrument}_${preset}`,
      ...template,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isCustom: false,
        isVerified: true,
        popularityScore: this.getPresetPopularity(preset)
      }
    };
  }

  /**
   * Calculate semitone offsets between two tunings
   */
  private calculateSemitoneOffsets(notes1: string[], notes2: string[]): number[] {
    return notes1.map((note, index) => 
      this.calculateSemitoneDifference(notes2[index], note)
    );
  }

  /**
   * Calculate semitone difference between two notes
   */
  private calculateSemitoneDifference(note1: string, note2: string): number {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
    // Normalize notes (convert flats to sharps)
    const normalizedNote1 = this.normalizeNote(note1);
    const normalizedNote2 = this.normalizeNote(note2);
    
    const index1 = notes.indexOf(normalizedNote1);
    const index2 = notes.indexOf(normalizedNote2);
    
    if (index1 === -1 || index2 === -1) return 0;
    
    return (index2 - index1 + 12) % 12;
  }

  /**
   * Transpose a note by semitones
   */
  private transposeNote(note: string, semitones: number): string {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const normalized = this.normalizeNote(note);
    const currentIndex = notes.indexOf(normalized);
    
    if (currentIndex === -1) return note;
    
    const newIndex = (currentIndex + semitones + 12) % 12;
    return notes[newIndex];
  }

  /**
   * Normalize note (convert flats to sharps)
   */
  private normalizeNote(note: string): string {
    const flatToSharp: { [key: string]: string } = {
      'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
    };
    return flatToSharp[note] || note;
  }

  /**
   * Check if two notes are enharmonically equivalent
   */
  private notesEqual(note1: string, note2: string): boolean {
    return this.normalizeNote(note1) === this.normalizeNote(note2);
  }

  /**
   * Find common chord shapes between tunings
   */
  private findCommonChords(tuning1: TuningInfo, tuning2: TuningInfo): string[] {
    // Simplified implementation - in reality, this would analyze chord libraries
    const basicChords = ['C', 'G', 'Am', 'F', 'D', 'Em'];
    return basicChords.filter(() => Math.random() > 0.5); // Placeholder logic
  }

  /**
   * Get popularity score for preset tunings
   */
  private getPresetPopularity(preset: TuningPreset): number {
    const popularityMap: { [key in TuningPreset]: number } = {
      standard: 1.0,
      drop_d: 0.8,
      half_step_down: 0.7,
      dadgad: 0.6,
      open_g: 0.5,
      open_d: 0.5,
      whole_step_down: 0.4,
      double_drop_d: 0.3,
      open_c: 0.3,
      open_e: 0.3,
      drop_c: 0.3,
      drop_b: 0.2,
      custom: 0.1
    };
    return popularityMap[preset] || 0.1;
  }
}

// Export singleton instance
export const tuningService = new TuningService();

// Export utility functions for use in other modules
export function convertChordToTuning(
  chord: ChordDiagram,
  targetTuning: TuningInfo
): TuningConversionResult {
  const standardTuning = tuningService.getStandardTuning(chord.instrument.type);
  return tuningService.convertChordBetweenTunings(chord, standardTuning, targetTuning);
}

export function calculateCapoForTuning(
  chord: ChordDiagram,
  tuning: TuningInfo,
  maxCapo: number = 7
): CapoCalculation {
  const standardTuning = tuningService.getStandardTuning(chord.instrument.type);
  const positions = chord.positions.map(pos => pos.fret);
  return tuningService.calculateOptimalCapo(positions, standardTuning, tuning, maxCapo);
}