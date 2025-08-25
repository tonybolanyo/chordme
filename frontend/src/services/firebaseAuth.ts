// Firebase Authentication service
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  type User as FirebaseUser,
  type UserCredential,
} from 'firebase/auth';
import { firebaseService } from './firebase';

export interface FirebaseAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface FirebaseAuthResult {
  user: FirebaseAuthUser;
  isNewUser?: boolean;
}

class FirebaseAuthService {
  private googleProvider: GoogleAuthProvider;

  constructor() {
    this.googleProvider = new GoogleAuthProvider();
    // Request email and profile scopes
    this.googleProvider.addScope('email');
    this.googleProvider.addScope('profile');
  }

  /**
   * Check if Firebase Auth is available
   */
  public isAvailable(): boolean {
    return (
      firebaseService.isInitialized() && firebaseService.getAuth() !== null
    );
  }

  /**
   * Sign up with email and password
   */
  public async signUpWithEmailAndPassword(
    email: string,
    password: string
  ): Promise<FirebaseAuthResult> {
    if (!this.isAvailable()) {
      throw new Error('Firebase Auth is not available');
    }

    const auth = firebaseService.getAuth();
    if (!auth) {
      throw new Error('Firebase Auth instance not found');
    }

    try {
      const userCredential: UserCredential =
        await createUserWithEmailAndPassword(auth, email, password);
      return {
        user: this.mapFirebaseUser(userCredential.user),
        isNewUser: true,
      };
    } catch (error: unknown) {
      throw this.mapAuthError(error);
    }
  }

  /**
   * Sign in with email and password
   */
  public async signInWithEmailAndPassword(
    email: string,
    password: string
  ): Promise<FirebaseAuthResult> {
    if (!this.isAvailable()) {
      throw new Error('Firebase Auth is not available');
    }

    const auth = firebaseService.getAuth();
    if (!auth) {
      throw new Error('Firebase Auth instance not found');
    }

    try {
      const userCredential: UserCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      return {
        user: this.mapFirebaseUser(userCredential.user),
        isNewUser: false,
      };
    } catch (error: unknown) {
      throw this.mapAuthError(error);
    }
  }

  /**
   * Sign in with Google
   */
  public async signInWithGoogle(): Promise<FirebaseAuthResult> {
    if (!this.isAvailable()) {
      throw new Error('Firebase Auth is not available');
    }

    const auth = firebaseService.getAuth();
    if (!auth) {
      throw new Error('Firebase Auth instance not found');
    }

    try {
      const userCredential: UserCredential = await signInWithPopup(
        auth,
        this.googleProvider
      );

      return {
        user: this.mapFirebaseUser(userCredential.user),
        isNewUser:
          userCredential.user.metadata.creationTime ===
          userCredential.user.metadata.lastSignInTime,
      };
    } catch (error: unknown) {
      throw this.mapAuthError(error);
    }
  }

  /**
   * Sign out current user
   */
  public async signOut(): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Firebase Auth is not available');
    }

    const auth = firebaseService.getAuth();
    if (!auth) {
      throw new Error('Firebase Auth instance not found');
    }

    try {
      await signOut(auth);
    } catch (error: unknown) {
      throw this.mapAuthError(error);
    }
  }

  /**
   * Get current user
   */
  public getCurrentUser(): FirebaseAuthUser | null {
    if (!this.isAvailable()) {
      return null;
    }

    const auth = firebaseService.getAuth();
    if (!auth || !auth.currentUser) {
      return null;
    }

    return this.mapFirebaseUser(auth.currentUser);
  }

  /**
   * Listen to auth state changes
   */
  public onAuthStateChanged(
    callback: (user: FirebaseAuthUser | null) => void
  ): () => void {
    if (!this.isAvailable()) {
      // Return a no-op unsubscribe function
      return () => {};
    }

    const auth = firebaseService.getAuth();
    if (!auth) {
      return () => {};
    }

    return onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        callback(this.mapFirebaseUser(firebaseUser));
      } else {
        callback(null);
      }
    });
  }

  /**
   * Map Firebase user to our user interface
   */
  private mapFirebaseUser(firebaseUser: FirebaseUser): FirebaseAuthUser {
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
    };
  }

  /**
   * Map Firebase auth errors to user-friendly messages
   */
  private mapAuthError(error: unknown): Error {
    console.error('Firebase Auth Error:', error);

    // Type guard to check if error has a code property
    const firebaseError = error as { code?: string; message?: string };

    switch (firebaseError.code) {
      case 'auth/user-not-found':
        return new Error('No account found with this email address');
      case 'auth/wrong-password':
        return new Error('Incorrect password');
      case 'auth/invalid-email':
        return new Error('Invalid email address');
      case 'auth/user-disabled':
        return new Error('This account has been disabled');
      case 'auth/email-already-in-use':
        return new Error('An account with this email address already exists');
      case 'auth/weak-password':
        return new Error(
          'Password is too weak. Please choose a stronger password'
        );
      case 'auth/operation-not-allowed':
        return new Error('This sign-in method is not enabled');
      case 'auth/popup-closed-by-user':
        return new Error('Sign-in was cancelled');
      case 'auth/popup-blocked':
        return new Error(
          'Pop-up was blocked by your browser. Please allow pop-ups and try again'
        );
      case 'auth/cancelled-popup-request':
        return new Error('Sign-in was cancelled');
      case 'auth/network-request-failed':
        return new Error(
          'Network error. Please check your connection and try again'
        );
      case 'auth/too-many-requests':
        return new Error('Too many failed attempts. Please try again later');
      default:
        return new Error(
          firebaseError.message || 'An error occurred during authentication'
        );
    }
  }
}

// Export singleton instance
export const firebaseAuthService = new FirebaseAuthService();
