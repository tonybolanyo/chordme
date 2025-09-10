/**
 * Custom Chord Storage Service
 * 
 * Handles storage, retrieval, and management of custom chord diagrams.
 * Supports both local storage and server-side storage.
 */

import { ChordDiagram, InstrumentType } from '../types/chordDiagram';
import { validateChordDiagram } from './chordDiagramValidation';

export interface CustomChordStorageOptions {
  useLocalStorage?: boolean;
  useServerStorage?: boolean;
  serverEndpoint?: string;
}

export interface ChordStorageResult {
  success: boolean;
  message: string;
  data?: ChordDiagram;
  error?: string;
}

export interface ChordSearchResult {
  chords: ChordDiagram[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export class CustomChordStorage {
  private options: CustomChordStorageOptions;
  private localStorageKey = 'chordme_custom_chords';

  constructor(options: CustomChordStorageOptions = {}) {
    this.options = {
      useLocalStorage: true,
      useServerStorage: false,
      ...options
    };
  }

  /**
   * Save a custom chord diagram
   */
  async saveChord(chord: ChordDiagram): Promise<ChordStorageResult> {
    try {
      // Validate chord before saving
      const validation = validateChordDiagram(chord);
      if (!validation.isValid) {
        return {
          success: false,
          message: 'Cannot save invalid chord diagram',
          error: validation.errors.map(e => e.message).join(', ')
        };
      }

      // Update metadata
      const chordToSave: ChordDiagram = {
        ...chord,
        metadata: {
          ...chord.metadata,
          updatedAt: new Date().toISOString(),
          source: 'user-created'
        }
      };

      // Save to local storage
      if (this.options.useLocalStorage) {
        await this.saveToLocalStorage(chordToSave);
      }

      // Save to server storage
      if (this.options.useServerStorage) {
        await this.saveToServer(chordToSave);
      }

      return {
        success: true,
        message: `Chord "${chord.name}" saved successfully`,
        data: chordToSave
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to save chord',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Load a chord by ID
   */
  async loadChord(chordId: string): Promise<ChordStorageResult> {
    try {
      // Try local storage first
      if (this.options.useLocalStorage) {
        const chord = await this.loadFromLocalStorage(chordId);
        if (chord) {
          return {
            success: true,
            message: 'Chord loaded successfully',
            data: chord
          };
        }
      }

      // Try server storage
      if (this.options.useServerStorage) {
        const chord = await this.loadFromServer(chordId);
        if (chord) {
          return {
            success: true,
            message: 'Chord loaded successfully',
            data: chord
          };
        }
      }

      return {
        success: false,
        message: 'Chord not found',
        error: `No chord found with ID: ${chordId}`
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to load chord',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Search for chords by criteria
   */
  async searchChords(
    criteria: {
      name?: string;
      instrument?: InstrumentType;
      tags?: string[];
      createdBy?: string;
    },
    page: number = 1,
    pageSize: number = 20
  ): Promise<ChordSearchResult> {
    try {
      let allChords: ChordDiagram[] = [];

      // Get chords from local storage
      if (this.options.useLocalStorage) {
        const localChords = await this.getAllFromLocalStorage();
        allChords = [...allChords, ...localChords];
      }

      // Get chords from server storage
      if (this.options.useServerStorage) {
        const serverChords = await this.getAllFromServer();
        allChords = [...allChords, ...serverChords];
      }

      // Filter by criteria
      let filteredChords = allChords.filter(chord => {
        if (criteria.name && !chord.name.toLowerCase().includes(criteria.name.toLowerCase())) {
          return false;
        }
        if (criteria.instrument && chord.instrument.type !== criteria.instrument) {
          return false;
        }
        if (criteria.tags && !criteria.tags.some(tag => chord.metadata.tags.includes(tag))) {
          return false;
        }
        if (criteria.createdBy && chord.metadata.createdBy !== criteria.createdBy) {
          return false;
        }
        return true;
      });

      // Sort by popularity score and creation date
      filteredChords = filteredChords.sort((a, b) => {
        if (a.metadata.popularityScore !== b.metadata.popularityScore) {
          return b.metadata.popularityScore - a.metadata.popularityScore;
        }
        return new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime();
      });

      // Paginate results
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedChords = filteredChords.slice(startIndex, endIndex);

      return {
        chords: paginatedChords,
        totalCount: filteredChords.length,
        page,
        pageSize
      };
    } catch (error) {
      console.error('Failed to search chords:', error);
      return {
        chords: [],
        totalCount: 0,
        page,
        pageSize
      };
    }
  }

  /**
   * Delete a chord by ID
   */
  async deleteChord(chordId: string): Promise<ChordStorageResult> {
    try {
      let deleted = false;

      // Delete from local storage
      if (this.options.useLocalStorage) {
        deleted = await this.deleteFromLocalStorage(chordId) || deleted;
      }

      // Delete from server storage
      if (this.options.useServerStorage) {
        deleted = await this.deleteFromServer(chordId) || deleted;
      }

      if (deleted) {
        return {
          success: true,
          message: 'Chord deleted successfully'
        };
      } else {
        return {
          success: false,
          message: 'Chord not found',
          error: `No chord found with ID: ${chordId}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to delete chord',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Export chord to various formats
   */
  exportChord(chord: ChordDiagram, format: 'json' | 'chordpro' | 'csv'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(chord, null, 2);
      
      case 'chordpro':
        return this.toChordProFormat(chord);
      
      case 'csv':
        return this.toCsvFormat(chord);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Import chord from various formats
   */
  importChord(data: string, format: 'json' | 'chordpro'): ChordDiagram {
    switch (format) {
      case 'json':
        return JSON.parse(data) as ChordDiagram;
      
      case 'chordpro':
        return this.fromChordProFormat(data);
      
      default:
        throw new Error(`Unsupported import format: ${format}`);
    }
  }

  // Private methods for local storage operations
  private async saveToLocalStorage(chord: ChordDiagram): Promise<void> {
    const existingChords = this.getLocalStorageChords();
    const chordIndex = existingChords.findIndex(c => c.id === chord.id);
    
    if (chordIndex >= 0) {
      existingChords[chordIndex] = chord;
    } else {
      existingChords.push(chord);
    }
    
    localStorage.setItem(this.localStorageKey, JSON.stringify(existingChords));
  }

  private async loadFromLocalStorage(chordId: string): Promise<ChordDiagram | null> {
    const chords = this.getLocalStorageChords();
    return chords.find(c => c.id === chordId) || null;
  }

  private async getAllFromLocalStorage(): Promise<ChordDiagram[]> {
    return this.getLocalStorageChords();
  }

  private async deleteFromLocalStorage(chordId: string): Promise<boolean> {
    const chords = this.getLocalStorageChords();
    const initialLength = chords.length;
    const filteredChords = chords.filter(c => c.id !== chordId);
    
    if (filteredChords.length < initialLength) {
      localStorage.setItem(this.localStorageKey, JSON.stringify(filteredChords));
      return true;
    }
    
    return false;
  }

  private getLocalStorageChords(): ChordDiagram[] {
    try {
      const data = localStorage.getItem(this.localStorageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to parse local storage chords:', error);
      return [];
    }
  }

  // Private methods for server storage operations
  private async saveToServer(chord: ChordDiagram): Promise<void> {
    if (!this.options.serverEndpoint) {
      throw new Error('Server endpoint not configured');
    }

    const response = await fetch(`${this.options.serverEndpoint}/chords`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chord)
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
  }

  private async loadFromServer(chordId: string): Promise<ChordDiagram | null> {
    if (!this.options.serverEndpoint) {
      throw new Error('Server endpoint not configured');
    }

    const response = await fetch(`${this.options.serverEndpoint}/chords/${chordId}`);
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    return await response.json();
  }

  private async getAllFromServer(): Promise<ChordDiagram[]> {
    if (!this.options.serverEndpoint) {
      throw new Error('Server endpoint not configured');
    }

    const response = await fetch(`${this.options.serverEndpoint}/chords`);
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    return await response.json();
  }

  private async deleteFromServer(chordId: string): Promise<boolean> {
    if (!this.options.serverEndpoint) {
      throw new Error('Server endpoint not configured');
    }

    const response = await fetch(`${this.options.serverEndpoint}/chords/${chordId}`, {
      method: 'DELETE'
    });

    if (response.status === 404) {
      return false;
    }

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    return true;
  }

  // Format conversion methods
  private toChordProFormat(chord: ChordDiagram): string {
    const positions = chord.positions
      .map(p => p.fret === -1 ? 'x' : p.fret.toString())
      .join('');
    
    return `{define: ${chord.name} frets ${positions}}`;
  }

  private fromChordProFormat(data: string): ChordDiagram {
    // Simple parser for ChordPro define directive
    const match = data.match(/\{define:\s*(\w+)\s+frets\s+([x\d]+)\}/);
    if (!match) {
      throw new Error('Invalid ChordPro format');
    }

    const [, name, fretsString] = match;
    const frets = fretsString.split('');
    
    // This is a simplified conversion - would need more sophisticated logic in practice
    throw new Error('ChordPro import not fully implemented');
  }

  private toCsvFormat(chord: ChordDiagram): string {
    const headers = ['String', 'Fret', 'Finger'];
    const rows = chord.positions.map(p => 
      [p.stringNumber, p.fret, p.finger].join(',')
    );
    
    return [headers.join(','), ...rows].join('\n');
  }
}

// Default instance for easy usage
export const customChordStorage = new CustomChordStorage();