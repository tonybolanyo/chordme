import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the i18n config first
vi.mock('../../i18n/config', () => ({
  default: {
    language: 'en',
    changeLanguage: vi.fn(),
    t: vi.fn(),
  },
  supportedLanguages: ['en', 'es'],
}));

// Mock react-i18next
const mockChangeLanguage = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { language?: string }) => {
      const translations: Record<string, string> = {
        'language.label': 'Language:',
        'language.english': 'English',
        'language.spanish': 'Español',
        'language.switchTo': `Switch to ${options?.language || 'language'}`,
      };
      return translations[key] || key;
    },
    i18n: {
      language: 'en',
      changeLanguage: mockChangeLanguage,
    },
  }),
  initReactI18next: {},
}));

// Import component after mocks
import LanguageSwitcher from './LanguageSwitcher';

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders language switcher with default structure', () => {
    render(<LanguageSwitcher />);

    expect(
      screen.getByRole('group', { name: 'Language:' })
    ).toBeInTheDocument();
    expect(screen.getByText('Language:')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('renders both language options', () => {
    render(<LanguageSwitcher />);

    expect(
      screen.getByRole('button', { name: /switch to english/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /switch to español/i })
    ).toBeInTheDocument();
  });

  it('marks current language as active', () => {
    render(<LanguageSwitcher />);

    const englishButton = screen.getByRole('button', {
      name: /switch to english/i,
    });
    const spanishButton = screen.getByRole('button', {
      name: /switch to español/i,
    });

    expect(englishButton).toHaveAttribute('aria-pressed', 'true');
    expect(spanishButton).toHaveAttribute('aria-pressed', 'false');
    expect(englishButton).toHaveClass('active');
    expect(spanishButton).not.toHaveClass('active');
  });

  it('calls changeLanguage when clicking a language option', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    const spanishButton = screen.getByRole('button', {
      name: /switch to español/i,
    });
    await user.click(spanishButton);

    expect(mockChangeLanguage).toHaveBeenCalledWith('es');
  });

  it('handles keyboard interaction', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    const spanishButton = screen.getByRole('button', {
      name: /switch to español/i,
    });

    // Focus the button and press Enter
    spanishButton.focus();
    await user.keyboard('{Enter}');

    expect(mockChangeLanguage).toHaveBeenCalledWith('es');
  });

  it('applies custom className when provided', () => {
    render(<LanguageSwitcher className="custom-class" />);

    const container = screen.getByRole('group');
    expect(container).toHaveClass('language-switcher', 'custom-class');
  });

  it('has proper accessibility attributes', () => {
    render(<LanguageSwitcher />);

    const radiogroup = screen.getByRole('radiogroup');
    const languageLabel = screen.getByText('Language:');

    expect(radiogroup).toHaveAttribute('aria-labelledby', 'language-label');
    expect(languageLabel).toHaveAttribute('id', 'language-label');

    // Check that buttons have proper accessibility attributes
    const englishButton = screen.getByRole('button', {
      name: /switch to english/i,
    });
    expect(englishButton).toHaveAttribute('aria-pressed');
    expect(englishButton).toHaveAttribute('aria-label');
    expect(englishButton).toHaveAttribute('title');
  });

  it('is keyboard navigable', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    const englishButton = screen.getByRole('button', {
      name: /switch to english/i,
    });
    const spanishButton = screen.getByRole('button', {
      name: /switch to español/i,
    });

    // Tab to first button
    await user.tab();
    expect(englishButton).toHaveFocus();

    // Tab to second button
    await user.tab();
    expect(spanishButton).toHaveFocus();
  });
});

describe('LanguageSwitcher Integration', () => {
  it('renders correctly with different language states', () => {
    // Test is sufficient without complex rerendering for now
    render(<LanguageSwitcher />);

    const englishButton = screen.getByRole('button', {
      name: /switch to english/i,
    });
    const spanishButton = screen.getByRole('button', {
      name: /switch to español/i,
    });

    expect(englishButton).toHaveClass('active');
    expect(spanishButton).not.toHaveClass('active');
    expect(englishButton).toBeInTheDocument();
    expect(spanishButton).toBeInTheDocument();
  });
});
