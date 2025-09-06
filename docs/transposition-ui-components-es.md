---
layout: default
lang: es
title: Componentes de UI de Transposición
---

# Documentación de Componentes de UI de Transposición

## Resumen

El componente TranspositionControls mejorado proporciona funcionalidad completa de transposición para contenido ChordPro, incluyendo características avanzadas como selección de tonalidad, cambio de sistema de notación y atajos de teclado.

## Componentes

### TranspositionControls

El componente principal que maneja todas las operaciones de transposición.

```typescript
interface TranspositionControlsProps {
  currentKey?: string;           // Tonalidad actual
  onTranspose: (semitones: number) => void;  // Callback de transposición
  onKeyChange?: (key: string) => void;       // Callback de cambio de tonalidad
  onNotationChange?: (notation: NotationSystem) => void; // Cambio de sistema
  disabled?: boolean;            // Deshabilitar controles
  showKeySelector?: boolean;     // Mostrar selector de tonalidad
  showNotationSelector?: boolean; // Mostrar selector de notación
  compact?: boolean;             // Modo compacto
  orientation?: 'horizontal' | 'vertical'; // Orientación
}
```

#### Uso Básico

```tsx
import { TranspositionControls } from './components/TranspositionControls';

function SongEditor() {
  const [currentKey, setCurrentKey] = useState('C');
  const [content, setContent] = useState(chordProContent);
  
  const handleTranspose = (semitones: number) => {
    const transposed = transposeContent(content, semitones);
    setContent(transposed);
  };
  
  const handleKeyChange = (newKey: string) => {
    const semitones = calculateSemitones(currentKey, newKey);
    handleTranspose(semitones);
    setCurrentKey(newKey);
  };
  
  return (
    <div>
      <TranspositionControls
        currentKey={currentKey}
        onTranspose={handleTranspose}
        onKeyChange={handleKeyChange}
        showKeySelector={true}
        showNotationSelector={true}
      />
      <ChordProEditor content={content} onChange={setContent} />
    </div>
  );
}
```

### KeySelector

Componente para seleccionar tonalidades específicas.

```typescript
interface KeySelectorProps {
  currentKey?: string;
  onKeyChange: (key: string) => void;
  keys?: string[];              // Tonalidades disponibles
  showMajorMinor?: boolean;     // Mostrar mayor/menor
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}
```

#### Implementación

```tsx
function KeySelector({ currentKey, onKeyChange, showMajorMinor = true }: KeySelectorProps) {
  const majorKeys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const minorKeys = majorKeys.map(key => key + 'm');
  
  return (
    <div className="key-selector">
      <label>{t('transposition.keyLabel')}</label>
      <select 
        value={currentKey} 
        onChange={(e) => onKeyChange(e.target.value)}
        className="key-select"
      >
        <optgroup label={t('transposition.majorKeys')}>
          {majorKeys.map(key => (
            <option key={key} value={key}>{key}</option>
          ))}
        </optgroup>
        {showMajorMinor && (
          <optgroup label={t('transposition.minorKeys')}>
            {minorKeys.map(key => (
              <option key={key} value={key}>{key}</option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}
```

### NotationSelector

Componente para cambiar entre sistemas de notación.

```typescript
interface NotationSelectorProps {
  currentNotation: NotationSystem;
  onNotationChange: (notation: NotationSystem) => void;
  disabled?: boolean;
  showLabels?: boolean;
}

type NotationSystem = 'english' | 'latin' | 'german';
```

#### Implementación

