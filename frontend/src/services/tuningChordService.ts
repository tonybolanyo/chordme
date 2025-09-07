/**
 * Tuning-Aware Chord Service Extension
 * 
 * This service extends the existing chord functionality to work with
 * alternative tunings, providing tuning-specific chord suggestions and
 * integration with the transposition system.
 */

import { tuningService } from './tuningService';
import { TuningInfo } from '../types/tuning';
import { ChordDiagram, InstrumentType } from '../types/chordDiagram';
import { 
  createChordDiagramWithTuning, 
  transposeChordDiagramToTuning 
} from './chordDiagramUtils';

/**
 * Tuning-specific chord library entry
 */
export interface TuningSpecificChord {
  /** Standard chord name */
  name: string;
  /** Tuning ID this chord is optimized for */
  tuningId: string;
  /** Chord diagram optimized for this tuning */
  diagram: ChordDiagram;
  /** Advantages of playing this chord in this tuning */
  advantages: string[];
  /** Difficulty rating specific to this tuning */
  tuningDifficulty: 'easier' | 'same' | 'harder';
  /** Alternative fingerings for this tuning */
  alternatives: ChordDiagram[];
}

/**
 * Chord progression suggestion for a specific tuning
 */
export interface TuningChordProgression {
  /** Progression name */
  name: string;
  /** Chord sequence */
  chords: string[];
  /** Tuning this progression works well in */
  tuning: TuningInfo;
  /** Why this progression works well in this tuning */
  reason: string;
  /** Difficulty of the progression in this tuning */
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  /** Musical genres where this progression is common */
  genres: string[];
}

/**
 * Chord recommendation based on tuning
 */
export interface TuningChordRecommendation {
  /** Recommended chord */
  chord: ChordDiagram;
  /** Reason for recommendation */
  reason: string;
  /** Confidence score (0-100) */
  confidence: number;
  /** Benefits of this chord in the current tuning */
  benefits: string[];
  /** Comparison with standard tuning version */
  standardTuningComparison?: {
    easier: boolean;
    differenceDescription: string;
  };
}

/**
 * Tuning-aware chord service
 */
export class TuningChordService {
  private tuningChordLibraries: Map<string, TuningSpecificChord[]> = new Map();
  private progressionLibrary: TuningChordProgression[] = [];

  constructor() {
    this.initializeCommonTuningChords();
    this.initializeProgressions();
  }

