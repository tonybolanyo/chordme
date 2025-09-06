---
layout: default
lang: es
title: Búsqueda de Diagramas de Acordes
---

# Búsqueda Mejorada de Diagramas de Acordes y Filtrado

Este documento describe la funcionalidad mejorada de búsqueda de diagramas de acordes implementada para ChordMe, proporcionando capacidades completas de búsqueda, filtrado y ordenamiento para diagramas de acordes.

## Resumen de Características

### 🎯 Búsqueda Inteligente
- **Búsqueda Difusa**: Encuentra acordes incluso con errores tipográficos (ej: "Cmjr7" encuentra "Cmaj7")
- **Coincidencia Exacta**: Búsqueda tradicional de nombres exactos
- **Umbral Configurable**: Ajustar sensibilidad de búsqueda difusa (0-100%)

### 🔍 Filtrado Avanzado
- **Por Instrumento**: Guitarra, ukelele, mandolina
- **Por Dificultad**: Principiante (1) hasta Experto (5)
- **Por Características**: Acordes barré, acordes abiertos, digitaciones alternativas
- **Por Tipo de Acorde**: Mayor, menor, séptima, etc.

### 📊 Ordenamiento Flexible
- **Por Relevancia**: Mejores coincidencias primero
- **Por Dificultad**: De fácil a difícil o viceversa
- **Por Popularidad**: Acordes más usados primero
- **Por Nombre**: Orden alfabético A-Z o Z-A

### 🏷️ Sistema de Etiquetas
- **Etiquetas Predefinidas**: basic, intermediate, advanced, jazz, rock, folk
- **Búsqueda por Etiquetas**: Filtrar por una o múltiples etiquetas
- **Auto-etiquetado**: Asignación automática basada en características

## Implementación Técnica

### Motor de Búsqueda Principal

```typescript
class ChordSearchEngine {
  private chords: ChordDiagram[];
  private searchIndex: FlexSearch.Index;
  private filters: ChordFilters;
  
  constructor(chords: ChordDiagram[]) {
    this.chords = chords;
    this.buildSearchIndex();
  }
  
  // Búsqueda principal con todos los filtros
  search(query: ChordSearchQuery): ChordSearchResult {
    let results = this.chords;
    
    // 1. Aplicar búsqueda de texto si existe
    if (query.text) {
      results = this.textSearch(query.text, results);
    }
    
    // 2. Aplicar filtros
    results = this.applyFilters(results, query.filters);
    
    // 3. Ordenar resultados
    results = this.sortResults(results, query.sort);
    
    // 4. Paginar
    const paginated = this.paginate(results, query.page, query.limit);
    
    return {
      query,
      total: results.length,
      results: paginated,
      facets: this.generateFacets(results),
      suggestions: this.generateSuggestions(query.text)
    };
  }
}
```

### Búsqueda de Texto Avanzada

