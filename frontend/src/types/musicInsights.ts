/**
 * AI-Powered Music Insights Types
 * 
 * Defines types for comprehensive music analysis including chord progression analysis,
 * song structure detection, key analysis, musical complexity assessment, and recommendations.
 */

export interface ChordProgressionAnalysis {
  /** Detected chord progression pattern */
  pattern: string;
  /** Common name for the progression (e.g., "I-V-vi-IV", "Circle of Fifths") */
  name?: string;
  /** Description of the progression */
  description?: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Musical key context */
  key?: string;
  /** Roman numeral notation */
  romanNumerals?: string[];
  /** Functional harmony labels */
  functionalLabels?: string[];
}

export interface SongStructureAnalysis {
  /** Detected sections with their types */
  sections: SongSection[];
  /** Overall song structure pattern */
  structure: string;
  /** Confidence in structure detection (0-1) */
  confidence: number;
  /** Total estimated duration */
  estimatedDuration?: number;
  /** Structure complexity score */
  complexityScore: number;
}

export interface SongSection {
  /** Section type (verse, chorus, bridge, etc.) */
  type: 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro' | 'pre-chorus' | 'instrumental' | 'unknown';
  /** Section number (for verses, choruses with multiple instances) */
  number?: number;
  /** Start line in ChordPro content */
  startLine: number;
  /** End line in ChordPro content */
  endLine: number;
  /** Chord progression in this section */
  chords: string[];
  /** Lyrical content lines */
  lyrics?: string[];
  /** Confidence in section detection (0-1) */
  confidence: number;
}

export interface KeyAnalysis {
  /** Detected key (e.g., "C major", "A minor") */
  key: string;
  /** Root note */
  root: string;
  /** Mode (major, minor, dorian, etc.) */
  mode: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Alternative key suggestions */
  alternatives: Array<{
    key: string;
    confidence: number;
  }>;
  /** Key signature information */
  signature: {
    sharps: number;
    flats: number;
    accidentals: string[];
  };
}

export interface TempoAnalysis {
  /** Estimated BPM */
  bpm?: number;
  /** Confidence in BPM estimation (0-1) */
  confidence: number;
  /** Time signature */
  timeSignature?: string;
  /** Tempo marking (Allegro, Andante, etc.) */
  tempoMarking?: string;
  /** Groove/feel classification */
  groove?: 'straight' | 'swing' | 'shuffle' | 'latin' | 'ballad';
}

export interface MusicalComplexity {
  /** Overall complexity score (0-1) */
  overallScore: number;
  /** Chord complexity (0-1) */
  chordComplexity: number;
  /** Harmonic complexity (0-1) */
  harmonicComplexity: number;
  /** Rhythmic complexity (0-1) */
  rhythmicComplexity: number;
  /** Structure complexity (0-1) */
  structureComplexity: number;
  /** Difficulty level for players */
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  /** Specific complexity factors */
  factors: ComplexityFactor[];
}

export interface ComplexityFactor {
  /** Factor name */
  name: string;
  /** Factor description */
  description: string;
  /** Impact on complexity (0-1) */
  impact: number;
  /** Category of complexity */
  category: 'chord' | 'harmony' | 'rhythm' | 'structure' | 'technique';
}

export interface GenreClassification {
  /** Predicted genre */
  primaryGenre: string;
  /** Confidence in primary genre (0-1) */
  confidence: number;
  /** Alternative genre suggestions */
  alternativeGenres: Array<{
    genre: string;
    confidence: number;
    reasoning?: string;
  }>;
  /** Musical characteristics that influenced classification */
  characteristics: GenreCharacteristic[];
}

export interface GenreCharacteristic {
  /** Characteristic name */
  name: string;
  /** How strongly it indicates this genre (0-1) */
  strength: number;
  /** Description of the characteristic */
  description: string;
}

export interface HarmonicAnalysis {
  /** Chord function analysis */
  chordFunctions: ChordFunction[];
  /** Detected cadences */
  cadences: Cadence[];
  /** Modulations (key changes) */
  modulations: Modulation[];
  /** Harmonic rhythm analysis */
  harmonicRhythm: HarmonicRhythm;
  /** Voice leading analysis */
  voiceLeading?: VoiceLeading;
  /** Suggested improvements */
  suggestions: HarmonicSuggestion[];
}

export interface ChordFunction {
  /** Chord symbol */
  chord: string;
  /** Functional label (I, ii, V7, etc.) */
  function: string;
  /** Position in the progression */
  position: number;
  /** Harmonic role */
  role: 'tonic' | 'predominant' | 'dominant' | 'passing' | 'neighbor' | 'other';
}

