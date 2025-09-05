---
layout: default
lang: en
title: ChordPro Validation Rules Reference
---

# ChordPro Validation Rules Reference

Complete reference guide for all validation rules implemented in ChordMe's ChordPro validation system.

## Overview

ChordMe validates ChordPro content using a comprehensive set of rules that check syntax, security, formatting, and language-specific patterns. This reference documents all validation rules, their purposes, and configuration options.

## Rule Categories

### 1. Chord Syntax Rules

#### Rule: `chord-notation-format`
**Purpose:** Validates chord notation follows standard ChordPro format
**Pattern:** `[A-G][#b]?[mM]?(?:maj|min|dim|aug|sus|add)?[0-9]*(?:[#b]?[0-9]*)?(?:\/[A-G][#b]?)?`
**Severity:** Error

**Valid Examples:**
```
[C] [G] [Am] [F] [C7] [Dm9] [G/B] [F#m] [Bbadd9]
```

**Invalid Examples:**
```
[X] [H] [c] [123] [CB] [lowercase]
```

**Error Messages:**
- English: "Invalid chord notation: \"{chord}\""
- Spanish: "Notación de acorde inválida: \"{chord}\""

**Fixes:**
- Use uppercase root notes (A-G)
- Avoid German notation (H → B)
- Check chord extensions spelling
- Ensure proper slash chord format

#### Rule: `chord-case-sensitivity`
**Purpose:** Ensures chord names use proper capitalization
**Pattern:** Lowercase root notes in chord brackets
**Severity:** Error

**Common Issues:**
```
[c] → [C]
[dm] → [Dm]
[g7] → [G7]
```

#### Rule: `empty-chord-brackets`
**Purpose:** Detects empty chord notations
**Pattern:** `\[\s*\]`
**Severity:** Warning

**Example:**
```
[] Some lyrics here  ← Warning: empty chord
```

**Fix:** Remove empty brackets or add chord name

### 2. Directive Format Rules

#### Rule: `directive-syntax-format`
**Purpose:** Validates directive syntax follows `{directive}` or `{directive: value}` format
**Pattern:** `^\{[^}]+\}$`
**Severity:** Error

**Valid Examples:**
```
{title: Song Title}
{artist: Artist Name}
{start_of_chorus}
{end_of_verse}
{key: C}
{tempo: 120}
```

**Invalid Examples:**
```
{incomplete
{: empty directive}
{title Song Title}  ← Missing colon
title: Outside braces  ← Missing braces
```

#### Rule: `known-directive-validation`
**Purpose:** Validates directives against known ChordPro standard (strict mode only)
**Severity:** Warning

**Standard Directives:**
- **Metadata:** `title`, `artist`, `album`, `year`, `key`, `capo`, `tempo`, `time`, `duration`
- **Structure:** `start_of_verse`, `end_of_verse`, `start_of_chorus`, `end_of_chorus`, `start_of_bridge`, `end_of_bridge`
- **Shorthand:** `verse`, `chorus`, `bridge`, `c`, `soc`, `eoc`, `sov`, `eov`, `sob`, `eob`
- **Other:** `comment`

**Custom Directives:** Allowed in relaxed mode, warned in strict mode

#### Rule: `directive-typo-detection`
**Purpose:** Detects common typos in directive names
**Severity:** Warning

**Common Typos:**
```
{titel} → {title}
{artis} → {artist}
{tite} → {title}
{albun} → {album}
{yesr} → {year}
```

**Language-Specific Typos (Spanish):**
```
{titulo} → {title} (or use Spanish mode)
{artista} → {artist} (or use Spanish mode)
{comentario} → {comment} (or use Spanish mode)
```

#### Rule: `empty-directive-braces`
**Purpose:** Detects empty directive braces
**Pattern:** `\{\s*\}`
**Severity:** Warning

**Example:**
```
{} Empty directive  ← Warning
```

### 3. Bracket Matching Rules

#### Rule: `chord-bracket-balance`
**Purpose:** Ensures chord brackets `[]` are properly balanced
**Severity:** Warning

**Detection:** Counts opening `[` and closing `]` brackets

**Common Issues:**
```
[C [G] Missing closing bracket
[Am] Extra closing bracket]
```

#### Rule: `directive-bracket-balance`
**Purpose:** Ensures directive braces `{}` are properly balanced
**Severity:** Warning

**Detection:** Counts opening `{` and closing `}` braces

**Common Issues:**
```
{title: Song missing closing brace
{artist: Name} Extra closing brace}
```

### 4. Security Rules

#### Rule: `script-tag-detection`
**Purpose:** Prevents script injection attacks
**Pattern:** `<script[^>]*>`
**Severity:** Error

