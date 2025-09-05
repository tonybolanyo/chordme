# Transposition UI Components Documentation

## Overview

The Enhanced TranspositionControls component provides comprehensive transposition functionality for ChordPro content, including advanced features like key selection, notation system switching, and keyboard shortcuts.

## Components

### TranspositionControls

An enhanced UI component that allows users to transpose musical content with advanced features.

#### Basic Usage

```tsx
import { TranspositionControls } from '../components';

<TranspositionControls 
  onTranspose={(semitones) => handleTranspose(semitones)}
/>
```

#### Advanced Usage

```tsx
import { TranspositionControls, NotationSystem } from '../components';

<TranspositionControls 
  onTranspose={(semitones) => handleTranspose(semitones)}
  onKeyChange={(key) => handleKeyChange(key)}
  onNotationSystemChange={(system) => handleNotationChange(system)}
  onReset={() => handleReset()}
  currentTransposition={2}
  originalKey="C"
  currentKey="D"
  notationSystem="american"
  enableAdvancedFeatures={true}
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `onTranspose` | `(semitones: number) => void` | ✓ | - | Callback when transposing by semitones |
| `onKeyChange` | `(key: string) => void` | - | - | Callback when key is selected from dropdown |
| `onNotationSystemChange` | `(system: NotationSystem) => void` | - | - | Callback when notation system is toggled |
| `onReset` | `() => void` | - | - | Callback when reset button is clicked |
| `currentTransposition` | `number` | - | `0` | Current transposition amount in semitones |
| `originalKey` | `string` | - | - | Original key signature |
| `currentKey` | `string` | - | - | Current key signature after transposition |
| `notationSystem` | `NotationSystem` | - | `'american'` | Current notation system ('american' or 'latin') |
| `disabled` | `boolean` | - | `false` | Disable all controls |
| `className` | `string` | - | `''` | Additional CSS classes |
| `style` | `React.CSSProperties` | - | - | Inline styles |
| `enableAdvancedFeatures` | `boolean` | - | `true` | Enable/disable advanced features |

## Features

### 1. Basic Transposition Controls

- **Transpose Up (♯)**: Increases pitch by one semitone
- **Transpose Down (♭)**: Decreases pitch by one semitone
- **Visual Feedback**: Shows current transposition amount (+2, -1, etc.)

### 2. Key Selection

When `onKeyChange` is provided:
- Dropdown with all major and minor keys
- Includes common keys: C, G, D, A, E, B, F#, C#, F, Bb, Eb, Ab, Db, Gb
- Minor keys: Am, Em, Bm, F#m, C#m, G#m, D#m, A#m, Dm, Gm, Cm, Fm, Bbm, Ebm

### 3. Key Display

When `originalKey` is provided:
- Shows "Original: C" format
- When transposed, shows "Original: C → D" with arrow
- Visual distinction between original and current key

### 4. Notation System Toggle

When `onNotationSystemChange` is provided:
- Toggle between American (ABC) and Latin (DoReMi) notation
- Button shows "ABC" for American notation
- Button shows "DoReMi" for Latin notation
- Color-coded for easy identification

### 5. Reset Functionality

When `onReset` is provided:
- Reset button to return to original key
- Automatically disabled when `currentTransposition` is 0
- Keyboard shortcut: Ctrl+0

### 6. Keyboard Shortcuts

When `enableAdvancedFeatures` is true:
- **Ctrl+↑** or **Ctrl++**: Transpose up
- **Ctrl+↓** or **Ctrl+-**: Transpose down  
- **Ctrl+0**: Reset to original
- **Cmd** key supported on Mac

### 7. Accessibility Features

- Full ARIA label support
- Keyboard navigation support
- Screen reader friendly
- Focus management
- Helpful tooltips with keyboard shortcuts

### 8. Responsive Design

- Mobile-friendly layout
- Flexbox-based responsive design
- Proper spacing on all screen sizes
- Dark mode support

## Styling

### CSS Classes

```css
.transposition-controls          /* Main container */
.transposition-basic-controls    /* Basic transpose buttons section */
.transposition-advanced-controls /* Advanced features section */
.transpose-button               /* Individual transpose buttons */
.transpose-up                   /* Transpose up button */
.transpose-down                 /* Transpose down button */
.key-selection-dropdown         /* Key selection dropdown */
.key-display                    /* Key display area */
.notation-toggle                /* Notation system toggle button */
.reset-button                   /* Reset button */
.keyboard-shortcuts-hint        /* Keyboard shortcuts text */
```

### Customization

```css
/* Custom styling example */
.my-transposition-controls {
  border: 2px solid #007bff;
  border-radius: 12px;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
}

.my-transposition-controls .transpose-button {
  background: #007bff;
  color: white;
  border-radius: 50%;
}
```

## Integration Examples

### With ChordPro Content

```tsx
import { useState } from 'react';
import { TranspositionControls } from '../components';
import { transposeChordProContentWithKey } from '../services/chordService';

function ChordProEditor() {
  const [content, setContent] = useState(originalContent);
  const [transposition, setTransposition] = useState(0);
  const [notationSystem, setNotationSystem] = useState('american');

  const handleTranspose = (semitones) => {
    const newTransposition = transposition + semitones;
    setTransposition(newTransposition);
    
    const transposed = transposeChordProContentWithKey(
      originalContent, 
      newTransposition,
      originalKey,
      notationSystem
    );
    setContent(transposed);
  };

  return (
    <div>
      <TranspositionControls 
        onTranspose={handleTranspose}
        currentTransposition={transposition}
        originalKey="C"
        notationSystem={notationSystem}
        onNotationSystemChange={setNotationSystem}
      />
      <textarea value={content} onChange={setContent} />
    </div>
  );
}
```

### With State Management

```tsx
// Using custom hook for transposition state
function useTransposition(originalContent, originalKey) {
  const [transposition, setTransposition] = useState(0);
  const [currentKey, setCurrentKey] = useState(originalKey);
  const [content, setContent] = useState(originalContent);
  
  const transpose = (semitones) => {
    const newTransposition = transposition + semitones;
    setTransposition(newTransposition);
    // ... update content and key
  };
  
  const reset = () => {
    setTransposition(0);
    setCurrentKey(originalKey);
    setContent(originalContent);
  };
  
  return { transpose, reset, transposition, currentKey, content };
}
```

## Testing

The component includes comprehensive test coverage:

- **49 passing tests** covering all functionality
- Unit tests for all props and callbacks
- Keyboard shortcut testing
- Accessibility testing
- Feature toggle testing
- Integration testing

Run tests with:
```bash
npm run test -- TranspositionControls.test.tsx
```

## Browser Compatibility

- Modern browsers supporting ES2020+
- React 19+ required
- TypeScript support included

## Performance

- Minimal re-renders with proper React optimization
- Keyboard event listeners cleaned up on unmount
- No memory leaks
- Efficient state management

## Examples in Demo

See the live examples in the ChordPro Demo page at `/demo` which showcases:
- Basic transposition controls
- Advanced features demonstration
- Real-time transposition of musical content
- Integration with ChordPro editor and viewer