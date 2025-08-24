// Firestore service for song and user data operations
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  DocumentReference,
  QuerySnapshot,
  DocumentSnapshot,
} from 'firebase/firestore';
import { firebaseService } from './firebase';
import type { Song, User } from '../types';

export interface FirestoreSong {
  id?: string;
  title: string;
  author_id: string;
  content: string;
  created_at: Timestamp | string;
  updated_at: Timestamp | string;
}

export interface FirestoreUser {
  id?: string;
  email: string;
  created_at: Timestamp | string;
  updated_at: Timestamp | string;
}

class FirestoreService {
  private get db() {
    const firestore = firebaseService.getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }
    return firestore;
  }

  /**
   * Convert Firestore document to Song object
   */
  private documentToSong(doc: DocumentSnapshot): Song | null {
    if (!doc.exists()) {
      return null;
    }

    const data = doc.data() as FirestoreSong;
    return {
      id: doc.id,
      title: data.title,
      author_id: data.author_id,
      content: data.content,
      created_at: data.created_at instanceof Timestamp 
        ? data.created_at.toDate().toISOString()
        : data.created_at as string,
      updated_at: data.updated_at instanceof Timestamp 
        ? data.updated_at.toDate().toISOString()
        : data.updated_at as string,
    };
  }

  /**
   * Convert Firestore document to User object
   */
  private documentToUser(doc: DocumentSnapshot): User | null {
    if (!doc.exists()) {
      return null;
    }

    const data = doc.data() as FirestoreUser;
    return {
      id: doc.id,
      email: data.email,
      created_at: data.created_at instanceof Timestamp 
        ? data.created_at.toDate().toISOString()
        : data.created_at as string,
      updated_at: data.updated_at instanceof Timestamp 
        ? data.updated_at.toDate().toISOString()
        : data.updated_at as string,
    };
  }

  // Song operations
  
  /**
   * Get all songs for a user
   */
  async getSongs(userId: string): Promise<Song[]> {
    try {
      const songsRef = collection(this.db, 'songs');
      const q = query(
        songsRef,
        where('author_id', '==', userId),
        orderBy('updated_at', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const songs: Song[] = [];
      
      querySnapshot.forEach((doc) => {
        const song = this.documentToSong(doc);
        if (song) {
          songs.push(song);
        }
      });
      
      return songs;
    } catch (error) {
      console.error('Error getting songs from Firestore:', error);
      throw new Error('Failed to fetch songs from Firestore');
    }
  }

  /**
   * Get a specific song by ID
   */
  async getSong(songId: string): Promise<Song | null> {
    try {
      const songRef = doc(this.db, 'songs', songId);
      const songSnap = await getDoc(songRef);
      
      return this.documentToSong(songSnap);
    } catch (error) {
      console.error('Error getting song from Firestore:', error);
      throw new Error('Failed to fetch song from Firestore');
    }
  }

  /**
   * Create a new song
   */
  async createSong(songData: Partial<Song>, userId: string): Promise<Song> {
    try {
      const now = Timestamp.now();
      const firestoreSong: Omit<FirestoreSong, 'id'> = {
        title: songData.title || '',
        author_id: userId,
        content: songData.content || '',
        created_at: now,
        updated_at: now,
      };

      const docRef = await addDoc(collection(this.db, 'songs'), firestoreSong);
      
      // Get the created document to return as Song
      const createdDoc = await getDoc(docRef);
      const createdSong = this.documentToSong(createdDoc);
      
      if (!createdSong) {
        throw new Error('Failed to retrieve created song');
      }
      
      return createdSong;
    } catch (error) {
      console.error('Error creating song in Firestore:', error);
      throw new Error('Failed to create song in Firestore');
    }
  }

  /**
   * Update an existing song
   */
  async updateSong(songId: string, songData: Partial<Song>): Promise<Song> {
    try {
      const songRef = doc(this.db, 'songs', songId);
      
      const updateData: Partial<FirestoreSong> = {
        updated_at: Timestamp.now(),
      };
      
      if (songData.title !== undefined) {
        updateData.title = songData.title;
      }
      
      if (songData.content !== undefined) {
        updateData.content = songData.content;
      }
      
      await updateDoc(songRef, updateData);
      
      // Get the updated document to return as Song
      const updatedDoc = await getDoc(songRef);
      const updatedSong = this.documentToSong(updatedDoc);
      
      if (!updatedSong) {
        throw new Error('Failed to retrieve updated song');
      }
      
      return updatedSong;
    } catch (error) {
      console.error('Error updating song in Firestore:', error);
      throw new Error('Failed to update song in Firestore');
    }
  }

  /**
   * Delete a song
   */
  async deleteSong(songId: string): Promise<void> {
    try {
      const songRef = doc(this.db, 'songs', songId);
      await deleteDoc(songRef);
    } catch (error) {
      console.error('Error deleting song from Firestore:', error);
      throw new Error('Failed to delete song from Firestore');
    }
  }

  // User operations (basic CRUD for compatibility)
  
  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<User | null> {
    try {
      const userRef = doc(this.db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      return this.documentToUser(userSnap);
    } catch (error) {
      console.error('Error getting user from Firestore:', error);
      throw new Error('Failed to fetch user from Firestore');
    }
  }

  /**
   * Create a new user
   */
  async createUser(userData: { email: string; id?: string }): Promise<User> {
    try {
      const now = Timestamp.now();
      const firestoreUser: Omit<FirestoreUser, 'id'> = {
        email: userData.email,
        created_at: now,
        updated_at: now,
      };

      let docRef: DocumentReference;
      if (userData.id) {
        // Use provided ID (useful for Firebase Auth integration)
        docRef = doc(this.db, 'users', userData.id);
        await updateDoc(docRef, firestoreUser);
      } else {
        // Auto-generate ID
        docRef = await addDoc(collection(this.db, 'users'), firestoreUser);
      }
      
      // Get the created document to return as User
      const createdDoc = await getDoc(docRef);
      const createdUser = this.documentToUser(createdDoc);
      
      if (!createdUser) {
        throw new Error('Failed to retrieve created user');
      }
      
      return createdUser;
    } catch (error) {
      console.error('Error creating user in Firestore:', error);
      throw new Error('Failed to create user in Firestore');
    }
  }

  /**
   * Update user information
   */
  async updateUser(userId: string, userData: Partial<User>): Promise<User> {
    try {
      const userRef = doc(this.db, 'users', userId);
      
      const updateData: Partial<FirestoreUser> = {
        updated_at: Timestamp.now(),
      };
      
      if (userData.email !== undefined) {
        updateData.email = userData.email;
      }
      
      await updateDoc(userRef, updateData);
      
      // Get the updated document to return as User
      const updatedDoc = await getDoc(userRef);
      const updatedUser = this.documentToUser(updatedDoc);
      
      if (!updatedUser) {
        throw new Error('Failed to retrieve updated user');
      }
      
      return updatedUser;
    } catch (error) {
      console.error('Error updating user in Firestore:', error);
      throw new Error('Failed to update user in Firestore');
    }
  }

  /**
   * Check if Firestore is available and properly configured
   */
  isAvailable(): boolean {
    return firebaseService.isInitialized();
  }
}

// Create and export singleton instance
export const firestoreService = new FirestoreService();