```typescript
class TextSearchEngine {
  // Búsqueda combinada: exacta + difusa + fonética
  textSearch(query: string, chords: ChordDiagram[]): ScoredChord[] {
    const scoredResults: ScoredChord[] = [];
    
    chords.forEach(chord => {
      let score = 0;
      
      // 1. Coincidencia exacta (peso alto)
      if (chord.name.toLowerCase() === query.toLowerCase()) {
        score += 100;
      } else if (chord.nameEs.toLowerCase() === query.toLowerCase()) {
        score += 100;
      }
      
      // 2. Coincidencia de inicio (peso medio)
      if (chord.name.toLowerCase().startsWith(query.toLowerCase())) {
        score += 80;
      } else if (chord.nameEs.toLowerCase().startsWith(query.toLowerCase())) {
        score += 80;
      }
      
      // 3. Contiene la consulta (peso bajo)
      if (chord.name.toLowerCase().includes(query.toLowerCase())) {
        score += 60;
      } else if (chord.nameEs.toLowerCase().includes(query.toLowerCase())) {
        score += 60;
      }
      
      // 4. Búsqueda difusa (peso muy bajo)
      const fuzzyScore = this.fuzzyMatch(query, chord.name);
      if (fuzzyScore > 0.7) {
        score += fuzzyScore * 40;
      }
      
      // 5. Coincidencia fonética
      const phoneticScore = this.phoneticMatch(query, chord.name);
      if (phoneticScore > 0) {
        score += phoneticScore * 30;
      }
      
      // 6. Búsqueda en nombres completos
      if (chord.fullName.toLowerCase().includes(query.toLowerCase())) {
        score += 50;
      } else if (chord.fullNameEs.toLowerCase().includes(query.toLowerCase())) {
        score += 50;
      }
      
      // 7. Búsqueda en etiquetas
      chord.tags.forEach(tag => {
        if (tag.toLowerCase().includes(query.toLowerCase())) {
          score += 20;
        }
      });
      
      if (score > 0) {
        scoredResults.push({ chord, score });
      }
    });
    
    return scoredResults
      .sort((a, b) => b.score - a.score)
      .map(result => result.chord);
  }
  
  // Algoritmo de coincidencia difusa mejorado
  fuzzyMatch(query: string, target: string): number {
    const q = query.toLowerCase();
    const t = target.toLowerCase();
    
    // Usar distancia de Levenshtein normalizada
    const distance = this.levenshteinDistance(q, t);
    const maxLength = Math.max(q.length, t.length);
    
    if (maxLength === 0) return 1;
    
    return 1 - (distance / maxLength);
  }
  
  // Coincidencia fonética usando Soundex
  phoneticMatch(query: string, target: string): number {
    const querySoundex = this.soundex(query);
    const targetSoundex = this.soundex(target);
    
    return querySoundex === targetSoundex ? 1 : 0;
  }
}
```

### Sistema de Filtros Avanzado

```typescript
interface ChordFilters {
  instrument?: Instrument[];
  difficulty?: DifficultyRange;
  chordType?: ChordType[];
  hasBarres?: boolean;
  openStrings?: boolean;
  tags?: string[];
  root?: string[];
  quality?: ChordQuality[];
  fretRange?: FretRange;
}

class ChordFilterEngine {
  applyFilters(chords: ChordDiagram[], filters: ChordFilters): ChordDiagram[] {
    return chords.filter(chord => {
      // Filtro por instrumento
      if (filters.instrument && !filters.instrument.includes(chord.instrument)) {
        return false;
      }
      
      // Filtro por dificultad
      if (filters.difficulty) {
        const { min, max } = filters.difficulty;
        if (chord.difficulty < min || chord.difficulty > max) {
          return false;
        }
      }
      
      // Filtro por características de barré
      if (filters.hasBarres !== undefined) {
        const hasBarres = chord.barres && chord.barres.length > 0;
        if (hasBarres !== filters.hasBarres) {
          return false;
        }
      }
      
      // Filtro por cuerdas al aire
      if (filters.openStrings !== undefined) {
        const hasOpenStrings = chord.frets.includes(0);
        if (hasOpenStrings !== filters.openStrings) {
          return false;
        }
      }
      
      // Filtro por etiquetas
      if (filters.tags && filters.tags.length > 0) {
        const hasAnyTag = filters.tags.some(tag => chord.tags.includes(tag));
        if (!hasAnyTag) {
          return false;
        }
      }
      
      // Filtro por nota fundamental
      if (filters.root && filters.root.length > 0) {
        const chordRoot = this.extractRoot(chord.name);
        if (!filters.root.includes(chordRoot)) {
          return false;
        }
      }
      
      // Filtro por calidad de acorde
      if (filters.quality && filters.quality.length > 0) {
        const chordQuality = this.extractQuality(chord.name);
        if (!filters.quality.includes(chordQuality)) {
          return false;
        }
      }
      
      // Filtro por rango de trastes
      if (filters.fretRange) {
        const maxFret = Math.max(...chord.frets.filter(f => f > 0));
        if (maxFret < filters.fretRange.min || maxFret > filters.fretRange.max) {
          return false;
        }
      }
      
      return true;
    });
  }
}
```

### Generación de Facetas

