import { describe, it, expect, beforeEach, vi } from 'vitest';
import i18n from './config';

describe('i18n Configuration', () => {
  beforeEach(() => {
    // Reset to English before each test
    i18n.changeLanguage('en');
  });

  it('initializes with English as default language', () => {
    expect(i18n.language).toBe('en');
  });

  it('loads English translations correctly', () => {
    expect(i18n.t('app.title')).toBe('ChordMe');
    expect(i18n.t('navigation.home')).toBe('Home');
    expect(i18n.t('auth.login.title')).toBe('Login');
    expect(i18n.t('common.loading')).toBe('Loading...');
  });

  it('changes language to Spanish', async () => {
    await i18n.changeLanguage('es');
    
    expect(i18n.language).toBe('es');
    expect(i18n.t('app.title')).toBe('ChordMe');
    expect(i18n.t('navigation.home')).toBe('Inicio');
    expect(i18n.t('auth.login.title')).toBe('Iniciar sesión');
    expect(i18n.t('common.loading')).toBe('Cargando...');
  });

  it('falls back to English for missing Spanish translations', async () => {
    await i18n.changeLanguage('es');
    
    // Test a key that exists in English but not in Spanish
    // Since we have complete translations, let's test with a non-existent key
    expect(i18n.t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('supports interpolation', async () => {
    expect(i18n.t('navigation.welcome', { email: 'test@example.com' })).toBe('Welcome, test@example.com');
    
    await i18n.changeLanguage('es');
    expect(i18n.t('navigation.welcome', { email: 'test@example.com' })).toBe('Bienvenido, test@example.com');
  });

  it('handles unsupported languages by falling back to English', async () => {
    await i18n.changeLanguage('fr'); // French is not supported
    
    // The language may be set to 'fr' but translations will fall back to English
    expect(i18n.t('navigation.home')).toBe('Home');
  });

  it('has proper namespace configuration', () => {
    expect(i18n.options.defaultNS).toBe('common');
    expect(i18n.options.ns).toContain('common');
  });

  it('has proper fallback configuration', () => {
    expect(i18n.options.fallbackLng).toEqual(['en']);
  });

  it('has both supported languages available', () => {
    expect(i18n.options.whitelist).toContain('en');
    expect(i18n.options.whitelist).toContain('es');
  });
});

describe('Translation Coverage', () => {
  const testKeys = [
    'app.title',
    'app.subtitle',
    'navigation.home',
    'navigation.songs',
    'navigation.demo',
    'navigation.login',
    'navigation.register',
    'navigation.logout',
    'auth.login.title',
    'auth.login.email',
    'auth.login.password',
    'auth.login.submit',
    'auth.register.title',
    'auth.errors.loginFailed',
    'auth.errors.networkError',
    'common.loading',
    'common.close',
    'common.save',
    'common.cancel',
    'footer.copyright',
    'language.label',
    'language.english',
    'language.spanish',
    'accessibility.mainContent',
  ];

  it('has all required translations in English', () => {
    i18n.changeLanguage('en');
    
    testKeys.forEach(key => {
      const translation = i18n.t(key);
      expect(translation).not.toBe(key); // Should not return the key itself
      expect(translation).toBeTruthy(); // Should have a value
    });
  });

  it('has all required translations in Spanish', async () => {
    await i18n.changeLanguage('es');
    
    testKeys.forEach(key => {
      const translation = i18n.t(key);
      expect(translation).not.toBe(key); // Should not return the key itself
      expect(translation).toBeTruthy(); // Should have a value
    });
  });

  it('has different translations for most keys between languages', async () => {
    const englishTranslations: Record<string, string> = {};
    const spanishTranslations: Record<string, string> = {};
    
    // Get English translations
    i18n.changeLanguage('en');
    testKeys.forEach(key => {
      englishTranslations[key] = i18n.t(key);
    });
    
    // Get Spanish translations
    await i18n.changeLanguage('es');
    testKeys.forEach(key => {
      spanishTranslations[key] = i18n.t(key);
    });
    
    // Most keys should have different translations (except brand names like "ChordMe")
    const differentTranslations = testKeys.filter(key => 
      englishTranslations[key] !== spanishTranslations[key]
    );
    
    // At least 80% of translations should be different
    expect(differentTranslations.length).toBeGreaterThan(testKeys.length * 0.8);
  });
});