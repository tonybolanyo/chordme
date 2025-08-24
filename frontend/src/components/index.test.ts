import { describe, it, expect } from 'vitest';

describe('Component Index Exports', () => {
  it('exports all main components', async () => {
    // Use dynamic imports to test exports without rendering
    const components = await import('./index');
    
    // Check that all expected exports are present
    expect(components.Header).toBeDefined();
    expect(components.Layout).toBeDefined();
    expect(components.ChordProEditor).toBeDefined();
    expect(components.ChordProViewer).toBeDefined();
    expect(components.ChordPalette).toBeDefined();
    expect(components.ChordAutocomplete).toBeDefined();
    expect(components.TranspositionControls).toBeDefined();
    
    // Check that the components are functions (React components)
    expect(typeof components.Header).toBe('function');
    expect(typeof components.Layout).toBe('function');
    expect(typeof components.ChordProEditor).toBe('function');
    expect(typeof components.ChordProViewer).toBe('function');
    expect(typeof components.ChordPalette).toBe('function');
    expect(typeof components.ChordAutocomplete).toBe('function');
    expect(typeof components.TranspositionControls).toBe('function');
  });

  it('exports Google Auth components', async () => {
    const components = await import('./index');
    
    // Google Auth exports should be available
    expect(components.GoogleAuthButton).toBeDefined();
    expect(components.GoogleDriveFileList).toBeDefined();
    
    expect(typeof components.GoogleAuthButton).toBe('function');
    expect(typeof components.GoogleDriveFileList).toBe('function');
  });

  it('has correct export structure', async () => {
    const components = await import('./index');
    
    // Verify that the module exports are as expected
    const exportKeys = Object.keys(components);
    expect(exportKeys).toContain('Header');
    expect(exportKeys).toContain('Layout');
    expect(exportKeys).toContain('ChordProEditor');
    expect(exportKeys).toContain('ChordProViewer');
    expect(exportKeys).toContain('ChordPalette');
    expect(exportKeys).toContain('ChordAutocomplete');
    expect(exportKeys).toContain('TranspositionControls');
    expect(exportKeys).toContain('GoogleAuthButton');
    expect(exportKeys).toContain('GoogleDriveFileList');
  });
});