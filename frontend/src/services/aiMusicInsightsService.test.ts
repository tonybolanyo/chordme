/**
 * AI Music Insights Service Tests
 * 
 * Comprehensive test suite for the AI-powered music analysis functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import aiMusicInsightsService from './aiMusicInsightsService';
import { MusicInsightsOptions } from '../types/musicInsights';

// Mock dependencies
vi.mock('./chordRecognition', () => ({
  chordRecognitionEngine: {
    isValidChord: vi.fn((chord: string) => {
      // Mock validation for common chords
      const validChords = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Am', 'Dm', 'Em', 'F7', 'G7', 'Cmaj7', 'Am7'];
      return validChords.includes(chord);
    })
  }
}));

vi.mock('./chordDetectionService', () => ({
  detectChordsInContent: vi.fn((content: string) => {
    const chords = (content.match(/\[([^\]]+)\]/g) || []).map(match => match.slice(1, -1));
    const uniqueChords = [...new Set(chords)];
    return {
      chords: chords.map((chord, index) => ({
        chord,
        start: index * 10,
        end: index * 10 + chord.length + 2,
        line: 0,
        column: index * 10,
        isValid: true
      })),
      uniqueChords,
      chordCount: chords.length,
      uniqueChordCount: uniqueChords.length
    };
  })
}));

describe('AIMusicInsightsService', () => {
  const sampleChordProContent = `{title: Test Song}
{artist: Test Artist}
{key: C}

{start_of_verse: 1}
[C]This is a test [F]song with some [G]chords
[Am]Playing around [F]with the pro[C]gression
{end_of_verse}

{start_of_chorus}
[F]This is the [C]chorus part
[G]With a simple [Am]pattern
{end_of_chorus}

{start_of_bridge}
[Dm]Something different [G]here
[Em]To add some [Am]variety
{end_of_bridge}`;

  const complexJazzContent = `{title: Jazz Standard}
{artist: Jazz Artist}

{start_of_verse}
[Cmaj7]Jazz has [Am7]complex [Dm7]harmonies [G7]throughout
[Em7]Extended [A7]chords and [Dm7]seventh [G7]chords
{end_of_verse}

{start_of_chorus}
[Fmaj7]Modal [Bm7b5]interchange [E7]creates [Am7]interest
[D7]Secondary [G7]dominants [Cmaj7]resolve
{end_of_chorus}`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Song Analysis', () => {
    it('should analyze a basic song successfully', async () => {
      const insights = await aiMusicInsightsService.analyzeSong(sampleChordProContent);

      expect(insights).toBeDefined();
      expect(insights.song.title).toBe('Test Song');
      expect(insights.song.artist).toBe('Test Artist');
      expect(insights.analyzedAt).toBeDefined();
      expect(insights.overallConfidence).toBeGreaterThan(0);
      expect(insights.analysisMetrics.processingTime).toBeGreaterThan(0);
    });

    it('should handle content with no chords', async () => {
      const contentWithoutChords = `{title: No Chords}
Just lyrics without any chord markings
This should trigger an error`;

      await expect(aiMusicInsightsService.analyzeSong(contentWithoutChords))
        .rejects.toThrow('No chords detected in content');
    });

    it('should respect analysis options', async () => {
      const options: MusicInsightsOptions = {
        enableGenreClassification: false,
        enableHarmonicAnalysis: false,
        enableRecommendations: false,
        analysisDepth: 'basic'
      };

      const insights = await aiMusicInsightsService.analyzeSong(sampleChordProContent, options);

      expect(insights.genre.primaryGenre).toBe('Unknown');
      expect(insights.harmony.chordFunctions).toHaveLength(0);
      expect(insights.recommendations).toHaveLength(0);
    });

    it('should generate learning recommendations based on user skill level', async () => {
      const options: MusicInsightsOptions = {
        userSkillLevel: 'beginner',
        enableRecommendations: true
      };

      const insights = await aiMusicInsightsService.analyzeSong(complexJazzContent, options);

      expect(insights.recommendations.length).toBeGreaterThan(0);
      const beginnerRecommendations = insights.recommendations.filter(
        rec => rec.difficulty === 'beginner' || rec.priority === 'high'
      );
      expect(beginnerRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Chord Progression Analysis', () => {
    it('should detect common chord progressions', async () => {
      const popProgressionContent = `{title: Pop Song}
[C]Common [G]pop [Am]progression [F]here
[C]Repeat the [G]same [Am]pattern [F]again`;

      const insights = await aiMusicInsightsService.analyzeSong(popProgressionContent);

      expect(insights.chordProgression.length).toBeGreaterThan(0);
      const popProgression = insights.chordProgression.find(p => p.name === 'I-V-vi-IV');
      expect(popProgression).toBeDefined();
      if (popProgression) {
        expect(popProgression.confidence).toBeGreaterThan(0.5);
        expect(popProgression.description).toContain('pop');
      }
    });

    it('should analyze jazz progressions', async () => {
      const jazzProgressionContent = `{title: Jazz Song}
[Dm7]Jazz [G7]progression [Cmaj7]here
[Dm7]Another [G7]ii-V-I [Cmaj7]cadence`;

      const insights = await aiMusicInsightsService.analyzeSong(jazzProgressionContent);

      const jazzProgression = insights.chordProgression.find(p => p.name === 'ii-V-I');
      expect(jazzProgression).toBeDefined();
      if (jazzProgression) {
        expect(jazzProgression.description.toLowerCase()).toContain('jazz');
        expect(jazzProgression.romanNumerals).toEqual(['ii', 'V', 'I']);
      }
    });

    it('should handle custom progressions', async () => {
      const customContent = `{title: Unusual Song}
[C]Weird [Db]progression [F#]that [Bb]doesn't
[A]Match [Eb]common [G#]patterns [D]here`;

      const insights = await aiMusicInsightsService.analyzeSong(customContent);

      expect(insights.chordProgression.length).toBeGreaterThan(0);
      const customProgression = insights.chordProgression.find(p => p.name === 'Custom Progression');
      expect(customProgression).toBeDefined();
    });
  });

  describe('Song Structure Analysis', () => {
    it('should detect verse-chorus structure', async () => {
      const insights = await aiMusicInsightsService.analyzeSong(sampleChordProContent);

      expect(insights.structure.sections.length).toBeGreaterThan(0);
      
      const verse = insights.structure.sections.find(s => s.type === 'verse');
      const chorus = insights.structure.sections.find(s => s.type === 'chorus');
      const bridge = insights.structure.sections.find(s => s.type === 'bridge');

      expect(verse).toBeDefined();
      expect(chorus).toBeDefined();
      expect(bridge).toBeDefined();

      expect(insights.structure.structure).toContain('V');
      expect(insights.structure.structure).toContain('C');
      expect(insights.structure.structure).toContain('B');
    });

    it('should calculate structure complexity', async () => {
      const simpleStructure = `{title: Simple Song}
{start_of_verse}
[C]Simple [G]verse
{end_of_verse}
{start_of_chorus}
[F]Simple [C]chorus
{end_of_chorus}`;

      const complexStructure = `{title: Complex Song}
{start_of_intro}
[C]Intro
{end_of_intro}
{start_of_verse: 1}
[C]Verse 1
{end_of_verse}
{start_of_pre_chorus}
[Am]Pre-chorus
{end_of_pre_chorus}
{start_of_chorus}
[F]Chorus
{end_of_chorus}
{start_of_verse: 2}
[C]Verse 2
{end_of_verse}
{start_of_bridge}
[Dm]Bridge
{end_of_bridge}
{chorus}
{start_of_outro}
[C]Outro
{end_of_outro}`;

      const [simpleInsights, complexInsights] = await Promise.all([
        aiMusicInsightsService.analyzeSong(simpleStructure),
        aiMusicInsightsService.analyzeSong(complexStructure)
      ]);

      expect(complexInsights.structure.complexityScore)
        .toBeGreaterThan(simpleInsights.structure.complexityScore);
    });
  });

  describe('Key Analysis', () => {
    it('should detect major keys', async () => {
      const majorKeyContent = `{title: Major Key Song}
[C]Major [F]key [G]song [Am]with
[F]Common [C]progression [G]patterns [C]here`;

      const insights = await aiMusicInsightsService.analyzeSong(majorKeyContent);

      expect(insights.key.mode).toBe('major');
      expect(insights.key.confidence).toBeGreaterThan(0.5);
      expect(insights.key.signature).toBeDefined();
    });

    it('should provide alternative key suggestions', async () => {
      const insights = await aiMusicInsightsService.analyzeSong(sampleChordProContent);

      expect(insights.key.alternatives).toBeDefined();
      expect(insights.key.alternatives.length).toBeGreaterThan(0);
      
      for (const alt of insights.key.alternatives) {
        expect(alt.key).toBeDefined();
        expect(alt.confidence).toBeGreaterThanOrEqual(0);
        expect(alt.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Musical Complexity Analysis', () => {
    it('should assess chord complexity', async () => {
      const simpleChords = `{title: Simple Chords}
[C]Basic [F]major [G]chords [Am]only`;

      const complexChords = `{title: Complex Chords}
[Cmaj7#11]Extended [Fm7b5]chords [G7alt]with [Am9]extensions`;

      const [simpleInsights, complexInsights] = await Promise.all([
        aiMusicInsightsService.analyzeSong(simpleChords),
        aiMusicInsightsService.analyzeSong(complexChords)
      ]);

      expect(complexInsights.complexity.chordComplexity)
        .toBeGreaterThan(simpleInsights.complexity.chordComplexity);
      
      expect(simpleInsights.complexity.difficultyLevel).toBe('beginner');
      expect(['intermediate', 'advanced', 'expert'])
        .toContain(complexInsights.complexity.difficultyLevel);
    });

    it('should provide complexity factors', async () => {
      const insights = await aiMusicInsightsService.analyzeSong(complexJazzContent);

      expect(insights.complexity.factors.length).toBeGreaterThan(0);
      
      for (const factor of insights.complexity.factors) {
        expect(factor.name).toBeDefined();
        expect(factor.description).toBeDefined();
        expect(factor.impact).toBeGreaterThanOrEqual(0);
        expect(factor.impact).toBeLessThanOrEqual(1);
        expect(['chord', 'harmony', 'rhythm', 'structure', 'technique'])
          .toContain(factor.category);
      }
    });
  });

  describe('Genre Classification', () => {
    it('should classify pop music', async () => {
      const popContent = `{title: Pop Song}
[C]Simple [G]pop [Am]progression [F]common
[C]In many [G]popular [Am]songs [F]today`;

      const insights = await aiMusicInsightsService.analyzeSong(popContent);

      expect(['Pop', 'Rock', 'Folk']).toContain(insights.genre.primaryGenre);
      expect(insights.genre.confidence).toBeGreaterThan(0);
      expect(insights.genre.characteristics.length).toBeGreaterThan(0);
    });

    it('should classify jazz music', async () => {
      const insights = await aiMusicInsightsService.analyzeSong(complexJazzContent);

      // Jazz should score higher due to extended chords
      const jazzScore = insights.genre.alternativeGenres.find(g => g.genre === 'Jazz');
      expect(jazzScore).toBeDefined();
      if (jazzScore) {
        expect(jazzScore.confidence).toBeGreaterThan(0.3);
      }
    });

    it('should provide genre characteristics', async () => {
      const insights = await aiMusicInsightsService.analyzeSong(sampleChordProContent);

      expect(insights.genre.characteristics).toBeDefined();
      
      for (const characteristic of insights.genre.characteristics) {
        expect(characteristic.name).toBeDefined();
        expect(characteristic.strength).toBeGreaterThanOrEqual(0);
        expect(characteristic.strength).toBeLessThanOrEqual(1);
        expect(characteristic.description).toBeDefined();
      }
    });
  });

  describe('Harmonic Analysis', () => {
    it('should analyze chord functions', async () => {
      const insights = await aiMusicInsightsService.analyzeSong(sampleChordProContent);

      if (insights.harmony.chordFunctions.length > 0) {
        for (const func of insights.harmony.chordFunctions) {
          expect(func.chord).toBeDefined();
          expect(func.function).toBeDefined();
          expect(func.position).toBeGreaterThanOrEqual(0);
          expect(['tonic', 'predominant', 'dominant', 'passing', 'neighbor', 'other'])
            .toContain(func.role);
        }
      }
    });

    it('should detect cadences', async () => {
      const cadenceContent = `{title: Cadence Example}
[F]Predominant [G]dominant [C]tonic resolution
[Am]Minor [F]plagal [C]cadence`;

      const insights = await aiMusicInsightsService.analyzeSong(cadenceContent);

      if (insights.harmony.cadences.length > 0) {
        for (const cadence of insights.harmony.cadences) {
          expect(['authentic', 'plagal', 'deceptive', 'half', 'phrygian'])
            .toContain(cadence.type);
          expect(cadence.strength).toBeGreaterThanOrEqual(0);
          expect(cadence.strength).toBeLessThanOrEqual(1);
        }
      }
    });

    it('should provide harmonic suggestions', async () => {
      const insights = await aiMusicInsightsService.analyzeSong(sampleChordProContent);

      if (insights.harmony.suggestions.length > 0) {
        for (const suggestion of insights.harmony.suggestions) {
          expect(['substitution', 'addition', 'removal', 'reharmonization'])
            .toContain(suggestion.type);
          expect(suggestion.originalChord).toBeDefined();
          expect(suggestion.suggestedChord).toBeDefined();
          expect(suggestion.reason).toBeDefined();
          expect(suggestion.improvement).toBeDefined();
        }
      }
    });
  });

  describe('Learning Recommendations', () => {
    it('should generate appropriate recommendations for beginners', async () => {
      const options: MusicInsightsOptions = {
        userSkillLevel: 'beginner',
        enableRecommendations: true
      };

      const insights = await aiMusicInsightsService.analyzeSong(complexJazzContent, options);

      const beginnerRecs = insights.recommendations.filter(
        rec => rec.difficulty === 'beginner' || rec.priority === 'high'
      );

      expect(beginnerRecs.length).toBeGreaterThan(0);
      
      for (const rec of beginnerRecs) {
        expect(['technique', 'practice', 'theory', 'repertoire', 'performance'])
          .toContain(rec.type);
        expect(['high', 'medium', 'low']).toContain(rec.priority);
        expect(rec.title).toBeDefined();
        expect(rec.description).toBeDefined();
      }
    });

    it('should suggest jazz theory for jazz progressions', async () => {
      const jazzContent = `{title: Jazz Study}
[Dm7]Jazz [G7]ii-V-I [Cmaj7]progression`;

      const insights = await aiMusicInsightsService.analyzeSong(jazzContent);

      const jazzRec = insights.recommendations.find(
        rec => rec.title.toLowerCase().includes('jazz') || 
               rec.description.toLowerCase().includes('ii-v-i')
      );

      if (jazzRec) {
        expect(jazzRec.type).toBe('theory');
        expect(['intermediate', 'advanced']).toContain(jazzRec.difficulty);
      }
    });

    it('should include learning resources in recommendations', async () => {
      const insights = await aiMusicInsightsService.analyzeSong(sampleChordProContent);

      const recsWithResources = insights.recommendations.filter(
        rec => rec.resources && rec.resources.length > 0
      );

      if (recsWithResources.length > 0) {
        for (const rec of recsWithResources) {
          for (const resource of rec.resources!) {
            expect(['tutorial', 'exercise', 'song', 'video', 'article'])
              .toContain(resource.type);
            expect(resource.title).toBeDefined();
          }
        }
      }
    });
  });

  describe('Song Similarity Comparison', () => {
    it('should compare similar songs accurately', async () => {
      const song1 = `{title: Song 1}
[C]Common [G]progression [Am]here [F]today
[C]Verse [G]chorus [Am]structure [F]simple`;

      const song2 = `{title: Song 2}
[C]Same [G]chord [Am]pattern [F]different
[C]Similar [G]progression [Am]structure [F]used`;

      const similarity = await aiMusicInsightsService.compareSongs(song1, song2);

      expect(similarity.similarity).toBeGreaterThan(0.5);
      expect(similarity.targetSong).toBe('Song 2');
      expect(similarity.similarityAspects.length).toBeGreaterThan(0);
      
      const chordAspect = similarity.similarityAspects.find(a => a.aspect === 'chord_progression');
      expect(chordAspect).toBeDefined();
      if (chordAspect) {
        expect(chordAspect.score).toBeGreaterThan(0.8);
      }
    });

    it('should identify differences between dissimilar songs', async () => {
      const popSong = `{title: Pop Song}
[C]Simple [G]pop [Am]progression [F]here`;

      const jazzSong = `{title: Jazz Song}
[Cmaj7]Complex [Am7]jazz [Dm7]harmony [G7]here`;

      const similarity = await aiMusicInsightsService.compareSongs(popSong, jazzSong);

      expect(similarity.differences.length).toBeGreaterThan(0);
      expect(similarity.similarity).toBeLessThan(0.8);
    });

    it('should find common characteristics', async () => {
      const majorSong1 = `{title: Major Song 1}
[C]Major [F]key [G]song [C]here`;

      const majorSong2 = `{title: Major Song 2}
[G]Different [C]key [D]but [G]major`;

      const similarity = await aiMusicInsightsService.compareSongs(majorSong1, majorSong2);

      expect(similarity.commonCharacteristics.length).toBeGreaterThan(0);
      const modeCharacteristic = similarity.commonCharacteristics.find(
        char => char.includes('major')
      );
      expect(modeCharacteristic).toBeDefined();
    });
  });

  describe('Tempo Analysis', () => {
    it('should extract tempo markings from content', async () => {
      const contentWithTempo = `{title: Tempo Song}
{tempo: Allegro}
{time: 4/4}
[C]Fast [G]tempo [Am]song [F]here`;

      const insights = await aiMusicInsightsService.analyzeSong(contentWithTempo);

      expect(insights.tempo.tempoMarking).toBe('Allegro');
      expect(insights.tempo.timeSignature).toBe('4/4');
    });

    it('should estimate BPM based on content', async () => {
      const fastContent = `{title: Fast Song}
[C]Very [F]fast [G]chord [C]changes [F]here [G]today [Am]now [F]go`;

      const slowContent = `{title: Slow Song}
[C]Slow    ballad    [F]with    few    [G]changes    [C]here`;

      const [fastInsights, slowInsights] = await Promise.all([
        aiMusicInsightsService.analyzeSong(fastContent),
        aiMusicInsightsService.analyzeSong(slowContent)
      ]);

      if (fastInsights.tempo.bpm && slowInsights.tempo.bpm) {
        expect(fastInsights.tempo.bpm).toBeGreaterThan(slowInsights.tempo.bpm);
      }
    });

    it('should classify groove styles', async () => {
      const insights = await aiMusicInsightsService.analyzeSong(sampleChordProContent);

      expect(['straight', 'swing', 'shuffle', 'latin', 'ballad'])
        .toContain(insights.tempo.groove);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty content gracefully', async () => {
      await expect(aiMusicInsightsService.analyzeSong(''))
        .rejects.toThrow('No chords detected in content');
    });

    it('should handle malformed ChordPro content', async () => {
      const malformedContent = `{title: Broken
[C]Unclosed bracket
{start_of_verse without end}`;

      // Should not throw an error, but may have lower confidence
      const insights = await aiMusicInsightsService.analyzeSong(malformedContent);
      expect(insights.overallConfidence).toBeLessThan(0.9);
    });

    it('should provide meaningful error messages', async () => {
      try {
        await aiMusicInsightsService.analyzeSong('');
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        expect(error.message).toContain('No chords detected');
      }
    });
  });

  describe('Performance and Metrics', () => {
    it('should complete analysis within reasonable time', async () => {
      const startTime = Date.now();
      const insights = await aiMusicInsightsService.analyzeSong(sampleChordProContent);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(insights.analysisMetrics.processingTime).toBeGreaterThan(0);
    });

    it('should track algorithms used', async () => {
      const options: MusicInsightsOptions = {
        enableGenreClassification: true,
        enableHarmonicAnalysis: true,
        enableRecommendations: true
      };

      const insights = await aiMusicInsightsService.analyzeSong(sampleChordProContent, options);

      expect(insights.analysisMetrics.algorithmsUsed).toContain('chord_detection');
      expect(insights.analysisMetrics.algorithmsUsed).toContain('structure_analysis');
      expect(insights.analysisMetrics.algorithmsUsed).toContain('key_detection');
      expect(insights.analysisMetrics.algorithmsUsed).toContain('genre_classification');
      expect(insights.analysisMetrics.algorithmsUsed).toContain('harmonic_analysis');
      expect(insights.analysisMetrics.algorithmsUsed).toContain('learning_recommendations');
    });

    it('should assess data quality', async () => {
      const highQualityContent = `{title: High Quality}
{artist: Artist}
{key: C}
[C]Well [F]structured [G]song [Am]with
[F]Many [C]chords [G]and [Am]good
[F]Quality [G]chord [C]progressions`;

      const lowQualityContent = `[C]Only [F]two [C]chords`;

      const [highQualityInsights, lowQualityInsights] = await Promise.all([
        aiMusicInsightsService.analyzeSong(highQualityContent),
        aiMusicInsightsService.analyzeSong(lowQualityContent)
      ]);

      expect(highQualityInsights.analysisMetrics.dataQuality)
        .toBeGreaterThan(lowQualityInsights.analysisMetrics.dataQuality);
    });
  });
});