export interface Cadence {
  /** Type of cadence */
  type: 'authentic' | 'plagal' | 'deceptive' | 'half' | 'phrygian';
  /** Start position in chord progression */
  startPosition: number;
  /** End position in chord progression */
  endPosition: number;
  /** Strength of the cadence (0-1) */
  strength: number;
}

export interface Modulation {
  /** Source key */
  fromKey: string;
  /** Target key */
  toKey: string;
  /** Position where modulation occurs */
  position: number;
  /** Type of modulation */
  type: 'pivot' | 'direct' | 'sequential' | 'chromatic';
  /** Confidence in detection (0-1) */
  confidence: number;
}

export interface HarmonicRhythm {
  /** Average chord changes per measure */
  changesPerMeasure: number;
  /** Harmonic rhythm pattern */
  pattern: 'slow' | 'moderate' | 'fast' | 'variable';
  /** Harmonic acceleration points */
  accelerations: number[];
}

export interface VoiceLeading {
  /** Quality of voice leading (0-1) */
  quality: number;
  /** Parallel motion instances */
  parallelMotion: number;
  /** Contrary motion instances */
  contraryMotion: number;
  /** Voice leading suggestions */
  suggestions: string[];
}

export interface HarmonicSuggestion {
  /** Type of suggestion */
  type: 'substitution' | 'addition' | 'removal' | 'reharmonization';
  /** Position where suggestion applies */
  position: number;
  /** Original chord */
  originalChord: string;
  /** Suggested chord */
  suggestedChord: string;
  /** Reason for the suggestion */
  reason: string;
  /** Expected improvement */
  improvement: string;
}

export interface SongSimilarity {
  /** Target song for comparison */
  targetSong: string;
  /** Similarity score (0-1) */
  similarity: number;
  /** Aspects of similarity */
  similarityAspects: SimilarityAspect[];
  /** Common characteristics */
  commonCharacteristics: string[];
  /** Key differences */
  differences: string[];
}

export interface SimilarityAspect {
  /** Aspect name */
  aspect: 'chord_progression' | 'structure' | 'key' | 'tempo' | 'genre' | 'complexity';
  /** Similarity score for this aspect (0-1) */
  score: number;
  /** Weight of this aspect in overall similarity */
  weight: number;
}

export interface LearningRecommendation {
  /** Type of recommendation */
  type: 'technique' | 'practice' | 'theory' | 'repertoire' | 'performance';
  /** Priority level */
  priority: 'high' | 'medium' | 'low';
  /** Recommendation title */
  title: string;
  /** Detailed description */
  description: string;
  /** Estimated time to implement */
  estimatedTime?: string;
  /** Difficulty level */
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  /** Related resources */
  resources?: LearningResource[];
}

export interface LearningResource {
  /** Resource type */
  type: 'tutorial' | 'exercise' | 'song' | 'video' | 'article';
  /** Resource title */
  title: string;
  /** Resource URL or identifier */
  url?: string;
  /** Brief description */
  description?: string;
}

export interface ComprehensiveMusicInsights {
  /** Song metadata */
  song: {
    title?: string;
    artist?: string;
    content: string;
  };
  /** Analysis timestamp */
  analyzedAt: string;
  /** Chord progression analysis */
  chordProgression: ChordProgressionAnalysis[];
  /** Song structure analysis */
  structure: SongStructureAnalysis;
  /** Key analysis */
  key: KeyAnalysis;
  /** Tempo analysis */
  tempo: TempoAnalysis;
  /** Musical complexity assessment */
  complexity: MusicalComplexity;
  /** Genre classification */
  genre: GenreClassification;
  /** Harmonic analysis */
  harmony: HarmonicAnalysis;
  /** Learning recommendations */
  recommendations: LearningRecommendation[];
  /** Analysis confidence (0-1) */
  overallConfidence: number;
  /** Performance metrics */
  analysisMetrics: {
    processingTime: number;
    algorithmsUsed: string[];
    dataQuality: number;
  };
}

export interface MusicInsightsError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Additional error details */
  details?: Record<string, unknown>;
}

export interface MusicInsightsOptions {
  /** Enable detailed harmonic analysis */
  enableHarmonicAnalysis?: boolean;
  /** Enable genre classification */
  enableGenreClassification?: boolean;
  /** Enable learning recommendations */
  enableRecommendations?: boolean;
  /** Analysis depth level */
  analysisDepth?: 'basic' | 'standard' | 'comprehensive';
  /** User skill level for personalized recommendations */
  userSkillLevel?: 'beginner' | 'intermediate' | 'advanced';
  /** Preferred musical styles for recommendations */
  preferredStyles?: string[];
}