```tsx
function NotationSelector({ currentNotation, onNotationChange }: NotationSelectorProps) {
  const notationSystems = [
    { id: 'english', name: 'English', example: 'C D E F G A B' },
    { id: 'latin', name: 'Latino', example: 'Do Re Mi Fa Sol La Si' },
    { id: 'german', name: 'Alemán', example: 'C D E F G A H' }
  ];
  
  return (
    <div className="notation-selector">
      <label>{t('transposition.notationSystem')}</label>
      <div className="notation-options">
        {notationSystems.map(system => (
          <button
            key={system.id}
            className={`notation-option ${currentNotation === system.id ? 'active' : ''}`}
            onClick={() => onNotationChange(system.id as NotationSystem)}
            title={system.example}
          >
            {system.name}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### TranspositionButtons

Botones para transposición incremental.

```typescript
interface TranspositionButtonsProps {
  onTranspose: (semitones: number) => void;
  disabled?: boolean;
  showLabels?: boolean;
  variant?: 'arrows' | 'buttons' | 'compact';
}
```

#### Implementación

```tsx
function TranspositionButtons({ onTranspose, variant = 'arrows' }: TranspositionButtonsProps) {
  const transposeUp = () => onTranspose(1);
  const transposeDown = () => onTranspose(-1);
  const transposeUpFifth = () => onTranspose(7);
  const transposeDownFifth = () => onTranspose(-7);
  
  if (variant === 'arrows') {
    return (
      <div className="transposition-arrows">
        <button 
          className="transpose-btn up"
          onClick={transposeUp}
          title={t('transposition.transposeUp')}
        >
          ↑
        </button>
        <button 
          className="transpose-btn down"
          onClick={transposeDown}
          title={t('transposition.transposeDown')}
        >
          ↓
        </button>
      </div>
    );
  }
  
  return (
    <div className="transposition-buttons">
      <button onClick={transposeDownFifth} title="♭7">♭7</button>
      <button onClick={transposeDown} title="♭1">♭1</button>
      <span className="current-key-display">{currentKey}</span>
      <button onClick={transposeUp} title="♯1">♯1</button>
      <button onClick={transposeUpFifth} title="♯7">♯7</button>
    </div>
  );
}
```

## Características Avanzadas

### Detección Automática de Tonalidad

```typescript
class KeyDetector {
  static detectKey(chordProContent: string): string {
    const chords = this.extractChords(chordProContent);
    const keySignatures = this.analyzeKeySignatures(chords);
    
    return keySignatures.mostLikely || 'C';
  }
  
  private static extractChords(content: string): string[] {
    const chordMatches = content.match(/\[([^\]]+)\]/g) || [];
    return chordMatches.map(match => 
      match.substring(1, match.length - 1)
    );
  }
  
  private static analyzeKeySignatures(chords: string[]): KeyAnalysis {
    const keyScores = new Map<string, number>();
    
    // Analizar progresiones comunes
    const progressions = this.findProgressions(chords);
    progressions.forEach(progression => {
      const likelyKeys = this.getKeysForProgression(progression);
      likelyKeys.forEach(key => {
        keyScores.set(key, (keyScores.get(key) || 0) + 1);
      });
    });
    
    const sortedKeys = Array.from(keyScores.entries())
      .sort(([,a], [,b]) => b - a);
    
    return {
      mostLikely: sortedKeys[0]?.[0] || 'C',
      confidence: sortedKeys[0]?.[1] || 0,
      alternatives: sortedKeys.slice(1, 4).map(([key]) => key)
    };
  }
}
```

### Historial de Transposiciones

```typescript
class TranspositionHistory {
  private history: TranspositionStep[] = [];
  private currentIndex = -1;
  
  addTransposition(fromKey: string, toKey: string, semitones: number): void {
    const step: TranspositionStep = {
      fromKey,
      toKey,
      semitones,
      timestamp: new Date()
    };
    
    // Eliminar pasos futuros si estamos en el medio del historial
    this.history = this.history.slice(0, this.currentIndex + 1);
    
    // Agregar nuevo paso
    this.history.push(step);
    this.currentIndex++;
    
    // Limitar tamaño del historial
    if (this.history.length > 50) {
      this.history = this.history.slice(-50);
      this.currentIndex = this.history.length - 1;
    }
  }
  
