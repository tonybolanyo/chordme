import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/accessibility.css';
import './styles/responsive.css';
import './index.css';
import './i18n/config'; // Initialize i18n
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