```typescript
class FacetGenerator {
  generateFacets(chords: ChordDiagram[]): ChordSearchFacets {
    return {
      instruments: this.generateInstrumentFacet(chords),
      difficulties: this.generateDifficultyFacet(chords),
      chordTypes: this.generateChordTypeFacet(chords),
      features: this.generateFeatureFacet(chords),
      roots: this.generateRootFacet(chords),
      tags: this.generateTagFacet(chords)
    };
  }
  
  private generateInstrumentFacet(chords: ChordDiagram[]): FacetBucket[] {
    const counts = new Map<string, number>();
    
    chords.forEach(chord => {
      const current = counts.get(chord.instrument) || 0;
      counts.set(chord.instrument, current + 1);
    });
    
    return Array.from(counts.entries())
      .map(([instrument, count]) => ({ value: instrument, count }))
      .sort((a, b) => b.count - a.count);
  }
  
  private generateDifficultyFacet(chords: ChordDiagram[]): FacetBucket[] {
    const ranges = [
      { label: 'Principiante', min: 1, max: 2 },
      { label: 'Intermedio', min: 3, max: 4 },
      { label: 'Avanzado', min: 5, max: 5 }
    ];
    
    return ranges.map(range => ({
      value: range.label,
      count: chords.filter(chord => 
        chord.difficulty >= range.min && chord.difficulty <= range.max
      ).length
    }));
  }
  
  private generateFeatureFacet(chords: ChordDiagram[]): FacetBucket[] {
    const features = [
      {
        name: 'Acordes Barré',
        test: (chord: ChordDiagram) => chord.barres && chord.barres.length > 0
      },
      {
        name: 'Cuerdas al Aire',
        test: (chord: ChordDiagram) => chord.frets.includes(0)
      },
      {
        name: 'Posición Alta',
        test: (chord: ChordDiagram) => Math.max(...chord.frets.filter(f => f > 0)) > 7
      },
      {
        name: 'Digitaciones Alternativas',
        test: (chord: ChordDiagram) => chord.alternatives && chord.alternatives.length > 0
      }
    ];
    
    return features.map(feature => ({
      value: feature.name,
      count: chords.filter(feature.test).length
    }));
  }
}
```

## Interfaz de Usuario

### Componente de Búsqueda Principal

```tsx
function ChordSearch() {
  const [query, setQuery] = useState<ChordSearchQuery>({
    text: '',
    filters: {},
    sort: { field: 'relevance', direction: 'desc' },
    page: 1,
    limit: 20
  });
  
  const [results, setResults] = useState<ChordSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  
  const searchEngine = useChordSearchEngine();
  
  const handleSearch = useCallback(async (searchQuery: ChordSearchQuery) => {
    setLoading(true);
    try {
      const searchResults = await searchEngine.search(searchQuery);
      setResults(searchResults);
    } catch (error) {
      console.error('Error en búsqueda:', error);
    } finally {
      setLoading(false);
    }
  }, [searchEngine]);
  
  return (
    <div className="chord-search">
      <SearchInput
        value={query.text}
        onChange={(text) => setQuery(prev => ({ ...prev, text }))}
        onSearch={() => handleSearch(query)}
        placeholder="Buscar acordes... (ej: Cmaj7, Do menor, jazz)"
      />
      
      <div className="search-layout">
        <FilterPanel
          filters={query.filters}
          facets={results?.facets}
          onChange={(filters) => setQuery(prev => ({ ...prev, filters }))}
        />
        
        <ResultsPanel
          results={results?.results || []}
          loading={loading}
          total={results?.total || 0}
          query={query}
          onSortChange={(sort) => setQuery(prev => ({ ...prev, sort }))}
          onPageChange={(page) => setQuery(prev => ({ ...prev, page }))}
        />
      </div>
    </div>
  );
}
```

### Panel de Filtros