**Blocked Content:**
```
<script>alert('xss')</script>
<script src="malicious.js"></script>
```

#### Rule: `javascript-protocol-detection`
**Purpose:** Blocks JavaScript protocol usage
**Pattern:** `javascript:`
**Severity:** Error

**Blocked Content:**
```
javascript:void(0)
javascript:alert('test')
```

#### Rule: `event-handler-detection`
**Purpose:** Prevents event handler injection
**Pattern:** `on\w+\s*=`
**Severity:** Error

**Blocked Content:**
```
onclick="malicious()"
onload="badCode()"
onerror="exploit()"
```

#### Rule: `dangerous-html-tags`
**Purpose:** Blocks potentially dangerous HTML elements
**Patterns:** `<iframe`, `<object`, `<embed`
**Severity:** Error

**Blocked Content:**
```
<iframe src="malicious.com">
<object data="exploit.swf">
<embed src="dangerous.mov">
```

#### Rule: `excessive-special-characters`
**Purpose:** Detects suspiciously high concentration of special characters
**Threshold:** Configurable (default: 10% of content)
**Severity:** Warning

**Special Characters:** `<>&"'`

### 5. Format and Quality Rules

#### Rule: `line-length-validation`
**Purpose:** Warns about excessively long lines (optional)
**Threshold:** Configurable (default: 120 characters)
**Severity:** Info

#### Rule: `whitespace-consistency`
**Purpose:** Detects inconsistent indentation (optional)
**Severity:** Info

#### Rule: `duplicate-directive-detection`
**Purpose:** Warns about duplicate metadata directives
**Severity:** Warning

**Example:**
```
{title: First Title}
{title: Second Title}  ← Warning: duplicate title
```

### 6. Language-Specific Rules

#### Spanish Chord Notation Rules

**Rule:** `spanish-chord-recognition`
**Purpose:** Recognizes and converts Spanish chord notation
**Severity:** Info (conversion notice)

**Conversions:**
```
[Do] → [C]    [dom] → [Cm]
[Re] → [D]    [rem] → [Dm]
[Mi] → [E]    [mim] → [Em]
[Fa] → [F]    [fam] → [Fm]
[Sol] → [G]   [solm] → [Gm]
[La] → [A]    [lam] → [Am]
[Si] → [B]    [sim] → [Bm]
```

#### Spanish Directive Aliases

**Rule:** `spanish-directive-aliases`
**Purpose:** Recognizes Spanish directive names
**Severity:** Info (conversion notice)

**Aliases:**
```
{titulo} → {title}
{artista} → {artist}
{coro} → {chorus}
{estrofa} → {verse}
{puente} → {bridge}
{comentario} → {comment}
{inicio_coro} → {start_of_chorus}
{fin_coro} → {end_of_chorus}
{inicio_estrofa} → {start_of_verse}
{fin_estrofa} → {end_of_verse}
```

## Configuration Options

### Validation Modes

#### Strict Mode
```javascript
{
  strictMode: true,
  checkSecurity: true,
  checkBrackets: true,
  checkEmptyElements: true,
  checkTypos: true,
  maxSpecialCharPercent: 0.05
}
```

**Characteristics:**
- Validates all directives against known standard
- Reports unknown directives as warnings
- Enforces formatting conventions
- Minimal tolerance for deviations

#### Relaxed Mode (Default)
```javascript
{
  strictMode: false,
  checkSecurity: true,
  checkBrackets: true,
  checkEmptyElements: true,
  checkTypos: true,
  maxSpecialCharPercent: 0.1
}
```

**Characteristics:**
- Allows custom directives without warnings
- Focuses on critical syntax errors
- Balances validation with flexibility
- Best for most users

#### Minimal Mode
```javascript
{
  strictMode: false,
  checkSecurity: false,
  checkBrackets: true,
  checkEmptyElements: false,
  checkTypos: false,
  maxSpecialCharPercent: 0.5
}
```

**Characteristics:**
- Only checks critical syntax errors
- Minimal performance impact
- Very permissive approach
- Best for large documents

### Individual Rule Configuration

#### Disabling Specific Rules
```javascript
const config = {
  checkSecurity: false,      // Disable security scanning
  checkBrackets: false,      // Disable bracket matching
  checkEmptyElements: false, // Allow empty {} and []
  checkTypos: false,         // Disable typo detection
  maxSpecialCharPercent: 1.0 // Allow any amount of special chars
};
```

#### Custom Rules
```javascript
const customRules = [
  {
    id: 'custom-chord-pattern',
    name: 'Custom Chord Validation',
    description: 'Validates custom chord notation',
    pattern: /\[custom_[A-Z]+\]/g,
    severity: 'warning',
    category: 'chord',
    message: 'Custom chord notation detected',
    enabled: true
  }
];
```

