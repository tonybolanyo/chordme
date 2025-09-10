/**
 * AI-Powered Music Insights Service
 * 
 * Provides comprehensive music analysis including chord progression analysis,
 * song structure detection, key analysis, musical complexity assessment,
 * genre classification, harmonic analysis, and learning recommendations.
 */

import { detectChordsInContent } from './chordDetectionService';
import {
  ComprehensiveMusicInsights,
  ChordProgressionAnalysis,
  SongStructureAnalysis,
  SongSection,
  KeyAnalysis,
  TempoAnalysis,
  MusicalComplexity,
  ComplexityFactor,
  GenreClassification,
  GenreCharacteristic,
  HarmonicAnalysis,
  ChordFunction,
  Cadence,
  Modulation,
  HarmonicRhythm,
  HarmonicSuggestion,
  LearningRecommendation,
  SongSimilarity,
  MusicInsightsOptions,
  MusicInsightsError
} from '../types/musicInsights';

class AIMusicInsightsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  }

  /**
   * Analyze a song's content comprehensively
   */
  async analyzeSong(
    content: string,
    options: MusicInsightsOptions = {}
  ): Promise<ComprehensiveMusicInsights> {
    const startTime = Date.now();
    
    try {
      // Extract basic chord information
      const chordDetection = detectChordsInContent(content);
      
      if (chordDetection.chordCount === 0) {
        throw new Error('No chords detected in content');
      }

      // Perform parallel analysis
      const [
        chordProgression,
        structure,
        key,
        tempo,
        complexity,
        genre,
        harmony
      ] = await Promise.all([
        this.analyzeChordProgression(chordDetection.uniqueChords, content),
        this.analyzeStructure(content),
        this.analyzeKey(chordDetection.uniqueChords),
        this.analyzeTempo(content),
        this.analyzeComplexity(chordDetection.uniqueChords, content),
        options.enableGenreClassification !== false ? 
          this.classifyGenre(chordDetection.uniqueChords, content) : 
          this.getDefaultGenre(),
        options.enableHarmonicAnalysis !== false ? 
          this.analyzeHarmony(chordDetection.uniqueChords, content) : 
          this.getDefaultHarmony()
      ]);

      // Generate learning recommendations
      const recommendations = options.enableRecommendations !== false ?
        await this.generateRecommendations(
          chordProgression,
          structure,
          complexity,
          options.userSkillLevel
        ) : [];

      const processingTime = Date.now() - startTime;
      
      const insights: ComprehensiveMusicInsights = {
        song: {
          content,
          title: this.extractTitle(content),
          artist: this.extractArtist(content)
        },
        analyzedAt: new Date().toISOString(),
        chordProgression,
        structure,
        key,
        tempo,
        complexity,
        genre,
        harmony,
        recommendations,
        overallConfidence: this.calculateOverallConfidence([
          ...chordProgression.map(p => p.confidence),
          structure.confidence,
          key.confidence,
          tempo.confidence,
          genre.confidence
        ]),
        analysisMetrics: {
          processingTime,
          algorithmsUsed: this.getUsedAlgorithms(options),
          dataQuality: this.assessDataQuality(content, chordDetection)
        }
      };

      return insights;
    } catch (error) {
      throw this.createInsightsError('ANALYSIS_FAILED', `Analysis failed: ${error.message}`, error);
    }
  }

  /**
   * Analyze chord progressions in the song
   */
  private async analyzeChordProgression(
    chords: string[],
    content: string
  ): Promise<ChordProgressionAnalysis[]> {
    const progressions: ChordProgressionAnalysis[] = [];
    
    // Get chord sequence from content
    const chordSequence = this.extractChordSequence(content);
    
    // Analyze for common progressions
    const commonProgressions = [
      {
        pattern: [0, 7, 9, 5], // I-V-vi-IV
        name: 'I-V-vi-IV',
        description: 'Popular pop progression',
        romans: ['I', 'V', 'vi', 'IV']
      },
      {
        pattern: [2, 7, 0], // ii-V-I
        name: 'ii-V-I',
        description: 'Jazz cadence',
        romans: ['ii', 'V', 'I']
      },
      {
        pattern: [9, 5, 0, 7], // vi-IV-I-V
        name: 'vi-IV-I-V',
        description: 'Descending progression',
        romans: ['vi', 'IV', 'I', 'V']
      },
      {
        pattern: [0, 5, 9, 5], // I-IV-vi-IV
        name: 'I-IV-vi-IV',
        description: 'Folk/country progression',
        romans: ['I', 'IV', 'vi', 'IV']
      }
    ];

    // Convert chord names to scale degrees
    const key = await this.detectPrimaryKey(chords);
    const scaleDegrees = this.chordsToScaleDegrees(chordSequence, key);

    for (const progression of commonProgressions) {
      const matches = this.findProgressionMatches(scaleDegrees, progression.pattern);
      
      for (const match of matches) {
        progressions.push({
          pattern: progression.pattern.join('-'),
          name: progression.name,
          description: progression.description,
          confidence: match.confidence,
          key: key,
          romanNumerals: progression.romans,
          functionalLabels: this.getFunctionalLabels(progression.romans)
        });
      }
    }

    // If no common progressions found, analyze custom patterns
    if (progressions.length === 0) {
      const customAnalysis = this.analyzeCustomProgression(scaleDegrees, key);
      progressions.push(customAnalysis);
    }

    return progressions;
  }

  /**
   * Analyze song structure from ChordPro content
   */
  private async analyzeStructure(content: string): Promise<SongStructureAnalysis> {
    const lines = content.split('\n');
    const sections: SongSection[] = [];
    let currentSection: Partial<SongSection> | null = null;
    let confidence = 0.8; // Base confidence

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detect section markers
      const sectionMatch = line.match(/\{(?:start_of_|end_of_)?(\w+)(?:\s*:\s*(\d+))?\}/);
      
      if (sectionMatch) {
        const sectionType = this.normalizeSectionType(sectionMatch[1]);
        const sectionNumber = sectionMatch[2] ? parseInt(sectionMatch[2]) : undefined;
        
        if (line.includes('start_of_')) {
          // Start new section
          currentSection = {
            type: sectionType as unknown,
            number: sectionNumber,
            startLine: i,
            chords: [],
            lyrics: [],
            confidence: 0.9
          };
        } else if (line.includes('end_of_') && currentSection) {
          // End current section
          currentSection.endLine = i;
          sections.push(currentSection as SongSection);
          currentSection = null;
        } else {
          // Simple section reference (like {chorus})
          const existingSection = sections.find(s => 
            s.type === sectionType && (!sectionNumber || s.number === sectionNumber)
          );
          
          if (existingSection) {
            // Reference to existing section
            sections.push({
              ...existingSection,
              startLine: i,
              endLine: i,
              confidence: 0.7
            });
          }
        }
      } else if (currentSection) {
        // Add content to current section
        const chordsInLine = this.extractChordsFromLine(line);
        currentSection.chords!.push(...chordsInLine);
        
        const lyrics = this.extractLyricsFromLine(line);
        if (lyrics) {
          currentSection.lyrics!.push(lyrics);
        }
      } else {
        // Content outside explicit sections - try to infer
        const inferredSection = this.inferSectionType(line, i, sections.length);
        if (inferredSection) {
          sections.push(inferredSection);
          confidence *= 0.9; // Reduce confidence for inferred sections
        }
      }
    }

    // Close any open section
    if (currentSection) {
      currentSection.endLine = lines.length - 1;
      sections.push(currentSection as SongSection);
    }

    const structure = this.generateStructurePattern(sections);
    const complexityScore = this.calculateStructureComplexity(sections);

    return {
      sections,
      structure,
      confidence,
      complexityScore,
      estimatedDuration: this.estimateDuration(sections)
    };
  }

  /**
   * Analyze the musical key of the song
   */
  private async analyzeKey(chords: string[]): Promise<KeyAnalysis> {
    // Key detection using chord analysis
    const keyScores = new Map<string, number>();
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const modes = ['major', 'minor'];

    for (const root of keys) {
      for (const mode of modes) {
        const keyName = `${root} ${mode}`;
        const score = this.calculateKeyScore(chords, root, mode);
        keyScores.set(keyName, score);
      }
    }

    // Find best matches
    const sortedKeys = Array.from(keyScores.entries())
      .sort((a, b) => b[1] - a[1]);

    const primaryKey = sortedKeys[0];
    const alternatives = sortedKeys.slice(1, 4).map(([key, score]) => ({
      key,
      confidence: score
    }));

    const [root, mode] = primaryKey[0].split(' ');
    const signature = this.getKeySignature(root, mode);

    return {
      key: primaryKey[0],
      root,
      mode,
      confidence: primaryKey[1],
      alternatives,
      signature
    };
  }

  /**
   * Analyze tempo characteristics
   */
  private async analyzeTempo(content: string): Promise<TempoAnalysis> {
    // Extract tempo markings from content
    const tempoMarking = this.extractTempoMarking(content);
    const timeSignature = this.extractTimeSignature(content);
    
    // Estimate BPM based on chord changes and content
    const bpm = this.estimateBPM(content);
    const groove = this.classifyGroove(content, bpm);

    return {
      bpm,
      confidence: bpm ? 0.6 : 0.3, // Lower confidence for estimated BPM
      timeSignature,
      tempoMarking,
      groove
    };
  }

  /**
   * Analyze musical complexity
   */
  private async analyzeComplexity(
    chords: string[],
    content: string
  ): Promise<MusicalComplexity> {
    const factors: ComplexityFactor[] = [];

    // Chord complexity
    const chordComplexity = this.calculateChordComplexity(chords);
    factors.push({
      name: 'Chord Variety',
      description: `Uses ${chords.length} unique chords`,
      impact: chordComplexity,
      category: 'chord'
    });

    // Harmonic complexity
    const harmonicComplexity = this.calculateHarmonicComplexity(chords);
    factors.push({
      name: 'Harmonic Sophistication',
      description: 'Based on chord extensions and progressions',
      impact: harmonicComplexity,
      category: 'harmony'
    });

    // Rhythmic complexity (basic analysis)
    const rhythmicComplexity = this.calculateRhythmicComplexity(content);
    factors.push({
      name: 'Rhythmic Patterns',
      description: 'Based on chord change frequency',
      impact: rhythmicComplexity,
      category: 'rhythm'
    });

    // Structure complexity
    const structureComplexity = this.calculateStructureComplexityScore(content);
    factors.push({
      name: 'Song Structure',
      description: 'Based on section variety and organization',
      impact: structureComplexity,
      category: 'structure'
    });

    const overallScore = (
      chordComplexity * 0.3 +
      harmonicComplexity * 0.3 +
      rhythmicComplexity * 0.2 +
      structureComplexity * 0.2
    );

    const difficultyLevel = this.scoreToDifficultyLevel(overallScore);

    return {
      overallScore,
      chordComplexity,
      harmonicComplexity,
      rhythmicComplexity,
      structureComplexity,
      difficultyLevel,
      factors
    };
  }

  /**
   * Classify musical genre
   */
  private async classifyGenre(
    chords: string[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    content: string
  ): Promise<GenreClassification> {
    const characteristics: GenreCharacteristic[] = [];
    const genreScores = new Map<string, number>();

    // Analyze chord patterns for genre indicators
    const jazzScore = this.calculateJazzScore(chords);
    const popScore = this.calculatePopScore(chords);
    const folkScore = this.calculateFolkScore(chords);
    const rockScore = this.calculateRockScore(chords);
    const bluesScore = this.calculateBluesScore(chords);

    genreScores.set('Jazz', jazzScore);
    genreScores.set('Pop', popScore);
    genreScores.set('Folk', folkScore);
    genreScores.set('Rock', rockScore);
    genreScores.set('Blues', bluesScore);

    // Add characteristics based on analysis
    if (jazzScore > 0.3) {
      characteristics.push({
        name: 'Jazz Harmony',
        strength: jazzScore,
        description: 'Contains extended chords and jazz progressions'
      });
    }

    if (popScore > 0.4) {
      characteristics.push({
        name: 'Pop Structure',
        strength: popScore,
        description: 'Uses common pop chord progressions'
      });
    }

    const sortedGenres = Array.from(genreScores.entries())
      .sort((a, b) => b[1] - a[1]);

    const primaryGenre = sortedGenres[0];
    const alternativeGenres = sortedGenres.slice(1, 3).map(([genre, score]) => ({
      genre,
      confidence: score,
      reasoning: this.getGenreReasoning(genre, score)
    }));

    return {
      primaryGenre: primaryGenre[0],
      confidence: primaryGenre[1],
      alternativeGenres,
      characteristics
    };
  }

  /**
   * Perform harmonic analysis
   */
  private async analyzeHarmony(
    chords: string[],
    content: string
  ): Promise<HarmonicAnalysis> {
    const chordSequence = this.extractChordSequence(content);
    const key = await this.detectPrimaryKey(chords);

    // Analyze chord functions
    const chordFunctions = this.analyzeChordFunctions(chordSequence, key);
    
    // Detect cadences
    const cadences = this.detectCadences(chordFunctions);
    
    // Detect modulations
    const modulations = this.detectModulations(chordSequence);
    
    // Analyze harmonic rhythm
    const harmonicRhythm = this.analyzeHarmonicRhythm(content);
    
    // Generate suggestions
    const suggestions = this.generateHarmonicSuggestions(chordFunctions, key);

    return {
      chordFunctions,
      cadences,
      modulations,
      harmonicRhythm,
      suggestions
    };
  }

  /**
   * Generate learning recommendations
   */
  private async generateRecommendations(
    progressions: ChordProgressionAnalysis[],
    structure: SongStructureAnalysis,
    complexity: MusicalComplexity,
    userSkillLevel: string = 'intermediate'
  ): Promise<LearningRecommendation[]> {
    const recommendations: LearningRecommendation[] = [];

    // Recommendations based on complexity
    if (complexity.overallScore > 0.7 && userSkillLevel === 'beginner') {
      recommendations.push({
        type: 'practice',
        priority: 'high',
        title: 'Simplify Chord Progressions',
        description: 'This song has complex harmonies. Try practicing with simpler chord substitutions first.',
        estimatedTime: '2-3 weeks',
        difficulty: 'beginner',
        resources: [{
          type: 'tutorial',
          title: 'Basic Chord Substitutions',
          description: 'Learn simple chord alternatives'
        }]
      });
    }

    // Recommendations based on chord progressions
    for (const progression of progressions) {
      if (progression.name === 'ii-V-I' && userSkillLevel !== 'beginner') {
        recommendations.push({
          type: 'theory',
          priority: 'medium',
          title: 'Master Jazz Progressions',
          description: 'This song uses ii-V-I progressions. Study jazz harmony to understand these better.',
          estimatedTime: '1-2 months',
          difficulty: 'intermediate',
          resources: [{
            type: 'tutorial',
            title: 'Jazz Harmony Fundamentals',
            description: 'Understanding ii-V-I progressions'
          }]
        });
      }
    }

    // Recommendations based on structure
    if (structure.complexityScore > 0.8) {
      recommendations.push({
        type: 'technique',
        priority: 'medium',
        title: 'Practice Song Arrangement',
        description: 'This song has a complex structure. Practice transitioning between sections smoothly.',
        estimatedTime: '1-2 weeks',
        difficulty: 'intermediate'
      });
    }

    return recommendations;
  }

  // Helper methods

  private extractTitle(content: string): string | undefined {
    const match = content.match(/\{title:\s*([^}]+)\}/i);
    return match ? match[1].trim() : undefined;
  }

  private extractArtist(content: string): string | undefined {
    const match = content.match(/\{artist:\s*([^}]+)\}/i);
    return match ? match[1].trim() : undefined;
  }

  private extractChordSequence(content: string): string[] {
    const chords: string[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const chordMatches = line.match(/\[([^\]]+)\]/g);
      if (chordMatches) {
        chords.push(...chordMatches.map(match => match.slice(1, -1)));
      }
    }
    
    return chords;
  }

  private calculateOverallConfidence(confidences: number[]): number {
    return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
  }

  private getUsedAlgorithms(options: MusicInsightsOptions): string[] {
    const algorithms = ['chord_detection', 'structure_analysis', 'key_detection'];
    
    if (options.enableHarmonicAnalysis !== false) {
      algorithms.push('harmonic_analysis');
    }
    
    if (options.enableGenreClassification !== false) {
      algorithms.push('genre_classification');
    }
    
    if (options.enableRecommendations !== false) {
      algorithms.push('learning_recommendations');
    }
    
    return algorithms;
  }

  private assessDataQuality(content: string, chordDetection: unknown): number {
    let quality = 1.0;
    
    // Reduce quality if very few chords
    if (chordDetection.chordCount < 4) {
      quality *= 0.7;
    }
    
    // Reduce quality if content is very short
    if (content.length < 100) {
      quality *= 0.8;
    }
    
    // Reduce quality if many invalid chords
    const invalidRatio = 1 - (chordDetection.uniqueChordCount / chordDetection.chordCount);
    quality *= (1 - invalidRatio * 0.5);
    
    return Math.max(0, Math.min(1, quality));
  }

  private createInsightsError(code: string, message: string, details?: unknown): MusicInsightsError {
    return { code, message, details };
  }

  // Placeholder implementations for complex algorithms
  private async detectPrimaryKey(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    chords: string[]
  ): Promise<string> {
    // Simplified key detection - would need more sophisticated algorithm
    return 'C major';
  }

  private chordsToScaleDegrees(chords: string[], key: string): number[] {
    // Convert chord names to scale degrees based on key
    // This is a simplified implementation
    const noteMap = new Map([
      ['C', 0], ['C#', 1], ['Db', 1], ['D', 2], ['D#', 3], ['Eb', 3],
      ['E', 4], ['F', 5], ['F#', 6], ['Gb', 6], ['G', 7], ['G#', 8],
      ['Ab', 8], ['A', 9], ['A#', 10], ['Bb', 10], ['B', 11]
    ]);

    const keyRoot = noteMap.get(key.split(' ')[0]) || 0;
    
    return chords.map(chord => {
      const root = chord.match(/^[A-G][#b]?/)?.[0] || 'C';
      const noteValue = noteMap.get(root) || 0;
      return (noteValue - keyRoot + 12) % 12;
    });
  }

  private findProgressionMatches(scaleDegrees: number[], pattern: number[]): Array<{confidence: number}> {
    const matches = [];
    const patternLength = pattern.length;
    
    for (let i = 0; i <= scaleDegrees.length - patternLength; i++) {
      const segment = scaleDegrees.slice(i, i + patternLength);
      const similarity = this.calculatePatternSimilarity(segment, pattern);
      
      if (similarity > 0.7) {
        matches.push({ confidence: similarity });
      }
    }
    
    return matches;
  }

  private calculatePatternSimilarity(segment: number[], pattern: number[]): number {
    let matches = 0;
    for (let i = 0; i < pattern.length; i++) {
      if (segment[i] === pattern[i]) {
        matches++;
      }
    }
    return matches / pattern.length;
  }

  private analyzeCustomProgression(scaleDegrees: number[], key: string): ChordProgressionAnalysis {
    return {
      pattern: scaleDegrees.join('-'),
      name: 'Custom Progression',
      description: 'Unique chord progression not matching common patterns',
      confidence: 0.6,
      key,
      romanNumerals: this.scaleDegreesToRomanNumerals(scaleDegrees),
      functionalLabels: this.scaleDegreesToFunctionalLabels(scaleDegrees)
    };
  }

  private getFunctionalLabels(romans: string[]): string[] {
    const functionMap: Record<string, string> = {
      'I': 'tonic', 'ii': 'predominant', 'iii': 'tonic', 'IV': 'predominant',
      'V': 'dominant', 'vi': 'tonic', 'vii°': 'dominant'
    };
    
    return romans.map(roman => functionMap[roman] || 'other');
  }

  private scaleDegreesToRomanNumerals(degrees: number[]): string[] {
    const romanMap = ['I', 'bII', 'ii', 'bIII', 'iii', 'IV', 'bV', 'V', 'bVI', 'vi', 'bVII', 'vii°'];
    return degrees.map(degree => romanMap[degree] || 'I');
  }

  private scaleDegreesToFunctionalLabels(degrees: number[]): string[] {
    return degrees.map(degree => {
      switch (degree) {
        case 0: case 4: case 9: return 'tonic';
        case 2: case 5: return 'predominant';
        case 7: case 11: return 'dominant';
        default: return 'other';
      }
    });
  }

  private normalizeSectionType(type: string): string {
    const typeMap: Record<string, string> = {
      'verse': 'verse',
      'chorus': 'chorus',
      'bridge': 'bridge',
      'intro': 'intro',
      'outro': 'outro',
      'prechorus': 'pre-chorus',
      'instrumental': 'instrumental'
    };
    
    return typeMap[type.toLowerCase()] || 'unknown';
  }

  private extractChordsFromLine(line: string): string[] {
    const matches = line.match(/\[([^\]]+)\]/g);
    return matches ? matches.map(match => match.slice(1, -1)) : [];
  }

  private extractLyricsFromLine(line: string): string | null {
    // Remove chord brackets and trim
    const lyrics = line.replace(/\[([^\]]+)\]/g, '').trim();
    return lyrics.length > 0 ? lyrics : null;
  }

  private inferSectionType(
    line: string, 
    lineIndex: number, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sectionCount: number
  ): SongSection | null {
    // Simple heuristics for section inference
    if (lineIndex === 0 && this.extractChordsFromLine(line).length > 0) {
      return {
        type: 'intro',
        startLine: lineIndex,
        endLine: lineIndex,
        chords: this.extractChordsFromLine(line),
        lyrics: [this.extractLyricsFromLine(line)].filter(Boolean),
        confidence: 0.6
      };
    }
    
    return null;
  }

  private generateStructurePattern(sections: SongSection[]): string {
    return sections.map(section => {
      const type = section.type.charAt(0).toUpperCase();
      return section.number ? `${type}${section.number}` : type;
    }).join('-');
  }

  private calculateStructureComplexity(sections: SongSection[]): number {
    const uniqueTypes = new Set(sections.map(s => s.type));
    const repetitions = sections.length - uniqueTypes.size;
    
    // More unique sections and fewer repetitions = higher complexity
    return Math.min(1, (uniqueTypes.size * 0.3 + repetitions * 0.1));
  }

  private estimateDuration(sections: SongSection[]): number {
    // Rough estimation: 30 seconds per section on average
    return sections.length * 30;
  }

  private calculateKeyScore(chords: string[], root: string, mode: string): number {
    // Simplified key scoring based on chord membership
    const scale = this.getScale(root, mode);
    let score = 0;
    
    for (const chord of chords) {
      const chordRoot = chord.match(/^[A-G][#b]?/)?.[0];
      if (chordRoot && scale.includes(chordRoot)) {
        score += 1;
      }
    }
    
    return chords.length > 0 ? score / chords.length : 0;
  }

  private getScale(root: string, mode: string): string[] {
    // Simplified scale generation
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const rootIndex = notes.indexOf(root);
    
    if (rootIndex === -1) return [];
    
    const intervals = mode === 'major' ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10];
    
    return intervals.map(interval => notes[(rootIndex + interval) % 12]);
  }

  private getKeySignature(root: string, mode: string): { sharps: number; flats: number; accidentals: string[] } {
    // Simplified key signature calculation
    const signatures: Record<string, unknown> = {
      'C major': { sharps: 0, flats: 0, accidentals: [] },
      'G major': { sharps: 1, flats: 0, accidentals: ['F#'] },
      'F major': { sharps: 0, flats: 1, accidentals: ['Bb'] },
      'A minor': { sharps: 0, flats: 0, accidentals: [] },
      // Add more as needed
    };
    
    return signatures[`${root} ${mode}`] || { sharps: 0, flats: 0, accidentals: [] };
  }

  private extractTempoMarking(content: string): string | undefined {
    const match = content.match(/\{tempo:\s*([^}]+)\}/i);
    return match ? match[1].trim() : undefined;
  }

  private extractTimeSignature(content: string): string | undefined {
    const match = content.match(/\{time:\s*([^}]+)\}/i);
    return match ? match[1].trim() : '4/4'; // Default to 4/4
  }

  private estimateBPM(content: string): number | undefined {
    // Very basic BPM estimation based on chord density
    const chordCount = (content.match(/\[([^\]]+)\]/g) || []).length;
    const lineCount = content.split('\n').length;
    
    if (chordCount === 0 || lineCount === 0) return undefined;
    
    const chordsPerLine = chordCount / lineCount;
    
    // Rough estimation
    if (chordsPerLine > 4) return 140; // Fast tempo
    if (chordsPerLine > 2) return 120; // Medium tempo
    return 80; // Slow tempo
  }

  private classifyGroove(content: string, bpm?: number): 'straight' | 'swing' | 'shuffle' | 'latin' | 'ballad' {
    if (bpm && bpm < 70) return 'ballad';
    if (bpm && bpm > 140) return 'straight';
    
    // Check for style indicators in content
    if (content.toLowerCase().includes('swing')) return 'swing';
    if (content.toLowerCase().includes('shuffle')) return 'shuffle';
    if (content.toLowerCase().includes('latin') || content.toLowerCase().includes('bossa')) return 'latin';
    
    return 'straight';
  }

  private calculateChordComplexity(chords: string[]): number {
    let complexity = 0;
    
    for (const chord of chords) {
      // Basic triads: low complexity
      if (/^[A-G][#b]?m?$/.test(chord)) {
        complexity += 0.1;
      }
      // Seventh chords: medium complexity
      else if (/^[A-G][#b]?.*7/.test(chord)) {
        complexity += 0.3;
      }
      // Extended chords: high complexity
      else if (/^[A-G][#b]?.*(9|11|13)/.test(chord)) {
        complexity += 0.5;
      }
      // Very complex chords
      else {
        complexity += 0.7;
      }
    }
    
    return Math.min(1, complexity / chords.length);
  }

  private calculateHarmonicComplexity(chords: string[]): number {
    // Analyze chord relationships and progressions
    // This is a simplified implementation
    const uniqueChords = new Set(chords);
    return Math.min(1, uniqueChords.size / 12); // Normalize to 0-1
  }

  private calculateRhythmicComplexity(content: string): number {
    // Basic rhythmic complexity based on chord changes
    const lines = content.split('\n');
    let totalChords = 0;
    let nonEmptyLines = 0;
    
    for (const line of lines) {
      const chords = line.match(/\[([^\]]+)\]/g);
      if (chords) {
        totalChords += chords.length;
        nonEmptyLines++;
      }
    }
    
    if (nonEmptyLines === 0) return 0;
    
    const avgChordsPerLine = totalChords / nonEmptyLines;
    return Math.min(1, avgChordsPerLine / 8); // Normalize assuming max 8 chords per line
  }

  private calculateStructureComplexityScore(content: string): number {
    const sectionMarkers = content.match(/\{(?:start_of_|end_of_)?(\w+)/g) || [];
    const uniqueSections = new Set(sectionMarkers);
    
    return Math.min(1, uniqueSections.size / 10); // Normalize assuming max 10 section types
  }

  private scoreToDifficultyLevel(score: number): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
    if (score < 0.3) return 'beginner';
    if (score < 0.6) return 'intermediate';
    if (score < 0.8) return 'advanced';
    return 'expert';
  }

  private calculateJazzScore(chords: string[]): number {
    let jazzElements = 0;
    
    for (const chord of chords) {
      // Seventh chords are common in jazz
      if (/7/.test(chord)) jazzElements++;
      // Extended chords
      if (/(9|11|13)/.test(chord)) jazzElements += 2;
      // Altered chords
      if (/[#b](5|9|11)/.test(chord)) jazzElements += 2;
    }
    
    return Math.min(1, jazzElements / (chords.length * 2));
  }

  private calculatePopScore(chords: string[]): number {
    // Check for common pop progressions and simple chords
    const simpleChords = chords.filter(chord => /^[A-G][#b]?m?$/.test(chord));
    return simpleChords.length / chords.length;
  }

  private calculateFolkScore(chords: string[]): number {
    // Folk music typically uses basic open chords
    const folkChords = ['C', 'D', 'E', 'F', 'G', 'A', 'Am', 'Dm', 'Em'];
    const folkElements = chords.filter(chord => folkChords.includes(chord));
    return folkElements.length / chords.length;
  }

  private calculateRockScore(chords: string[]): number {
    // Rock often uses power chords and basic triads
    const rockChords = chords.filter(chord => 
      /^[A-G][#b]?m?$/.test(chord) || /5$/.test(chord)
    );
    return rockChords.length / chords.length;
  }

  private calculateBluesScore(chords: string[]): number {
    // Blues typically uses dominant 7th chords and specific progressions
    const bluesElements = chords.filter(chord => /7$/.test(chord));
    return bluesElements.length / chords.length;
  }

  private getGenreReasoning(genre: string, score: number): string {
    if (score > 0.7) return `Strong ${genre.toLowerCase()} characteristics`;
    if (score > 0.4) return `Some ${genre.toLowerCase()} elements`;
    return `Weak ${genre.toLowerCase()} similarity`;
  }

  private analyzeChordFunctions(chords: string[], key: string): ChordFunction[] {
    // Simplified chord function analysis
    return chords.map((chord, index) => ({
      chord,
      function: this.getChordFunction(chord, key),
      position: index,
      role: this.getHarmonicRole(chord, key)
    }));
  }

  private getChordFunction(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    chord: string, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    key: string
  ): string {
    // Simplified function analysis
    // This would need more sophisticated harmonic analysis
    return 'I'; // Placeholder
  }

  private getHarmonicRole(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    chord: string, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    key: string
  ): 'tonic' | 'predominant' | 'dominant' | 'passing' | 'neighbor' | 'other' {
    // Simplified role analysis
    return 'tonic'; // Placeholder
  }

  private detectCadences(functions: ChordFunction[]): Cadence[] {
    const cadences: Cadence[] = [];
    
    // Look for V-I patterns (authentic cadence)
    for (let i = 0; i < functions.length - 1; i++) {
      if (functions[i].role === 'dominant' && functions[i + 1].role === 'tonic') {
        cadences.push({
          type: 'authentic',
          startPosition: i,
          endPosition: i + 1,
          strength: 0.8
        });
      }
    }
    
    return cadences;
  }

  private detectModulations(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    chords: string[]
  ): Modulation[] {
    // Simplified modulation detection
    // This would need sophisticated harmonic analysis
    return [];
  }

  private analyzeHarmonicRhythm(content: string): HarmonicRhythm {
    const lines = content.split('\n').filter(line => line.includes('['));
    const chordChanges = lines.map(line => (line.match(/\[([^\]]+)\]/g) || []).length);
    
    const averageChanges = chordChanges.reduce((sum, changes) => sum + changes, 0) / chordChanges.length;
    
    let pattern: 'slow' | 'moderate' | 'fast' | 'variable' = 'moderate';
    if (averageChanges < 2) pattern = 'slow';
    else if (averageChanges > 4) pattern = 'fast';
    
    return {
      changesPerMeasure: averageChanges,
      pattern,
      accelerations: [] // Would need more analysis
    };
  }

  private generateHarmonicSuggestions(
    functions: ChordFunction[], 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    key: string
  ): HarmonicSuggestion[] {
    const suggestions: HarmonicSuggestion[] = [];
    
    // Example suggestion: add dominant before tonic
    for (let i = 0; i < functions.length - 1; i++) {
      if (functions[i].role !== 'dominant' && functions[i + 1].role === 'tonic') {
        suggestions.push({
          type: 'addition',
          position: i + 1,
          originalChord: functions[i].chord,
          suggestedChord: 'G7', // Simplified - would calculate proper dominant
          reason: 'Add dominant chord before tonic for stronger resolution',
          improvement: 'Creates stronger cadential effect'
        });
      }
    }
    
    return suggestions;
  }

  private getDefaultGenre(): GenreClassification {
    return {
      primaryGenre: 'Unknown',
      confidence: 0,
      alternativeGenres: [],
      characteristics: []
    };
  }

  private getDefaultHarmony(): HarmonicAnalysis {
    return {
      chordFunctions: [],
      cadences: [],
      modulations: [],
      harmonicRhythm: {
        changesPerMeasure: 0,
        pattern: 'moderate',
        accelerations: []
      },
      suggestions: []
    };
  }

  /**
   * Compare two songs for similarity
   */
  async compareSongs(
    song1Content: string,
    song2Content: string,
    options: MusicInsightsOptions = {}
  ): Promise<SongSimilarity> {
    const [analysis1, analysis2] = await Promise.all([
      this.analyzeSong(song1Content, options),
      this.analyzeSong(song2Content, options)
    ]);

    const aspects = [
      {
        aspect: 'chord_progression' as const,
        score: this.compareChordProgressions(analysis1.chordProgression, analysis2.chordProgression),
        weight: 0.3
      },
      {
        aspect: 'structure' as const,
        score: this.compareStructures(analysis1.structure, analysis2.structure),
        weight: 0.2
      },
      {
        aspect: 'key' as const,
        score: this.compareKeys(analysis1.key, analysis2.key),
        weight: 0.15
      },
      {
        aspect: 'genre' as const,
        score: this.compareGenres(analysis1.genre, analysis2.genre),
        weight: 0.15
      },
      {
        aspect: 'complexity' as const,
        score: this.compareComplexity(analysis1.complexity, analysis2.complexity),
        weight: 0.2
      }
    ];

    const overallSimilarity = aspects.reduce((sum, aspect) => 
      sum + (aspect.score * aspect.weight), 0
    );

    return {
      targetSong: analysis2.song.title || 'Unknown',
      similarity: overallSimilarity,
      similarityAspects: aspects,
      commonCharacteristics: this.findCommonCharacteristics(analysis1, analysis2),
      differences: this.findDifferences(analysis1, analysis2)
    };
  }

  private compareChordProgressions(prog1: ChordProgressionAnalysis[], prog2: ChordProgressionAnalysis[]): number {
    // Compare progression patterns
    const patterns1 = new Set(prog1.map(p => p.pattern));
    const patterns2 = new Set(prog2.map(p => p.pattern));
    
    const intersection = new Set([...patterns1].filter(p => patterns2.has(p)));
    const union = new Set([...patterns1, ...patterns2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private compareStructures(struct1: SongStructureAnalysis, struct2: SongStructureAnalysis): number {
    // Compare structure patterns
    return struct1.structure === struct2.structure ? 1 : 0.5;
  }

  private compareKeys(key1: KeyAnalysis, key2: KeyAnalysis): number {
    if (key1.key === key2.key) return 1;
    if (key1.root === key2.root) return 0.7; // Same root, different mode
    return 0; // Different keys
  }

  private compareGenres(genre1: GenreClassification, genre2: GenreClassification): number {
    if (genre1.primaryGenre === genre2.primaryGenre) return 1;
    
    // Check if genres appear in alternatives
    const alt1 = genre1.alternativeGenres.map(g => g.genre);
    const alt2 = genre2.alternativeGenres.map(g => g.genre);
    
    if (alt1.includes(genre2.primaryGenre) || alt2.includes(genre1.primaryGenre)) {
      return 0.7;
    }
    
    return 0;
  }

  private compareComplexity(comp1: MusicalComplexity, comp2: MusicalComplexity): number {
    const diff = Math.abs(comp1.overallScore - comp2.overallScore);
    return 1 - diff; // Inverse of difference
  }

  private findCommonCharacteristics(analysis1: ComprehensiveMusicInsights, analysis2: ComprehensiveMusicInsights): string[] {
    const characteristics: string[] = [];
    
    if (analysis1.key.mode === analysis2.key.mode) {
      characteristics.push(`Both in ${analysis1.key.mode} mode`);
    }
    
    if (analysis1.complexity.difficultyLevel === analysis2.complexity.difficultyLevel) {
      characteristics.push(`Similar difficulty level: ${analysis1.complexity.difficultyLevel}`);
    }
    
    return characteristics;
  }

  private findDifferences(analysis1: ComprehensiveMusicInsights, analysis2: ComprehensiveMusicInsights): string[] {
    const differences: string[] = [];
    
    if (analysis1.genre.primaryGenre !== analysis2.genre.primaryGenre) {
      differences.push(`Different genres: ${analysis1.genre.primaryGenre} vs ${analysis2.genre.primaryGenre}`);
    }
    
    if (Math.abs(analysis1.complexity.overallScore - analysis2.complexity.overallScore) > 0.3) {
      differences.push(`Significantly different complexity levels`);
    }
    
    return differences;
  }
}

export const aiMusicInsightsService = new AIMusicInsightsService();
export default aiMusicInsightsService;