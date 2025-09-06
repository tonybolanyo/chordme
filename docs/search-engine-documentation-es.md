---
layout: default
lang: es
title: Documentación del Motor de Búsqueda
---

# Documentación del Motor de Búsqueda de Texto Completo de ChordMe

## Resumen

El motor de búsqueda de texto completo de ChordMe proporciona capacidades de búsqueda potentes y flexibles para encontrar canciones a través de títulos, artistas, letras, acordes y etiquetas generadas por usuarios. El sistema soporta sintaxis de consulta avanzada incluyendo operadores booleanos, coincidencia de frases y ranking inteligente de relevancia.

## Características

### 🎯 Capacidades de Búsqueda Central
- **Búsqueda de texto completo** a través de títulos, artistas, letras y contenido de canciones
- **Búsqueda difusa** con tolerancia a errores tipográficos
- **Autocompletado en tiempo real** con sugerencias inteligentes
- **Búsqueda facetada** con filtros dinámicos
- **Ranking de relevancia** basado en múltiples factores

### 🔍 Sintaxis de Consulta Avanzada
- **Operadores booleanos**: AND, OR, NOT
- **Coincidencia de frases**: "frase exacta"
- **Comodines**: \*, ? para coincidencia de patrones
- **Búsqueda por campos**: title:, artist:, genre:
- **Búsqueda por rango**: year:1970-1980, tempo:>120

### 📊 Análisis y Métricas
- **Tracking de consultas** para análisis de uso
- **Métricas de rendimiento** con monitoring en tiempo real
- **A/B testing** para optimización de algoritmos
- **Analytics de usuarios** para mejoras de UX

## Arquitectura del Sistema

### Componentes Principales

```typescript
interface SearchEngine {
  indexer: DocumentIndexer;      // Indexación de documentos
  parser: QueryParser;          // Análisis de consultas
  scorer: RelevanceScorer;      // Cálculo de relevancia
  suggester: AutoSuggester;     // Autocompletado
  analytics: SearchAnalytics;   // Métricas y análisis
}
```

### Pipeline de Indexación

```typescript
class DocumentIndexer {
  // Procesar documentos para indexación
  async indexDocument(song: Song): Promise<IndexedDocument> {
    const doc: IndexedDocument = {
      id: song.id,
      
      // Campos de texto completo
      title: this.processText(song.title),
      artist: this.processText(song.artist),
      lyrics: this.processText(song.lyrics),
      content: this.processText(song.content),
      
      // Campos estructurados  
      genre: song.genre,
      year: song.year,
      key: song.key,
      tempo: song.tempo,
      difficulty: song.difficulty,
      
      // Campos calculados
      chords: this.extractChords(song.content),
      keywords: this.extractKeywords(song),
      
      // Metadatos
      created: song.createdAt,
      updated: song.updatedAt,
      popularity: await this.calculatePopularity(song)
    };
    
    return doc;
  }
  
  private processText(text: string): ProcessedText {
    return {
      original: text,
      normalized: this.normalize(text),
      tokens: this.tokenize(text),
      stemmed: this.stem(text),
      phonetic: this.phoneticHash(text)
    };
  }
}
```

### Motor de Consultas

```typescript
class QueryEngine {
  async search(query: SearchQuery): Promise<SearchResult> {
    // 1. Parsear consulta
    const parsedQuery = this.parser.parse(query.text);
    
    // 2. Aplicar filtros
    const filteredDocs = this.applyFilters(parsedQuery, query.filters);
    
    // 3. Calcular relevancia
    const scoredDocs = this.scorer.score(parsedQuery, filteredDocs);
    
    // 4. Ordenar y paginar
    const sortedDocs = this.sort(scoredDocs, query.sort);
    const paginatedDocs = this.paginate(sortedDocs, query.page, query.size);
    
    // 5. Generar facetas
    const facets = this.generateFacets(filteredDocs, query.facets);
    
    return {
      query: query.text,
      total: filteredDocs.length,
      results: paginatedDocs,
      facets,
      timing: this.getTimingInfo()
    };
  }
}
```

## Algoritmos de Relevancia

### Scoring Multi-Factor