### Language Configuration

#### Automatic Language Detection
```javascript
{
  autoDetectLanguage: true,  // Use browser/app language
  fallbackLanguage: 'en'     // Fallback if detection fails
}
```

#### Manual Language Setting
```javascript
validator.setLanguage('es');  // Spanish
validator.setLanguage('en');  // English
```

#### Custom Language Rules
```javascript
validator.addLanguageRules('es', {
  chordNotations: {
    'DoM': 'C',
    'ReM': 'D'
  },
  directiveAliases: {
    'titulo_personalizado': 'title'
  },
  typoCorrections: {
    'titutlo': 'titulo'
  }
});
```

## Performance Considerations

### Rule Processing Order

1. **Security Rules** (highest priority - blocking)
2. **Syntax Rules** (structural validation)
3. **Language Rules** (preprocessing)
4. **Format Rules** (quality checks)
5. **Custom Rules** (user-defined)

### Optimization Settings

#### For Large Documents
```javascript
{
  strictMode: false,
  checkTypos: false,
  checkEmptyElements: false,
  maxSpecialCharPercent: 0.2
}
```

#### For Real-time Editing
```javascript
{
  debounceMs: 300,           // Wait 300ms after typing stops
  enableRealTime: true,      // Enable live validation
  backgroundProcessing: true // Don't block UI
}
```

### Performance Benchmarks

- **1000 lines**: < 100ms validation time
- **10,000 chords**: < 500ms processing
- **Complex nesting**: < 150ms for 100-level depth
- **Memory usage**: < 10MB growth per 1000 validations

## Error Reporting Format

### Error Object Structure
```javascript
{
  type: 'chord' | 'directive' | 'bracket' | 'syntax' | 'security' | 'format',
  severity: 'error' | 'warning' | 'info',
  message: 'Human-readable error description',
  position: {
    start: 42,           // Character position start
    end: 45,             // Character position end
    line: 5,             // Line number (1-based)
    column: 10           // Column number (1-based)
  },
  suggestion?: 'Correction suggestion'
}
```

### Localized Messages

**English:**
```javascript
{
  message: "Invalid chord notation: \"X\"",
  suggestion: "Use uppercase: C"
}
```

**Spanish:**
```javascript
{
  message: "Notación de acorde inválida: \"X\"",
  suggestion: "Usar mayúscula: C"
}
```

## Integration Examples

### Basic Usage
```javascript
import { I18nChordProValidator } from './chordProValidationI18n';

const validator = new I18nChordProValidator({
  strictMode: false,
  checkSecurity: true
}, 'en');

const result = validator.validateContent(chordProContent);
console.log(`Found ${result.errors.length} errors`);
```

### React Hook Usage
```javascript
import { useI18nChordProValidation } from './hooks/useI18nChordProValidation';

function ChordProEditor({ content, onChange }) {
  const validation = useI18nChordProValidation(content, {
    debounceMs: 300,
    enableRealTime: true,
    onValidationChange: (result) => {
      console.log('Validation updated:', result);
    }
  });

  return (
    <div>
      <textarea value={content} onChange={onChange} />
      <ValidationStatusBar validation={validation} />
    </div>
  );
}
```

### Custom Rule Implementation
```javascript
// Add custom rule for song structure validation
validator.updateConfig({
  customRules: [{
    id: 'verse-chorus-structure',
    name: 'Verse-Chorus Structure',
    description: 'Ensures songs have both verses and choruses',
    pattern: (content) => {
      const hasVerse = /\{(?:start_of_)?verse\}/.test(content);
      const hasChorus = /\{(?:start_of_)?chorus\}/.test(content);
      return hasVerse && hasChorus;
    },
    severity: 'info',
    category: 'format',
    message: 'Consider adding both verse and chorus sections',
    enabled: true
  }]
});
```

## Migration and Compatibility

### Upgrading from Basic Validator
```javascript
// Old
import { ChordProValidator } from './chordProValidation';
const validator = new ChordProValidator();

// New
import { I18nChordProValidator } from './chordProValidationI18n';
const validator = new I18nChordProValidator({}, 'en');

// Same API, enhanced functionality
```

### Backward Compatibility
- All existing validation rules maintained
- Configuration options preserved
- Error format unchanged
- Performance improvements included

---

**Related Documentation:**
- [User Guide - ChordPro Validation](user-guide.md#chordpro-validation)
- [Validation Troubleshooting Guide](validation-troubleshooting.md)
- [ChordPro Format Reference](chordpro-format.md)
- [API Reference](api-reference.md)

**Language:** **English** | [Español](validation-rules-reference-es.md)