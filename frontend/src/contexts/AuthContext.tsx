import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { isTokenExpired } from '../utils/jwt';
import { firebaseAuthService, type FirebaseAuthUser } from '../services/firebaseAuth';

export type AuthProvider = 'jwt' | 'firebase';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseAuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authProvider: AuthProvider | null;
  login: (token: string, user: User) => void;
  loginWithFirebase: (firebaseUser: FirebaseAuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authProvider, setAuthProvider] = useState<AuthProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored JWT token on app initialization
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('authUser');
    const storedProvider = localStorage.getItem('authProvider') as AuthProvider;

    if (storedToken && storedUser && storedProvider === 'jwt') {
      try {
        // Check if the token is expired
        if (isTokenExpired(storedToken)) {
          console.log('Stored token has expired, clearing authentication data');
          clearAuthData();
        } else {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);
          setAuthProvider('jwt');
        }
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        clearAuthData();
      }
    }

    // Set up Firebase auth state listener
    let unsubscribeFirebase: (() => void) | null = null;
    
    if (firebaseAuthService.isAvailable()) {
      unsubscribeFirebase = firebaseAuthService.onAuthStateChanged((fbUser) => {
        if (fbUser && (!storedProvider || storedProvider === 'firebase')) {
          // Only set Firebase user if no JWT auth is active or Firebase is preferred
          setFirebaseUser(fbUser);
          setAuthProvider('firebase');
          localStorage.setItem('authProvider', 'firebase');
        } else if (!fbUser && storedProvider === 'firebase') {
          // Firebase user signed out
          setFirebaseUser(null);
          if (!token) {
            setAuthProvider(null);
            localStorage.removeItem('authProvider');
          }
        }
      });
    }

    setIsLoading(false);

    // Cleanup function
    return () => {
      if (unsubscribeFirebase) {
        unsubscribeFirebase();
      }
    };
  }, []);

  const clearAuthData = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    localStorage.removeItem('authProvider');
  };

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    setAuthProvider('jwt');
    setFirebaseUser(null); // Clear Firebase user when using JWT
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('authUser', JSON.stringify(newUser));
    localStorage.setItem('authProvider', 'jwt');
  };

  const loginWithFirebase = (fbUser: FirebaseAuthUser) => {
    setFirebaseUser(fbUser);
    setAuthProvider('firebase');
    setToken(null); // Clear JWT when using Firebase
    setUser(null);
    localStorage.setItem('authProvider', 'firebase');
    // Clear JWT data
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  };

  const logout = async () => {
    // Sign out from Firebase if using Firebase auth
    if (authProvider === 'firebase' && firebaseAuthService.isAvailable()) {
      try {
        await firebaseAuthService.signOut();
      } catch (error) {
        console.error('Error signing out from Firebase:', error);
      }
    }

    // Clear all auth state
    setToken(null);
    setUser(null);
    setFirebaseUser(null);
    setAuthProvider(null);
    clearAuthData();
    
    // Redirect to home page
    window.location.hash = '';
  };

  const isAuthenticated = (!!token && !!user && authProvider === 'jwt') || 
                          (!!firebaseUser && authProvider === 'firebase');

  const value: AuthContextType = {
    user,
    firebaseUser,
    token,
    isAuthenticated,
    isLoading,
    authProvider,
    login,
    loginWithFirebase,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Create a separate hook file would be better, but for now we'll disable the warning
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