```typescript
class RelevanceScorer {
  calculateScore(query: ParsedQuery, document: IndexedDocument): number {
    let score = 0;
    
    // 1. Coincidencia de texto (40% del peso)
    score += 0.4 * this.textMatchScore(query, document);
    
    // 2. Popularidad del documento (25% del peso)
    score += 0.25 * this.popularityScore(document);
    
    // 3. Recencia (15% del peso)
    score += 0.15 * this.recencyScore(document);
    
    // 4. Calidad del contenido (10% del peso)
    score += 0.1 * this.qualityScore(document);
    
    // 5. Preferencias del usuario (10% del peso)
    score += 0.1 * this.userPreferenceScore(query, document);
    
    return score;
  }
  
  private textMatchScore(query: ParsedQuery, doc: IndexedDocument): number {
    let score = 0;
    
    // Coincidencia exacta en título (peso alto)
    if (this.exactMatch(query.terms, doc.title.original)) {
      score += 100;
    }
    
    // Coincidencia parcial en título
    score += 50 * this.partialMatch(query.terms, doc.title.tokens);
    
    // Coincidencia en artista
    score += 30 * this.partialMatch(query.terms, doc.artist.tokens);
    
    // Coincidencia en letra/contenido
    score += 10 * this.partialMatch(query.terms, doc.content.tokens);
    
    // Coincidencia difusa
    score += 5 * this.fuzzyMatch(query.terms, doc);
    
    return Math.min(score, 100); // Normalizar a 0-100
  }
}
```

### Algoritmo de Búsqueda Difusa

```typescript
class FuzzyMatcher {
  fuzzyMatch(query: string, text: string, threshold: number = 0.7): number {
    // Usar distancia de Levenshtein normalizada
    const distance = this.levenshteinDistance(query.toLowerCase(), text.toLowerCase());
    const maxLength = Math.max(query.length, text.length);
    const similarity = 1 - (distance / maxLength);
    
    return similarity >= threshold ? similarity : 0;
  }
  
  phoneticMatch(query: string, text: string): number {
    // Usar algoritmo Soundex para coincidencias fonéticas
    const queryPhonetic = this.soundex(query);
    const textPhonetic = this.soundex(text);
    
    return queryPhonetic === textPhonetic ? 1 : 0;
  }
  
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null)
    );
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}
```

## Sistema de Autocompletado

### Generador de Sugerencias

```typescript
class AutoSuggester {
  async getSuggestions(query: string, limit: number = 5): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];
    
    // 1. Completado de títulos
    const titleSuggestions = await this.getTitleCompletions(query, limit);
    suggestions.push(...titleSuggestions);
    
    // 2. Completado de artistas
    const artistSuggestions = await this.getArtistCompletions(query, limit);
    suggestions.push(...artistSuggestions);
    
    // 3. Sugerencias de búsqueda popular
    const popularSuggestions = await this.getPopularSearches(query, limit);
    suggestions.push(...popularSuggestions);
    
    // 4. Corrección de errores tipográficos
    const spellSuggestions = await this.getSpellCorrections(query, limit);
    suggestions.push(...spellSuggestions);
    
    // Ordenar por relevancia y devolver top N
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
  
  private async getTitleCompletions(query: string, limit: number): Promise<Suggestion[]> {
    const results = await this.searchIndex.suggest({
      field: 'title',
      prefix: query,
      size: limit,
      fuzzy: {
        fuzziness: 'AUTO',
        prefix_length: 2
      }
    });
    
    return results.map(result => ({
      text: result.text,
      type: 'title',
      score: result.score,
      metadata: {
        artist: result.source.artist,
        year: result.source.year
      }
    }));
  }
}
```

### Caché de Sugerencias

```typescript
class SuggestionCache {
  private cache = new Map<string, CachedSuggestion>();
  private readonly TTL = 3600000; // 1 hora
  
  async get(query: string): Promise<Suggestion[] | null> {
    const cached = this.cache.get(query);
    
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      return cached.suggestions;
    }
    
    return null;
  }
  
  set(query: string, suggestions: Suggestion[]): void {
    this.cache.set(query, {
      suggestions,
      timestamp: Date.now()
    });
    
    // Limpiar entradas expiradas
    this.cleanupExpired();
  }
}
```

## Filtrado y Facetas

### Sistema de Facetas Dinámicas

```typescript
class FacetGenerator {
  generateFacets(documents: IndexedDocument[], requestedFacets: string[]): Facets {
    const facets: Facets = {};
    
    for (const facetName of requestedFacets) {
      switch (facetName) {
        case 'genre':
          facets.genre = this.generateGenreFacet(documents);
          break;
        case 'year':
          facets.year = this.generateYearFacet(documents);
          break;
        case 'difficulty':
          facets.difficulty = this.generateDifficultyFacet(documents);
          break;
        case 'key':
          facets.key = this.generateKeyFacet(documents);
          break;
        case 'tempo':
          facets.tempo = this.generateTempoFacet(documents);
          break;
      }
    }
    
    return facets;
  }
  
  private generateGenreFacet(documents: IndexedDocument[]): FacetResult {
    const counts = new Map<string, number>();
    
    documents.forEach(doc => {
      if (doc.genre) {
        counts.set(doc.genre, (counts.get(doc.genre) || 0) + 1);
      }
    });
    
    return {
      type: 'terms',
      buckets: Array.from(counts.entries())
        .map(([term, count]) => ({ term, count }))
        .sort((a, b) => b.count - a.count)
    };
  }
  
  private generateYearFacet(documents: IndexedDocument[]): FacetResult {
    const ranges = [
      { from: 1950, to: 1960, label: '1950s' },
      { from: 1960, to: 1970, label: '1960s' },
      { from: 1970, to: 1980, label: '1970s' },
      { from: 1980, to: 1990, label: '1980s' },
      { from: 1990, to: 2000, label: '1990s' },
      { from: 2000, to: 2010, label: '2000s' },
      { from: 2010, to: 2020, label: '2010s' },
      { from: 2020, to: 2030, label: '2020s' }
    ];
    
    const buckets = ranges.map(range => ({
      term: range.label,
      count: documents.filter(doc => 
        doc.year >= range.from && doc.year < range.to
      ).length
    }));
    
    return { type: 'range', buckets };
  }
}
```

