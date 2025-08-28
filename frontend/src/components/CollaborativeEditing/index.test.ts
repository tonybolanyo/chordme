import { describe, it, expect } from 'vitest';

describe('CollaborativeEditing Components Index', () => {
  it('exports all collaborative editing components', async () => {
    const module = await import('./index');

    expect(module.CollaborationHeader).toBeDefined();
    expect(typeof module.CollaborationHeader).toBe('function');

    expect(module.LiveCursors).toBeDefined();
    expect(typeof module.LiveCursors).toBe('function');

    expect(module.ConflictResolutionDialog).toBeDefined();
    expect(typeof module.ConflictResolutionDialog).toBe('function');
  });

  it('exports components as named exports', async () => {
    const module = await import('./index');

    // Check that these are valid React components (functions)
    expect(module.CollaborationHeader.name).toBe('CollaborationHeader');
    expect(module.LiveCursors.name).toBe('LiveCursors');
    expect(module.ConflictResolutionDialog.name).toBe(
      'ConflictResolutionDialog'
    );
  });
});
