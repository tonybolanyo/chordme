import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from '../locales/en/common.json';
import esCommon from '../locales/es/common.json';

// Define supported languages
export const supportedLanguages = ['en', 'es'] as const;
export type SupportedLanguage = typeof supportedLanguages[number];

// Translation resources
const resources = {
  en: {
    common: enCommon,
  },
  es: {
    common: esCommon,
  },
};

// Language detector options
const detectionOptions = {
  // Detection order
  order: ['localStorage', 'navigator', 'htmlTag'],
  
  // Cache user language selection
  caches: ['localStorage'],
  
  // Only detect languages we support
  checkWhitelist: true,
};

i18n
  // Use language detector
  .use(LanguageDetector)
  // Pass i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    resources,
    fallbackLng: 'en', // Default fallback language
    whitelist: supportedLanguages, // Only allow supported languages
    detection: detectionOptions,
    
    // Namespace configuration
    defaultNS: 'common',
    ns: ['common'],
    
    // React-specific options
    react: {
      useSuspense: false, // Avoid suspense to prevent loading issues
    },
    
    // Debug in development
    debug: process.env.NODE_ENV === 'development',
    
    // Interpolation options
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    // Load path for additional resources (if needed in future)
    // backend: {
    //   loadPath: '/locales/{{lng}}/{{ns}}.json',
    // },
  });

export default i18n;