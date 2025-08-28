---
layout: default
lang: en
title: Internationalization (i18n) Guide
---

# Internationalization (i18n) Guide

ChordMe now supports multiple languages with English as the default and Spanish as the first additional language.

## Overview

The internationalization system is built using [react-i18next](https://react.i18next.com/), providing:

- **Automatic language detection** based on browser preferences
- **Manual language switching** with persistent storage
- **Fallback mechanism** to English for missing translations
- **Scalable architecture** for adding more languages

## Supported Languages

- **English (en)** - Default language
- **Spanish (es)** - First additional language

## Features

### Language Switcher
A language switcher component is available in the header that allows users to:
- Switch between supported languages
- See the current active language
- Persist language selection in localStorage

### Automatic Detection
The system automatically detects the user's preferred language from:
1. localStorage (previous selection)
2. Browser language settings
3. Fallback to English if unsupported

### Fallback System
If a translation is missing in the selected language, the system automatically falls back to English.

## Usage for Developers

### Adding New Translation Keys

1. **Add to English translations** (`frontend/src/locales/en/common.json`):
```json
{
  "newSection": {
    "title": "New Feature",
    "description": "This is a new feature"
  }
}
```

2. **Add to Spanish translations** (`frontend/src/locales/es/common.json`):
```json
{
  "newSection": {
    "title": "Nueva funcionalidad",
    "description": "Esta es una nueva funcionalidad"
  }
}
```

### Using Translations in Components

```tsx
import { useTranslation } from 'react-i18next';

const MyComponent: React.FC = () => {
  const { t } = useTranslation('common');
  
  return (
    <div>
      <h1>{t('newSection.title')}</h1>
      <p>{t('newSection.description')}</p>
    </div>
  );
};
```

### Interpolation

Support for dynamic values:

```tsx
// Translation file
{
  "welcome": "Welcome, {{username}}!"
}

// Component usage
<p>{t('welcome', { username: user.name })}</p>
```

## Adding New Languages

To add a new language (e.g., French):

1. **Update supported languages** in `frontend/src/i18n/config.ts`:
```typescript
export const supportedLanguages = ['en', 'es', 'fr'] as const;
```

2. **Create translation file** `frontend/src/locales/fr/common.json`:
```json
{
  "app": {
    "title": "ChordMe",
    "subtitle": "Paroles et accords de manière simple."
  }
  // ... copy structure from en/common.json and translate
}
```

3. **Import in config** `frontend/src/i18n/config.ts`:
```typescript
import frCommon from '../locales/fr/common.json';

const resources = {
  en: { common: enCommon },
  es: { common: esCommon },
  fr: { common: frCommon },
};
```

4. **Update LanguageSwitcher** to include the new language label in translation files.

## Translation Guidelines

### English (Default)
- Use clear, concise language
- Follow standard UI conventions
- Use sentence case for buttons and labels
- Use title case for headings

### Spanish
- Use formal "usted" form for user-facing text
- Follow Spanish UI conventions
- Maintain consistent terminology
- Consider regional variations (prefer neutral Spanish)

### General Rules
- Keep text length considerations in mind (some languages are longer)
- Preserve placeholders and interpolation syntax
- Maintain consistent tone and style
- Test UI layout with translated text

## File Structure

```
frontend/src/
├── i18n/
│   ├── config.ts          # i18n configuration
│   └── config.test.ts     # Tests for i18n setup
├── locales/
│   ├── en/
│   │   └── common.json    # English translations
│   └── es/
│       └── common.json    # Spanish translations
└── components/
    └── LanguageSwitcher/  # Language switcher component
```

## Testing

Run i18n tests:
```bash
npm run test:run src/i18n/config.test.ts
npm run test:run src/components/LanguageSwitcher/LanguageSwitcher.test.tsx
```

## Browser Support

The i18n system works with all modern browsers that support:
- localStorage API
- Intl API (for potential future enhancements)
- ES6 modules

## Performance

- Translation files are bundled with the application
- No runtime loading of translation files
- Minimal overhead with react-i18next
- Language switching is instantaneous

## Accessibility

The LanguageSwitcher component includes:
- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader announcements
- High contrast mode support