## Análisis y Métricas

### Tracking de Consultas

```typescript
class SearchAnalytics {
  async trackQuery(query: SearchQuery, result: SearchResult, userId?: string): Promise<void> {
    const analytics: QueryAnalytics = {
      query: query.text,
      userId,
      timestamp: new Date(),
      resultCount: result.total,
      clickedResults: [],
      filters: query.filters,
      timing: result.timing,
      sessionId: query.sessionId
    };
    
    await this.store.save(analytics);
  }
  
  async trackClick(queryId: string, documentId: string, position: number): Promise<void> {
    await this.store.updateQuery(queryId, {
      $push: {
        clickedResults: {
          documentId,
          position,
          timestamp: new Date()
        }
      }
    });
  }
  
  async getPopularQueries(timeframe: TimeFrame = '7d'): Promise<PopularQuery[]> {
    return await this.store.aggregate([
      {
        $match: {
          timestamp: { $gte: this.getTimeframeStart(timeframe) }
        }
      },
      {
        $group: {
          _id: '$query',
          count: { $sum: 1 },
          avgResults: { $avg: '$resultCount' },
          ctr: { $avg: { $size: '$clickedResults' } }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 50
      }
    ]);
  }
}
```

### Métricas de Rendimiento

```typescript
class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric>();
  
  async measureQuery<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = process.hrtime.bigint();
    const startMemory = process.memoryUsage();
    
    try {
      const result = await fn();
      
      const end = process.hrtime.bigint();
      const endMemory = process.memoryUsage();
      
      this.recordMetric(operation, {
        duration: Number(end - start) / 1000000, // ms
        memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
        success: true
      });
      
      return result;
    } catch (error) {
      this.recordMetric(operation, {
        duration: Number(process.hrtime.bigint() - start) / 1000000,
        memoryDelta: 0,
        success: false,
        error: error.message
      });
      throw error;
    }
  }
  
  getAveragePerformance(operation: string): PerformanceStats {
    const metrics = this.metrics.get(operation) || [];
    
    return {
      avgDuration: this.average(metrics.map(m => m.duration)),
      p95Duration: this.percentile(metrics.map(m => m.duration), 95),
      successRate: metrics.filter(m => m.success).length / metrics.length,
      totalRequests: metrics.length
    };
  }
}
```

## Optimización y Caché

### Estrategia de Caché Multi-Nivel

```typescript
class SearchCache {
  private l1Cache = new LRUCache<string, SearchResult>({ max: 1000 }); // Memoria
  private l2Cache = new RedisCache(); // Redis
  private l3Cache = new DatabaseCache(); // Base de datos
  
  async get(query: SearchQuery): Promise<SearchResult | null> {
    const cacheKey = this.generateCacheKey(query);
    
    // L1: Caché en memoria
    let result = this.l1Cache.get(cacheKey);
    if (result) {
      this.recordCacheHit('l1');
      return result;
    }
    
    // L2: Caché Redis
    result = await this.l2Cache.get(cacheKey);
    if (result) {
      this.l1Cache.set(cacheKey, result); // Promover a L1
      this.recordCacheHit('l2');
      return result;
    }
    
    // L3: Caché de base de datos
    result = await this.l3Cache.get(cacheKey);
    if (result) {
      this.l1Cache.set(cacheKey, result);
      await this.l2Cache.set(cacheKey, result, 3600); // 1 hora TTL
      this.recordCacheHit('l3');
      return result;
    }
    
    this.recordCacheMiss();
    return null;
  }
  
  async set(query: SearchQuery, result: SearchResult): Promise<void> {
    const cacheKey = this.generateCacheKey(query);
    const ttl = this.calculateTTL(query, result);
    
    // Almacenar en todos los niveles
    this.l1Cache.set(cacheKey, result);
    await this.l2Cache.set(cacheKey, result, ttl);
    await this.l3Cache.set(cacheKey, result, ttl * 2);
  }
}
```