```tsx
function FilterPanel({ filters, facets, onChange }: FilterPanelProps) {
  const updateFilter = (key: keyof ChordFilters, value: any) => {
    onChange({ ...filters, [key]: value });
  };
  
  return (
    <div className="filter-panel">
      <h3>Filtros</h3>
      
      {/* Filtro por Instrumento */}
      <FilterSection title="Instrumento">
        {facets?.instruments.map(facet => (
          <FilterCheckbox
            key={facet.value}
            label={`${facet.value} (${facet.count})`}
            checked={filters.instrument?.includes(facet.value as Instrument)}
            onChange={(checked) => {
              const current = filters.instrument || [];
              const updated = checked
                ? [...current, facet.value as Instrument]
                : current.filter(i => i !== facet.value);
              updateFilter('instrument', updated);
            }}
          />
        ))}
      </FilterSection>
      
      {/* Filtro por Dificultad */}
      <FilterSection title="Dificultad">
        <DifficultySlider
          min={filters.difficulty?.min || 1}
          max={filters.difficulty?.max || 5}
          onChange={(range) => updateFilter('difficulty', range)}
        />
      </FilterSection>
      
      {/* Filtro por Características */}
      <FilterSection title="Características">
        <FilterCheckbox
          label="Acordes con Barré"
          checked={filters.hasBarres === true}
          onChange={(checked) => updateFilter('hasBarres', checked || undefined)}
        />
        <FilterCheckbox
          label="Cuerdas al Aire"
          checked={filters.openStrings === true}
          onChange={(checked) => updateFilter('openStrings', checked || undefined)}
        />
      </FilterSection>
      
      {/* Filtro por Etiquetas */}
      <FilterSection title="Etiquetas">
        <TagSelector
          availableTags={facets?.tags || []}
          selectedTags={filters.tags || []}
          onChange={(tags) => updateFilter('tags', tags)}
        />
      </FilterSection>
    </div>
  );
}
```

### Panel de Resultados

```tsx
function ResultsPanel({ 
  results, 
  loading, 
  total, 
  query, 
  onSortChange, 
  onPageChange 
}: ResultsPanelProps) {
  return (
    <div className="results-panel">
      <div className="results-header">
        <div className="results-info">
          {loading ? (
            'Buscando...'
          ) : (
            `${total} acordes encontrados`
          )}
        </div>
        
        <SortSelector
          value={query.sort}
          onChange={onSortChange}
          options={[
            { field: 'relevance', label: 'Relevancia' },
            { field: 'name', label: 'Nombre A-Z' },
            { field: 'difficulty', label: 'Dificultad' },
            { field: 'popularity', label: 'Popularidad' }
          ]}
        />
      </div>
      
      <div className="results-grid">
        {results.map(chord => (
          <ChordCard
            key={chord.id}
            chord={chord}
            onSelect={() => handleChordSelect(chord)}
          />
        ))}
      </div>
      
      <Pagination
        current={query.page}
        total={Math.ceil(total / query.limit)}
        onChange={onPageChange}
      />
    </div>
  );
}
```

## Características Especiales

### Sugerencias Inteligentes

```typescript
class ChordSuggestionEngine {
  generateSuggestions(query: string, chords: ChordDiagram[]): ChordSuggestion[] {
    const suggestions: ChordSuggestion[] = [];
    
    // 1. Corrección de errores tipográficos
    const corrections = this.getTypoCorrections(query, chords);
    suggestions.push(...corrections.map(c => ({
      type: 'correction',
      text: c.suggestion,
      reason: `¿Quisiste decir "${c.suggestion}"?`
    })));
    
    // 2. Completado automático
    const completions = this.getAutoCompletions(query, chords);
    suggestions.push(...completions.map(c => ({
      type: 'completion',
      text: c,
      reason: 'Completar búsqueda'
    })));
    
    // 3. Acordes relacionados
    const related = this.getRelatedChords(query, chords);
    suggestions.push(...related.map(c => ({
      type: 'related',
      text: c.name,
      reason: 'Acorde relacionado'
    })));
    
    return suggestions.slice(0, 5); // Máximo 5 sugerencias
  }
  
  private getTypoCorrections(query: string, chords: ChordDiagram[]): TypoCorrection[] {
    const corrections: TypoCorrection[] = [];
    
    chords.forEach(chord => {
      const distance = this.levenshteinDistance(query.toLowerCase(), chord.name.toLowerCase());
      const similarity = 1 - (distance / Math.max(query.length, chord.name.length));
      
      if (similarity > 0.6 && similarity < 0.95) {
        corrections.push({
          original: query,
          suggestion: chord.name,
          confidence: similarity
        });
      }
    });
    
    return corrections
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  }
}
```