  /**
   * Get chord recommendations for a specific tuning
   */
  getChordRecommendationsForTuning(
    tuning: TuningInfo,
    options: {
      chordTypes?: string[];
      difficulty?: 'beginner' | 'intermediate' | 'advanced';
      genre?: string;
      maxResults?: number;
    } = {}
  ): TuningChordRecommendation[] {
    const { chordTypes, difficulty, genre, maxResults = 10 } = options;
    const recommendations: TuningChordRecommendation[] = [];

    // Get tuning-specific chords
    const tuningChords = this.tuningChordLibraries.get(tuning.id) || [];
    
    for (const tuningChord of tuningChords) {
      // Filter by chord type if specified
      if (chordTypes && !chordTypes.some(type => 
        tuningChord.name.toLowerCase().includes(type.toLowerCase())
      )) {
        continue;
      }

      // Filter by difficulty if specified
      if (difficulty && tuningChord.diagram.difficulty !== difficulty) {
        continue;
      }

      // Filter by genre if specified
      if (genre && !tuning.genres.includes(genre)) {
        continue;
      }

      const confidence = this.calculateChordConfidence(tuningChord, tuning, options);
      
      recommendations.push({
        chord: tuningChord.diagram,
        reason: `Optimized for ${tuning.name}: ${tuningChord.advantages.join(', ')}`,
        confidence,
        benefits: tuningChord.advantages,
        standardTuningComparison: {
          easier: tuningChord.tuningDifficulty === 'easier',
          differenceDescription: this.getStandardTuningComparison(tuningChord)
        }
      });
    }

    // Sort by confidence and return top results
    return recommendations
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxResults);
  }

  /**
   * Get chord progressions that work well in a specific tuning
   */
  getProgressionsForTuning(
    tuning: TuningInfo,
    options: {
      genre?: string;
      difficulty?: 'beginner' | 'intermediate' | 'advanced';
      maxResults?: number;
    } = {}
  ): TuningChordProgression[] {
    const { genre, difficulty, maxResults = 5 } = options;

    return this.progressionLibrary
      .filter(progression => {
        if (progression.tuning.id !== tuning.id) return false;
        if (genre && !progression.genres.includes(genre)) return false;
        if (difficulty && progression.difficulty !== difficulty) return false;
        return true;
      })
      .slice(0, maxResults);
  }

  /**
   * Convert a chord diagram to work optimally in a specific tuning
   */
  adaptChordForTuning(
    originalChord: ChordDiagram,
    targetTuning: TuningInfo,
    options: {
      allowCapo?: boolean;
      maxCapoPosition?: number;
      preferSimpleFingering?: boolean;
    } = {}
  ): TuningChordRecommendation | null {
    // Check if we have a tuning-specific version
    const tuningSpecific = this.findTuningSpecificChord(originalChord.name, targetTuning);
    if (tuningSpecific) {
      return {
        chord: tuningSpecific.diagram,
        reason: `Using ${targetTuning.name}-optimized version`,
        confidence: 95,
        benefits: tuningSpecific.advantages,
        standardTuningComparison: {
          easier: tuningSpecific.tuningDifficulty === 'easier',
          differenceDescription: this.getStandardTuningComparison(tuningSpecific)
        }
      };
    }

    // Try to adapt the existing chord
    const standardTuning = tuningService.getStandardTuning(originalChord.instrument.type);
    const conversion = tuningService.convertChordBetweenTunings(
      originalChord,
      standardTuning,
      targetTuning,
      options
    );

    if (!conversion.success || conversion.confidence < 50) {
      return null;
    }

    // Create adapted chord diagram
    const adaptedChord = transposeChordDiagramToTuning(
      originalChord,
      targetTuning.notes,
      options
    );

    if (!adaptedChord) {
      return null;
    }

    return {
      chord: adaptedChord,
      reason: conversion.requiresCapo 
        ? `Adapted for ${targetTuning.name} (capo fret ${conversion.capoPosition})`
        : `Adapted for ${targetTuning.name}`,
      confidence: conversion.confidence,
      benefits: this.getAdaptationBenefits(conversion),
      standardTuningComparison: {
        easier: conversion.confidence > 80,
        differenceDescription: conversion.notes.join('; ')
      }
    };
  }

  /**
   * Get all chords that are particularly effective in a tuning
   */
  getSignatureChords(tuning: TuningInfo): TuningSpecificChord[] {
    const tuningChords = this.tuningChordLibraries.get(tuning.id) || [];
    return tuningChords.filter(chord => 
      chord.tuningDifficulty === 'easier' && 
      chord.advantages.length > 0
    );
  }

  /**
   * Find alternative chord voicings in a specific tuning
   */
  findAlternativeVoicings(
    chordName: string,
    tuning: TuningInfo,
    maxResults: number = 3
  ): ChordDiagram[] {
    const tuningSpecific = this.findTuningSpecificChord(chordName, tuning);
    if (tuningSpecific) {
      return [tuningSpecific.diagram, ...tuningSpecific.alternatives].slice(0, maxResults);
    }
    return [];
  }

  /**
   * Initialize common tuning-specific chords
   */
  private initializeCommonTuningChords(): void {
    // Drop D tuning chords
    this.addDropDChords();
    
    // DADGAD tuning chords
    this.addDADGADChords();
    
    // Open G tuning chords
    this.addOpenGChords();
    
    // Open D tuning chords
    this.addOpenDChords();
    
    // Half step down chords (same fingerings, different pitches)
    this.addHalfStepDownChords();
  }

  /**
   * Add Drop D specific chords
   */
  private addDropDChords(): void {
    const dropDTuning = tuningService.getTuningByPreset('drop_d', 'guitar')!;
    const dropDChords: TuningSpecificChord[] = [
      {
        name: 'D5',
        tuningId: dropDTuning.id,
        diagram: createChordDiagramWithTuning(
          'D5',
          'guitar',
          [
            { stringNumber: 1, fret: -1, finger: -1 },
            { stringNumber: 2, fret: -1, finger: -1 },
            { stringNumber: 3, fret: -1, finger: -1 },
            { stringNumber: 4, fret: 0, finger: 0 },
            { stringNumber: 5, fret: 0, finger: 0 },
            { stringNumber: 6, fret: 0, finger: 0 }
          ],
          dropDTuning.notes,
          'beginner'
        ),
        advantages: ['One finger power chord', 'Very easy to play', 'Perfect for heavy music'],
        tuningDifficulty: 'easier',
        alternatives: []
      },
      {
        name: 'Dm',
        tuningId: dropDTuning.id,
        diagram: createChordDiagramWithTuning(
          'Dm',
          'guitar',
          [
            { stringNumber: 1, fret: -1, finger: -1 },
            { stringNumber: 2, fret: 3, finger: 3 },
            { stringNumber: 3, fret: 2, finger: 2 },
            { stringNumber: 4, fret: 0, finger: 0 },
            { stringNumber: 5, fret: 0, finger: 0 },
            { stringNumber: 6, fret: 0, finger: 0 }
          ],
          dropDTuning.notes,
          'beginner'
        ),
        advantages: ['Open low D adds richness', 'Easy fingering'],
        tuningDifficulty: 'easier',
        alternatives: []
      }
    ];

    this.tuningChordLibraries.set(dropDTuning.id, dropDChords);
  }

  /**
   * Add DADGAD specific chords
   */
  private addDADGADChords(): void {
    const dadgadTuning = tuningService.getTuningByPreset('dadgad', 'guitar')!;
    const dadgadChords: TuningSpecificChord[] = [
      {
        name: 'Dsus4',
        tuningId: dadgadTuning.id,
        diagram: createChordDiagramWithTuning(
          'Dsus4',
          'guitar',
          [
            { stringNumber: 1, fret: 0, finger: 0 },
            { stringNumber: 2, fret: 0, finger: 0 },
            { stringNumber: 3, fret: 0, finger: 0 },
            { stringNumber: 4, fret: 0, finger: 0 },
            { stringNumber: 5, fret: 0, finger: 0 },
            { stringNumber: 6, fret: 0, finger: 0 }
          ],
          dadgadTuning.notes,
          'beginner'
        ),
        advantages: ['All open strings', 'Rich harmonic content', 'Perfect for fingerstyle'],
        tuningDifficulty: 'easier',
        alternatives: []
      }
    ];

    this.tuningChordLibraries.set(dadgadTuning.id, dadgadChords);
  }

  /**
   * Add Open G specific chords
   */
  private addOpenGChords(): void {
    const openGTuning = tuningService.getTuningByPreset('open_g', 'guitar')!;
    const openGChords: TuningSpecificChord[] = [
      {
        name: 'G',
        tuningId: openGTuning.id,
        diagram: createChordDiagramWithTuning(
          'G',
          'guitar',
          [
            { stringNumber: 1, fret: 0, finger: 0 },
            { stringNumber: 2, fret: 0, finger: 0 },
            { stringNumber: 3, fret: 0, finger: 0 },
            { stringNumber: 4, fret: 0, finger: 0 },
            { stringNumber: 5, fret: 0, finger: 0 },
            { stringNumber: 6, fret: 0, finger: 0 }
          ],
          openGTuning.notes,
          'beginner'
        ),
        advantages: ['All open strings', 'Perfect for slide guitar', 'Rich G major chord'],
        tuningDifficulty: 'easier',
        alternatives: []
      }
    ];

    this.tuningChordLibraries.set(openGTuning.id, openGChords);
  }

  /**
   * Add Open D specific chords
   */
  private addOpenDChords(): void {
    const openDTuning = tuningService.getTuningByPreset('open_d', 'guitar')!;
    const openDChords: TuningSpecificChord[] = [
      {
        name: 'D',
        tuningId: openDTuning.id,
        diagram: createChordDiagramWithTuning(
          'D',
          'guitar',
          [
            { stringNumber: 1, fret: 0, finger: 0 },
            { stringNumber: 2, fret: 0, finger: 0 },
            { stringNumber: 3, fret: 0, finger: 0 },
            { stringNumber: 4, fret: 0, finger: 0 },
            { stringNumber: 5, fret: 0, finger: 0 },
            { stringNumber: 6, fret: 0, finger: 0 }
          ],
          openDTuning.notes,
          'beginner'
        ),
        advantages: ['All open strings', 'Rich D major chord', 'Great for folk music'],
        tuningDifficulty: 'easier',
        alternatives: []
      }
    ];

    this.tuningChordLibraries.set(openDTuning.id, openDChords);
  }

  /**
   * Add half step down chords (same fingerings as standard)
   */
  private addHalfStepDownChords(): void {
    const halfStepTuning = tuningService.getTuningByPreset('half_step_down', 'guitar')!;
    // Half step down uses same fingerings but different chord names
    // This would be populated with transposed versions of standard chords
    this.tuningChordLibraries.set(halfStepTuning.id, []);
  }

  /**
   * Initialize common chord progressions for different tunings
   */
  private initializeProgressions(): void {
    const dropDTuning = tuningService.getTuningByPreset('drop_d', 'guitar')!;
    const dadgadTuning = tuningService.getTuningByPreset('dadgad', 'guitar')!;
    const openGTuning = tuningService.getTuningByPreset('open_g', 'guitar')!;

    this.progressionLibrary = [
      {
        name: 'Metal Power Chord Progression',
        chords: ['D5', 'F5', 'G5', 'D5'],
        tuning: dropDTuning,
        reason: 'Drop D makes power chords very easy with single-finger barres',
        difficulty: 'beginner',
        genres: ['metal', 'hard rock', 'grunge']
      },
      {
        name: 'Celtic Modal Progression',
        chords: ['Dsus4', 'G/D', 'A/D', 'Dsus4'],
        tuning: dadgadTuning,
        reason: 'DADGAD creates natural sus4 voicings and modal harmonies',
        difficulty: 'intermediate',
        genres: ['folk', 'celtic', 'fingerstyle']
      },
      {
        name: 'Slide Blues Progression',
        chords: ['G', 'C/G', 'D/G', 'G'],
        tuning: openGTuning,
        reason: 'Open G tuning is perfect for slide guitar and blues',
        difficulty: 'intermediate',
        genres: ['blues', 'slide guitar', 'country']
      }
    ];
  }

  /**
   * Find a tuning-specific chord by name
   */
  private findTuningSpecificChord(chordName: string, tuning: TuningInfo): TuningSpecificChord | null {
    const tuningChords = this.tuningChordLibraries.get(tuning.id) || [];
    return tuningChords.find(chord => chord.name === chordName) || null;
  }

  /**
   * Calculate confidence score for a chord in a tuning
   */
  private calculateChordConfidence(
    tuningChord: TuningSpecificChord,
    tuning: TuningInfo,
    options: any
  ): number {
    let confidence = 80; // Base confidence

    // Boost for easier chords
    if (tuningChord.tuningDifficulty === 'easier') {
      confidence += 15;
    }

    // Boost for more advantages
    confidence += Math.min(tuningChord.advantages.length * 3, 15);

    // Boost for difficulty match
    if (options.difficulty && tuningChord.diagram.difficulty === options.difficulty) {
      confidence += 10;
    }

    return Math.min(confidence, 100);
  }

  /**
   * Get standard tuning comparison description
   */
  private getStandardTuningComparison(tuningChord: TuningSpecificChord): string {
    switch (tuningChord.tuningDifficulty) {
      case 'easier':
        return `Much easier than standard tuning version`;
      case 'harder':
        return `More challenging than standard tuning version`;
      default:
        return `Similar difficulty to standard tuning version`;
    }
  }

  /**
   * Get benefits of chord adaptation
   */
  private getAdaptationBenefits(conversion: any): string[] {
    const benefits: string[] = [];
    
    if (conversion.confidence > 90) {
      benefits.push('Excellent adaptation');
    } else if (conversion.confidence > 70) {
      benefits.push('Good adaptation');
    }
    
    if (conversion.requiresCapo) {
      benefits.push(`Use capo on fret ${conversion.capoPosition}`);
    }
    
    if (conversion.notes.length === 0) {
      benefits.push('No special considerations needed');
    }
    
    return benefits;
  }
}

// Export singleton instance
export const tuningChordService = new TuningChordService();