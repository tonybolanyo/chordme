import React from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../Header';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { t } = useTranslation('common');

  return (
    <div className="layout">
      {/* Skip navigation link for screen readers */}
      <a href="#main-content" className="skip-nav">
        {t('navigation.skipToContent')}
      </a>

      <Header />

      <main
        id="main-content"
        className="main-content"
        role="main"
        aria-label={t('accessibility.mainContent')}
      >
        {children}
      </main>

      <footer
        className="footer"
        role="contentinfo"
        aria-label={t('accessibility.siteFooter')}
      >
        <p>{t('footer.copyright')}</p>
      </footer>
    </div>
  );
};

export default Layout;
