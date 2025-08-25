import { describe, it, expect } from 'vitest';

describe('ChordProViewer Component Index', () => {
  it('exports ChordProViewer component as default', async () => {
    const module = await import('./index');
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe('function');
  });
});
