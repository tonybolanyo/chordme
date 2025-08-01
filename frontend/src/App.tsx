import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ChordProDemo from './pages/ChordProDemo';
import './App.css';

// Main app content that uses auth context
function AppContent() {
  const [currentPage, setCurrentPage] = useState('home');
  const { isAuthenticated, isLoading } = useAuth();

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

  // Redirect to login if trying to access protected pages while not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated && currentPage === 'home') {
      // For now, home page requires authentication. You can adjust this logic.
      window.location.hash = 'login';
    }
  }, [isAuthenticated, isLoading, currentPage]);

  if (isLoading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Loading...</h2>
        </div>
      </Layout>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'login':
        return <Login />;
      case 'register':
        return <Register />;
      case 'demo':
        return <ChordProDemo />;
      case 'home':
      default:
        // Protect home page - redirect to login if not authenticated
        if (!isAuthenticated) {
          return <Login />;
        }
        return <Home />;
    }
  };

  return <Layout>{renderPage()}</Layout>;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
