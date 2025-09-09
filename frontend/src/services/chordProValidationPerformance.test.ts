/**
 * Performance tests for ChordPro validation with complex documents
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { I18nChordProValidator } from './chordProValidationI18n';

describe('ChordPro Validation Performance Tests', () => {
  let validator: I18nChordProValidator;

  beforeEach(() => {
    validator = new I18nChordProValidator();
  });

  describe('Large Document Performance', () => {
    it('should validate a document with 1000 lines in under 100ms', () => {
      const largeContent = generateLargeDocument(1000);
      
      const startTime = performance.now();
      const result = validator.validateContent(largeContent);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      // Allow more time in CI environments (GitHub Actions has slower CPUs)
      const timeLimit = process.env.CI ? 500 : 100;
      expect(duration).toBeLessThan(timeLimit);
      expect(result.isValid).toBe(true);
    });

    it('should validate a document with 10000 chords in under 500ms', () => {
      const content = generateManyChords(10000);
      
      const startTime = performance.now();
      const result = validator.validateContent(content);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      // Allow more time in CI environments
      const timeLimit = process.env.CI ? 2000 : 500;
      expect(duration).toBeLessThan(timeLimit);
      expect(result.isValid).toBe(true);
    });

    it('should handle documents with many errors efficiently', () => {
      const errorContent = generateManyErrors(1000);
      
      const startTime = performance.now();
      const result = validator.validateContent(errorContent);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(200);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle nested complex structures efficiently', () => {
      const complexContent = generateComplexNesting(100);
      
      const startTime = performance.now();
      const _result = validator.validateContent(complexContent);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      // Allow more time in CI environments  
      const timeLimit = process.env.CI ? 400 : 150;
      expect(duration).toBeLessThan(timeLimit);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory with repeated validations', () => {
      const content = generateLargeDocument(100);
      
      // Measure initial memory
      const initialMemory = getMemoryUsage();
      
      // Perform many validations
      for (let i = 0; i < 100; i++) {
        validator.validateContent(content);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = getMemoryUsage();
      const memoryGrowth = finalMemory - initialMemory;
      
      // Memory growth should be minimal (< 10MB)
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
    });

    it('should handle validation of multiple large documents simultaneously', async () => {
      const documents = Array.from({ length: 10 }, () => generateLargeDocument(500));
      
      const startTime = performance.now();
      
      const promises = documents.map(doc => 
        Promise.resolve(validator.validateContent(doc))
      );
      
      const results = await Promise.all(promises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Allow more time in CI environments for parallel operations
      const timeLimit = process.env.CI ? 3000 : 1000;
      expect(duration).toBeLessThan(timeLimit); // All should complete
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('Regex Performance', () => {
    it('should efficiently handle documents with many regex matches', () => {
      const content = generateManyRegexMatches(5000);
      
      const startTime = performance.now();
      const _result = validator.validateContent(content);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      // Allow more time in CI environments for regex-heavy operations  
      const timeLimit = process.env.CI ? 800 : 300;
      expect(duration).toBeLessThan(timeLimit);
    });

    it('should handle pathological regex cases without hanging', () => {
      const pathologicalContent = generatePathologicalRegexCase();
      
      const startTime = performance.now();
      const _result = validator.validateContent(pathologicalContent);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100); // Should not hang
    });
  });

  describe('Language-Specific Performance', () => {
    it('should handle Spanish preprocessing efficiently', () => {
      validator.setLanguage('es');
      const spanishContent = generateSpanishDocument(1000);
      
      const startTime = performance.now();
      const result = validator.validateContent(spanishContent);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      // Allow more time in CI environments for language processing  
      const timeLimit = process.env.CI ? 600 : 200;
      expect(duration).toBeLessThan(timeLimit);
      expect(result.isValid).toBe(true);
    });

    it('should handle mixed language content efficiently', () => {
      const mixedContent = generateMixedLanguageDocument(500);
      
      const startTime = performance.now();
      const _result = validator.validateContent(mixedContent);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(150);
    });
  });

  describe('Benchmark Comparison', () => {
    it('should perform validation faster than 1ms per line', () => {
      const lineCount = 1000;
      const content = generateLargeDocument(lineCount);
      
      const startTime = performance.now();
      validator.validateContent(content);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      const timePerLine = duration / lineCount;
      
      expect(timePerLine).toBeLessThan(1); // Less than 1ms per line
    });

    it('should handle validation faster than basic string operations', () => {
      const content = generateLargeDocument(500);
      
      // Measure validation time
      const validationStart = performance.now();
      validator.validateContent(content);
      const validationEnd = performance.now();
      const validationTime = validationEnd - validationStart;
      
      // Measure simple string operations for comparison
      const stringStart = performance.now();
      content.split('\n').map(line => line.length).reduce((a, b) => a + b, 0);
      const stringEnd = performance.now();
      const stringTime = stringEnd - stringStart;
      
      // Validation should not be more than 10x slower than basic string ops
      expect(validationTime).toBeLessThan(stringTime * 10);
    });
  });
});

// Helper functions for generating test content

function generateLargeDocument(lineCount: number): string {
  const lines = [];
  
  lines.push('{title: Performance Test Song}');
  lines.push('{artist: Test Artist}');
  lines.push('{key: C}');
  lines.push('');
  
  for (let i = 0; i < lineCount; i++) {
    if (i % 10 === 0) {
      lines.push(`{start_of_verse}`);
    }
    
    const chords = ['C', 'G', 'Am', 'F', 'Dm', 'Em'];
    const randomChords = Array.from({ length: 4 }, () => 
      chords[Math.floor(Math.random() * chords.length)]
    );
    
    lines.push(`[${randomChords[0]}]Line ${i + 1} with [${randomChords[1]}]multiple [${randomChords[2]}]chords here [${randomChords[3]}]`);
    
    if (i % 10 === 9) {
      lines.push(`{end_of_verse}`);
      lines.push('');
    }
  }
  
  return lines.join('\n');
}

function generateManyChords(chordCount: number): string {
  const chords = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Cm', 'Dm', 'Em', 'Fm', 'Gm', 'Am', 'Bm'];
  const content = ['{title: Many Chords Test}'];
  
  let lineChords = [];
  for (let i = 0; i < chordCount; i++) {
    const chord = chords[Math.floor(Math.random() * chords.length)];
    lineChords.push(`[${chord}]`);
    
    if (lineChords.length === 10) {
      content.push(lineChords.join(' ') + ' lyrics');
      lineChords = [];
    }
  }
  
  if (lineChords.length > 0) {
    content.push(lineChords.join(' ') + ' lyrics');
  }
  
  return content.join('\n');
}

function generateManyErrors(errorCount: number): string {
  const lines = ['{title: Error Test}'];
  
  for (let i = 0; i < errorCount; i++) {
    const errorType = i % 4;
    switch (errorType) {
      case 0:
        lines.push(`[X${i}] invalid chord`);
        break;
      case 1:
        lines.push(`{unknown${i}: directive}`);
        break;
      case 2:
        lines.push(`[C${i} unclosed bracket`);
        break;
      case 3:
        lines.push(`{incomplete${i}`);
        break;
    }
  }
  
  return lines.join('\n');
}

function generateComplexNesting(depth: number): string {
  const lines = ['{title: Complex Nesting Test}'];
  
  for (let i = 0; i < depth; i++) {
    lines.push(`{start_of_verse}`);
    lines.push(`  [C]Nested verse ${i} with [G]chords`);
    
    for (let j = 0; j < 5; j++) {
      lines.push(`  {start_of_chorus}`);
      lines.push(`    [Am]Deeply nested [F]chorus ${j}`);
      lines.push(`    [C]More content [G]here`);
      lines.push(`  {end_of_chorus}`);
    }
    
    lines.push(`{end_of_verse}`);
  }
  
  return lines.join('\n');
}

function generateManyRegexMatches(matchCount: number): string {
  const lines = ['{title: Regex Test}'];
  
  for (let i = 0; i < matchCount; i++) {
    lines.push(`[C${i}] {directive${i}: value} content with patterns`);
  }
  
  return lines.join('\n');
}

function generatePathologicalRegexCase(): string {
  // Create content that could potentially cause regex backtracking
  const repeatedPattern = 'a'.repeat(100);
  return `
    {title: Pathological Test}
    [${repeatedPattern}] 
    {${repeatedPattern}: value}
    ${repeatedPattern}
  `;
}

function generateSpanishDocument(lineCount: number): string {
  const spanishChords = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si', 'dom', 'rem', 'mim'];
  const spanishDirectives = ['titulo', 'artista', 'coro', 'estrofa'];
  
  const lines = [];
  lines.push('{titulo: Canción de Prueba}');
  lines.push('{artista: Artista de Prueba}');
  
  for (let i = 0; i < lineCount; i++) {
    const chord = spanishChords[Math.floor(Math.random() * spanishChords.length)];
    const directive = spanishDirectives[Math.floor(Math.random() * spanishDirectives.length)];
    
    if (i % 20 === 0) {
      lines.push(`{${directive}}`);
    }
    
    lines.push(`[${chord}] Línea ${i + 1} con contenido en español`);
  }
  
  return lines.join('\n');
}

function generateMixedLanguageDocument(lineCount: number): string {
  const englishChords = ['C', 'G', 'Am', 'F'];
  const spanishChords = ['Do', 'Re', 'Mi', 'Fa'];
  
  const lines = [];
  lines.push('{title: Mixed Language}');
  lines.push('{titulo: Idioma Mixto}');
  
  for (let i = 0; i < lineCount; i++) {
    const useSpanish = i % 2 === 0;
    const chord = useSpanish 
      ? spanishChords[Math.floor(Math.random() * spanishChords.length)]
      : englishChords[Math.floor(Math.random() * englishChords.length)];
    
    const text = useSpanish 
      ? `Línea en español ${i + 1}`
      : `English line ${i + 1}`;
    
    lines.push(`[${chord}] ${text}`);
  }
  
  return lines.join('\n');
}

function getMemoryUsage(): number {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage().heapUsed;
  }
  
  // Fallback for browser environments
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    return (performance as any).memory.usedJSHeapSize;
  }
  
  return 0;
}