### Indexación Incremental

```typescript
class IncrementalIndexer {
  async updateDocument(songId: string, changes: Partial<Song>): Promise<void> {
    // 1. Obtener documento actual del índice
    const currentDoc = await this.searchIndex.get(songId);
    
    // 2. Aplicar cambios
    const updatedDoc = { ...currentDoc, ...changes };
    
    // 3. Re-procesar campos afectados
    const processedDoc = await this.processDocument(updatedDoc);
    
    // 4. Actualizar índice
    await this.searchIndex.update(songId, processedDoc);
    
    // 5. Invalidar caché relacionado
    await this.cache.invalidatePattern(`*${songId}*`);
    
    // 6. Actualizar estadísticas
    await this.updateIndexStats();
  }
  
  async bulkUpdate(updates: Array<{ id: string; changes: Partial<Song> }>): Promise<void> {
    const batch = this.searchIndex.batch();
    
    for (const update of updates) {
      const processedDoc = await this.processDocument(update.changes);
      batch.update(update.id, processedDoc);
    }
    
    await batch.execute();
    await this.cache.invalidateAll();
  }
}
```

## API y Integración

### Endpoints de Búsqueda

```typescript
// Búsqueda básica
GET /api/v1/search?q={query}&page={page}&size={size}

// Búsqueda avanzada
POST /api/v1/search
{
  "query": "string",
  "filters": {
    "genre": ["rock", "pop"],
    "year": { "min": 1970, "max": 1990 },
    "difficulty": { "max": 3 }
  },
  "sort": [
    { "field": "relevance", "order": "desc" },
    { "field": "year", "order": "asc" }
  ],
  "facets": ["genre", "year", "difficulty"],
  "highlight": {
    "fields": ["title", "artist", "lyrics"],
    "fragmentSize": 150
  }
}

// Autocompletado
GET /api/v1/search/suggest?q={partial_query}&limit={limit}

// Métricas de búsqueda
GET /api/v1/search/analytics?timeframe={timeframe}
```

### Respuesta de API

```json
{
  "query": "beatles rock",
  "total": 156,
  "page": 1,
  "size": 20,
  "results": [
    {
      "id": "song_123",
      "title": "Come Together",
      "artist": "The Beatles",
      "album": "Abbey Road",
      "year": 1969,
      "genre": "Rock",
      "key": "Dm",
      "tempo": 85,
      "difficulty": 2,
      "score": 0.95,
      "highlights": {
        "title": ["<em>Come</em> Together"],
        "artist": ["The <em>Beatles</em>"]
      }
    }
  ],
  "facets": {
    "genre": {
      "buckets": [
        { "term": "Rock", "count": 89 },
        { "term": "Pop", "count": 67 }
      ]
    },
    "year": {
      "buckets": [
        { "term": "1960s", "count": 45 },
        { "term": "1970s", "count": 111 }
      ]
    }
  },
  "timing": {
    "total": 45,
    "search": 32,
    "facets": 8,
    "highlighting": 5
  }
}
```

## Configuración y Despliegue

### Configuración del Motor

```yaml
# config/search.yml
search_engine:
  index:
    name: "chordme_songs"
    shards: 3
    replicas: 1
    refresh_interval: "1s"
    
  analysis:
    analyzers:
      song_analyzer:
        tokenizer: "standard"
        filters: ["lowercase", "stop", "stemmer"]
      exact_analyzer:
        tokenizer: "keyword"
        filters: ["lowercase"]
        
  performance:
    max_result_window: 10000
    search_timeout: "30s"
    index_timeout: "60s"
    
  cache:
    query_cache_size: "100mb"
    request_cache_size: "50mb"
    fielddata_cache_size: "200mb"
```

### Monitoreo y Alertas

```typescript
class SearchMonitoring {
  setupAlerts(): void {
    // Alerta por latencia alta
    this.monitor.alert('search_latency_high', {
      condition: 'avg_search_time > 500ms',
      timeWindow: '5m',
      action: 'notify_ops_team'
    });
    
    // Alerta por tasa de error alta
    this.monitor.alert('search_error_rate_high', {
      condition: 'error_rate > 5%',
      timeWindow: '2m',
      action: 'page_oncall'
    });
    
    // Alerta por uso de memoria alto
    this.monitor.alert('search_memory_high', {
      condition: 'heap_usage > 80%',
      timeWindow: '1m',
      action: 'auto_scale'
    });
  }
}
```

---

**Idioma:** [English](search-engine-documentation.md) | **Español**

*Para información de usuario, consulte la [Guía del Usuario de Búsqueda](search-user-guide-es.md) y la [Guía de Filtrado Avanzado](advanced-filtering-guide-es.md).*