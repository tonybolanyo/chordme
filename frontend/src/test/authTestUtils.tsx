// Test utilities for Firebase Auth components
import React from 'react';
import { vi } from 'vitest';
import { AuthProvider } from '../contexts/AuthContext';

// Mock Firebase Auth service for testing
export const mockFirebaseAuthService = {
  isAvailable: vi.fn(() => false), // Default to not available
  signUpWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn(() => null),
  onAuthStateChanged: vi.fn(() => () => {}),
};

// Test wrapper that provides AuthProvider
export const TestAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <AuthProvider>{children}</AuthProvider>;
};

// Mock the Firebase Auth service
vi.mock('../services/firebaseAuth', () => ({
  firebaseAuthService: mockFirebaseAuthService,
}));