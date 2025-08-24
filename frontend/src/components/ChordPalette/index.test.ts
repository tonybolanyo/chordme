import { describe, it, expect } from 'vitest';

describe('ChordPalette Component Index', () => {
  it('exports ChordPalette component as default', async () => {
    const module = await import('./index');
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe('function');
  });
});