### Búsqueda por Voz

```typescript
class VoiceSearchHandler {
  private recognition: SpeechRecognition | null = null;
  
  constructor() {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new webkitSpeechRecognition();
      this.setupRecognition();
    }
  }
  
  private setupRecognition() {
    if (!this.recognition) return;
    
    this.recognition.lang = 'es-ES'; // Español por defecto
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    
    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      this.processVoiceQuery(transcript);
    };
  }
  
  private processVoiceQuery(transcript: string) {
    // Procesar comando de voz y convertir a consulta de búsqueda
    let query = transcript.toLowerCase();
    
    // Mapear comandos en español
    const commandMappings = {
      'buscar': '',
      'acorde de': '',
      'encuentra': '',
      'muestra': '',
      'mayor': 'maj',
      'menor': 'm',
      'séptima': '7',
      'novena': '9'
    };
    
    Object.entries(commandMappings).forEach(([spanish, english]) => {
      query = query.replace(new RegExp(spanish, 'gi'), english);
    });
    
    this.onVoiceQuery(query.trim());
  }
  
  startListening() {
    if (this.recognition) {
      this.recognition.start();
    }
  }
}
```

### Historial de Búsqueda

```typescript
class SearchHistoryManager {
  private readonly STORAGE_KEY = 'chord_search_history';
  private readonly MAX_HISTORY = 20;
  
  addSearch(query: string): void {
    if (!query.trim()) return;
    
    const history = this.getHistory();
    const filtered = history.filter(item => item !== query);
    const updated = [query, ...filtered].slice(0, this.MAX_HISTORY);
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
  }
  
  getHistory(): string[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
  
  clearHistory(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
  
  getPopularSearches(): string[] {
    const history = this.getHistory();
    const frequency = new Map<string, number>();
    
    history.forEach(search => {
      frequency.set(search, (frequency.get(search) || 0) + 1);
    });
    
    return Array.from(frequency.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([search]) => search);
  }
}
```

## Optimización de Rendimiento

### Caché de Resultados

```typescript
class SearchResultCache {
  private cache = new LRUCache<string, ChordSearchResult>({ max: 100 });
  private readonly CACHE_TTL = 300000; // 5 minutos
  
  get(query: ChordSearchQuery): ChordSearchResult | null {
    const key = this.generateCacheKey(query);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached;
    }
    
    return null;
  }
  
  set(query: ChordSearchQuery, result: ChordSearchResult): void {
    const key = this.generateCacheKey(query);
    this.cache.set(key, {
      ...result,
      timestamp: Date.now()
    });
  }
  
  private generateCacheKey(query: ChordSearchQuery): string {
    return JSON.stringify({
      text: query.text,
      filters: query.filters,
      sort: query.sort
    });
  }
}
```

### Indexación para Búsqueda Rápida

```typescript
class ChordSearchIndex {
  private textIndex: FlexSearch.Index;
  private facetIndex: Map<string, Set<string>>;
  
  constructor(chords: ChordDiagram[]) {
    this.buildTextIndex(chords);
    this.buildFacetIndex(chords);
  }
  
  private buildTextIndex(chords: ChordDiagram[]) {
    this.textIndex = new FlexSearch.Index({
      tokenize: 'forward',
      resolution: 9,
      minlength: 1,
      optimize: true
    });
    
    chords.forEach((chord, index) => {
      // Indexar múltiples campos
      const searchableText = [
        chord.name,
        chord.nameEs,
        chord.fullName,
        chord.fullNameEs,
        ...chord.tags
      ].join(' ');
      
      this.textIndex.add(index, searchableText);
    });
  }
  
  search(query: string): number[] {
    return this.textIndex.search(query, { limit: 1000 });
  }
}
```

---

**Idioma:** [English](chord-diagram-search.md) | **Español**

*Para más información sobre acordes, consulte la [Referencia de Base de Datos](chord-database-reference-es.md) y la [Guía del Desarrollador](chord-diagram-developer-guide-es.md).*