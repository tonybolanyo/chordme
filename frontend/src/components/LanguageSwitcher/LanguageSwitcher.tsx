import React from 'react';
import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '../../i18n/config';
import type { SupportedLanguage } from '../../i18n/config';
import './LanguageSwitcher.css';

interface LanguageSwitcherProps {
  className?: string;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className = '',
}) => {
  const { t, i18n } = useTranslation('common');

  const currentLanguage = i18n.language as SupportedLanguage;

  const handleLanguageChange = (language: SupportedLanguage) => {
    i18n.changeLanguage(language);
  };

  const getLanguageLabel = (lang: SupportedLanguage): string => {
    return t(`language.${lang === 'en' ? 'english' : 'spanish'}`);
  };

  return (
    <div
      className={`language-switcher ${className}`}
      role="group"
      aria-label={t('language.label')}
    >
      <span className="language-label" id="language-label">
        {t('language.label')}
      </span>

      <div
        className="language-options"
        role="radiogroup"
        aria-labelledby="language-label"
      >
        {supportedLanguages.map((lang) => (
          <button
            key={lang}
            type="button"
            className={`language-option ${currentLanguage === lang ? 'active' : ''}`}
            onClick={() => handleLanguageChange(lang)}
            aria-pressed={currentLanguage === lang}
            aria-label={t('language.switchTo', {
              language: getLanguageLabel(lang),
            })}
            title={t('language.switchTo', { language: getLanguageLabel(lang) })}
          >
            {getLanguageLabel(lang)}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSwitcher;
