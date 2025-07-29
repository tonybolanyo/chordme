import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('home');

  useEffect(() => {
    // Simple hash-based routing
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1); // Remove the #
      const page = hash || 'home';
      setCurrentPage(page);
    };

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    // Set initial page
    handleHashChange();

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'login':
        return <Login />;
      case 'register':
        return <Register />;
      case 'home':
      default:
        return <Home />;
    }
  };

  return (
    <Layout>
      {renderPage()}
    </Layout>
  );
}

export default App;
