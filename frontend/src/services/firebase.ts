// Firebase configuration and initialization
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

class FirebaseService {
  private app: FirebaseApp | null = null;
  private firestore: Firestore | null = null;
  private auth: Auth | null = null;
  private config: FirebaseConfig | null = null;

  /**
   * Initialize Firebase with configuration from environment variables
   */
  public initialize(): boolean {
    try {
      // Get Firebase configuration from environment variables
      const config: FirebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
        appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
      };

      // Validate that all required config values are present
      const requiredFields: (keyof FirebaseConfig)[] = [
        'apiKey',
        'authDomain', 
        'projectId',
        'storageBucket',
        'messagingSenderId',
        'appId'
      ];

      const missingFields = requiredFields.filter(field => !config[field]);
      if (missingFields.length > 0) {
        console.warn('Firebase initialization skipped - missing configuration:', missingFields);
        return false;
      }

      // Initialize Firebase app
      this.app = initializeApp(config);
      this.firestore = getFirestore(this.app);
      this.auth = getAuth(this.app);
      this.config = config;

      console.log('Firebase initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      return false;
    }
  }

  /**
   * Get the Firebase app instance
   */
  public getApp(): FirebaseApp | null {
    return this.app;
  }

  /**
   * Get the Firestore instance
   */
  public getFirestore(): Firestore | null {
    return this.firestore;
  }

  /**
   * Get the Auth instance
   */
  public getAuth(): Auth | null {
    return this.auth;
  }

  /**
   * Get the Firebase configuration
   */
  public getConfig(): FirebaseConfig | null {
    return this.config;
  }

  /**
   * Check if Firebase is initialized
   */
  public isInitialized(): boolean {
    return this.app !== null && this.firestore !== null;
  }

  /**
   * Check if Firebase should be used based on environment configuration
   */
  public isEnabled(): boolean {
    const dataSource = import.meta.env.VITE_DATA_SOURCE;
    return dataSource === 'firebase' && this.isInitialized();
  }
}

// Create and export singleton instance
export const firebaseService = new FirebaseService();

// Initialize Firebase on module load if configuration is available
firebaseService.initialize();