  undo(): TranspositionStep | null {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      const step = this.history[this.currentIndex];
      return {
        ...step,
        semitones: -step.semitones // Invertir transposición
      };
    }
    return null;
  }
  
  redo(): TranspositionStep | null {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      return this.history[this.currentIndex];
    }
    return null;
  }
}
```

### Validación de Transposición

```typescript
class TranspositionValidator {
  static validateTransposition(
    content: string, 
    semitones: number
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Verificar rango de transposición
    if (Math.abs(semitones) > 12) {
      warnings.push({
        type: 'LARGE_TRANSPOSITION',
        message: 'Transposición mayor a una octava puede resultar en acordes difíciles'
      });
    }
    
    // Verificar acordes resultantes
    const chords = this.extractChords(content);
    const transposedChords = chords.map(chord => transposeChord(chord, semitones));
    
    transposedChords.forEach(chord => {
      if (!this.isPlayableChord(chord)) {
        warnings.push({
          type: 'DIFFICULT_CHORD',
          message: `El acorde ${chord} puede ser difícil de tocar`,
          chord
        });
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  private static isPlayableChord(chord: string): boolean {
    // Verificar si el acorde es tocable en instrumentos comunes
    const difficultKeys = ['F#', 'C#', 'G#', 'D#', 'A#'];
    const root = this.getChordRoot(chord);
    
    return !difficultKeys.includes(root) || this.hasEasyAlternative(chord);
  }
}
```

## Integración con ChordPro

### Motor de Transposición

```typescript
class ChordProTransposer {
  static transpose(content: string, semitones: number): string {
    // Transponer acordes en líneas de letra
    content = content.replace(/\[([^\]]+)\]/g, (match, chord) => {
      const transposed = this.transposeChord(chord, semitones);
      return `[${transposed}]`;
    });
    
    // Actualizar directiva de tonalidad si existe
    content = content.replace(/\{key:\s*([^}]+)\}/gi, (match, key) => {
      const transposed = this.transposeKey(key.trim(), semitones);
      return `{key: ${transposed}}`;
    });
    
    // Actualizar directiva de capo si es necesario
    content = this.updateCapoDirective(content, semitones);
    
    return content;
  }
  
  private static transposeChord(chord: string, semitones: number): string {
    const parts = this.parseChord(chord);
    const transposedRoot = this.transposeNote(parts.root, semitones);
    const transposedBass = parts.bass ? 
      this.transposeNote(parts.bass, semitones) : '';
    
    return this.reconstructChord({
      ...parts,
      root: transposedRoot,
      bass: transposedBass
    });
  }
  
  private static parseChord(chord: string): ChordParts {
    const chordRegex = /^([A-G][#b]?)([^/]*)(\/([A-G][#b]?))?$/;
    const match = chord.match(chordRegex);
    
    if (!match) {
      throw new Error(`Invalid chord: ${chord}`);
    }
    
    return {
      root: match[1],
      quality: match[2] || '',
      bass: match[4] || ''
    };
  }
}
```

### Conversión de Sistemas de Notación

```typescript
class NotationConverter {
  private static notationMaps = {
    english: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
    latin: ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'],
    german: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'H']
  };
  
  static convert(
    content: string, 
    fromNotation: NotationSystem, 
    toNotation: NotationSystem
  ): string {
    if (fromNotation === toNotation) return content;
    
    const fromMap = this.notationMaps[fromNotation];
    const toMap = this.notationMaps[toNotation];
    
    // Convertir acordes
    content = content.replace(/\[([^\]]+)\]/g, (match, chord) => {
      const converted = this.convertChord(chord, fromMap, toMap);
      return `[${converted}]`;
    });
    
    // Convertir directivas de tonalidad
    content = content.replace(/\{key:\s*([^}]+)\}/gi, (match, key) => {
      const converted = this.convertNote(key.trim(), fromMap, toMap);
      return `{key: ${converted}}`;
    });
    
    return content;
  }
  
  private static convertChord(chord: string, fromMap: string[], toMap: string[]): string {
    const parts = this.parseChord(chord);
    
    return this.reconstructChord({
      root: this.convertNote(parts.root, fromMap, toMap),
      quality: parts.quality,
      bass: parts.bass ? this.convertNote(parts.bass, fromMap, toMap) : ''
    });
  }
  
  private static convertNote(note: string, fromMap: string[], toMap: string[]): string {
    const index = fromMap.findIndex(n => 
      n.toLowerCase() === note.toLowerCase()
    );
    
    if (index === -1) {
      console.warn(`Note not found in source notation: ${note}`);
      return note;
    }
    
    return toMap[index];
  }
}
```

## Estilado y Temas

### Estilos CSS

```css
/* Contenedor principal */
.transposition-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: var(--transposition-bg, #f8f9fa);
  border: 1px solid var(--transposition-border, #dee2e6);
  border-radius: 6px;
  font-size: 14px;
}

/* Botones de transposición */
.transpose-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--button-border, #ccc);
  background: var(--button-bg, #fff);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 16px;
  font-weight: bold;
}

.transpose-btn:hover {
  background: var(--button-hover-bg, #e9ecef);
  border-color: var(--button-hover-border, #adb5bd);
}

.transpose-btn:active {
  transform: translateY(1px);
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
}

.transpose-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

/* Selector de tonalidad */
.key-selector {
  display: flex;
  align-items: center;
  gap: 6px;
}

.key-select {
  padding: 4px 8px;
  border: 1px solid var(--input-border, #ced4da);
  border-radius: 4px;
  background: var(--input-bg, #fff);
  font-size: 14px;
  min-width: 60px;
}

/* Selector de notación */
.notation-selector {
  display: flex;
  align-items: center;
  gap: 6px;
}

.notation-options {
  display: flex;
  border: 1px solid var(--button-border, #ccc);
  border-radius: 4px;
  overflow: hidden;
}

.notation-option {
  padding: 6px 12px;
  border: none;
  background: var(--button-bg, #fff);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
  border-right: 1px solid var(--button-border, #ccc);
}

.notation-option:last-child {
  border-right: none;
}

.notation-option:hover {
  background: var(--button-hover-bg, #e9ecef);
}

.notation-option.active {
  background: var(--primary-color, #007bff);
  color: white;
}

/* Modo compacto */
.transposition-controls.compact {
  padding: 4px 8px;
  gap: 8px;
}

.transposition-controls.compact .transpose-btn {
  width: 24px;
  height: 24px;
  font-size: 14px;
}

/* Modo vertical */
.transposition-controls.vertical {
  flex-direction: column;
  width: fit-content;
}

/* Tema oscuro */
@media (prefers-color-scheme: dark) {
  .transposition-controls {
    --transposition-bg: #343a40;
    --transposition-border: #495057;
    --button-bg: #495057;
    --button-border: #6c757d;
    --button-hover-bg: #5a6268;
    --input-bg: #495057;
    --input-border: #6c757d;
  }
}
```

### Configuración de Temas

```typescript
interface TranspositionTheme {
  colors: {
    background: string;
    border: string;
    buttonBackground: string;
    buttonBorder: string;
    buttonHover: string;
    buttonActive: string;
    text: string;
    accent: string;
  };
  spacing: {
    gap: number;
    padding: number;
    buttonSize: number;
  };
  typography: {
    fontSize: number;
    fontWeight: number;
    fontFamily: string;
  };
}

const defaultTheme: TranspositionTheme = {
  colors: {
    background: '#f8f9fa',
    border: '#dee2e6',
    buttonBackground: '#ffffff',
    buttonBorder: '#ced4da',
    buttonHover: '#e9ecef',
    buttonActive: '#007bff',
    text: '#495057',
    accent: '#007bff'
  },
  spacing: {
    gap: 12,
    padding: 8,
    buttonSize: 32
  },
  typography: {
    fontSize: 14,
    fontWeight: 400,
    fontFamily: 'system-ui, sans-serif'
  }
};
```

## Accesibilidad

### Soporte para Lectores de Pantalla

```tsx
function AccessibleTranspositionControls() {
  return (
    <div 
      className="transposition-controls"
      role="toolbar"
      aria-label={t('transposition.controlsLabel')}
    >
      <button
        className="transpose-btn up"
        onClick={transposeUp}
        aria-label={t('transposition.transposeUpLabel')}
        aria-keyshortcuts="Shift+ArrowUp"
      >
        ↑
      </button>
      
      <button
        className="transpose-btn down"
        onClick={transposeDown}
        aria-label={t('transposition.transposeDownLabel')}
        aria-keyshortcuts="Shift+ArrowDown"
      >
        ↓
      </button>
      
      <div className="key-selector" role="group" aria-labelledby="key-label">
        <label id="key-label">{t('transposition.currentKey')}</label>
        <select
          value={currentKey}
          onChange={handleKeyChange}
          aria-describedby="key-help"
        >
          {keys.map(key => (
            <option key={key} value={key}>{key}</option>
          ))}
        </select>
        <div id="key-help" className="sr-only">
          {t('transposition.keyHelp')}
        </div>
      </div>
    </div>
  );
}
```

### Navegación por Teclado

```typescript
function useKeyboardNavigation(controlsRef: RefObject<HTMLElement>) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!controlsRef.current?.contains(event.target as Node)) return;
      
      switch (event.key) {
        case 'ArrowUp':
          if (event.shiftKey) {
            event.preventDefault();
            onTranspose(1);
          }
          break;
          
        case 'ArrowDown':
          if (event.shiftKey) {
            event.preventDefault();
            onTranspose(-1);
          }
          break;
          
        case 'Home':
          event.preventDefault();
          // Ir a Do Mayor
          onKeyChange('C');
          break;
          
        case 'End':
          event.preventDefault();
          // Ir a Si Mayor
          onKeyChange('B');
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onTranspose, onKeyChange]);
}
```

## Testing

### Testing de Componentes

```typescript
describe('TranspositionControls', () => {
  test('should transpose up when up button clicked', () => {
    const onTranspose = jest.fn();
    render(
      <TranspositionControls 
        currentKey="C" 
        onTranspose={onTranspose} 
      />
    );
    
    fireEvent.click(screen.getByLabelText('Transpose up'));
    expect(onTranspose).toHaveBeenCalledWith(1);
  });
  
  test('should transpose down when down button clicked', () => {
    const onTranspose = jest.fn();
    render(
      <TranspositionControls 
        currentKey="C" 
        onTranspose={onTranspose} 
      />
    );
    
    fireEvent.click(screen.getByLabelText('Transpose down'));
    expect(onTranspose).toHaveBeenCalledWith(-1);
  });
  
  test('should change key when selector changed', () => {
    const onKeyChange = jest.fn();
    render(
      <TranspositionControls 
        currentKey="C" 
        onKeyChange={onKeyChange}
        showKeySelector={true}
      />
    );
    
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'G' }
    });
    expect(onKeyChange).toHaveBeenCalledWith('G');
  });
});
```

### Testing de Integración

```typescript
describe('Transposition Integration', () => {
  test('should transpose ChordPro content correctly', () => {
    const content = '[C]Hello [G]world [Am]test [F]song';
    const transposed = ChordProTransposer.transpose(content, 2);
    
    expect(transposed).toBe('[D]Hello [A]world [Bm]test [G]song');
  });
  
  test('should convert notation systems', () => {
    const content = '[C]Do [G]Sol [Am]Lam';
    const converted = NotationConverter.convert(content, 'english', 'latin');
    
    expect(converted).toBe('[Do]Do [Sol]Sol [Lam]Lam');
  });
});
```

---

**Idioma:** [English](transposition-ui-components.md) | **Español**

*Para más información sobre transposición, consulte el [Algoritmo de Transposición](chord-transposition-algorithm-es.md) y los [Ejemplos de Transposición](chord-transposition-examples-es.md).*